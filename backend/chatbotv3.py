import json
import re
from langchain_ollama import OllamaLLM
import os
from pathlib import Path
from datetime import date

BASE_DIR = Path(__file__).parent
modelo_decisao = OllamaLLM(model="llama3", temperature=0.1)
modelo_resposta = OllamaLLM(model="mistral")
DATABASE_URL_FIXA = "postgresql://postgres:12345678@localhost:5432/postgres"

JSON_BLOCK_PATTERN = re.compile(r"\{.*\}", re.DOTALL)

#=====================================================================
#---------------------CARREGA O INDEX DE DADOS------------------------
#=====================================================================

BASE_DIR = Path(__file__).resolve().parent
INDEX_PATH = BASE_DIR / "data" / "index.json"


def carregar_index_base():
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

index_base = carregar_index_base()
treinos_index = index_base.get("treinos", [])


def _obter_conexao_postgres():
    database_url_env = os.getenv("DATABASE_URL")
    database_url = database_url_env if database_url_env else DATABASE_URL_FIXA

    try:
        import psycopg
    except Exception as error:
        raise RuntimeError(f"Driver Postgres indisponível (psycopg): {error}")

    if "USUARIO:SENHA@HOST:5432/NOME_DO_BANCO" in database_url:
        raise RuntimeError(
            "DATABASE_URL não configurada. Edite DATABASE_URL_FIXA em backend/chatbot.py ou defina a variável de ambiente DATABASE_URL."
        )

    try:
        if database_url:
            return psycopg.connect(database_url)

        conn_kwargs: dict[str, str] = {}
        for env_name, conn_key in (
            ("PGHOST", "host"),
            ("PGPORT", "port"),
            ("PGDATABASE", "dbname"),
            ("PGUSER", "user"),
            ("PGPASSWORD", "password"),
        ):
            value = os.getenv(env_name)
            if value:
                conn_kwargs[conn_key] = value

        return psycopg.connect(**conn_kwargs)
    except Exception as error:
        raise RuntimeError(f"Não foi possível conectar ao Postgres: {error}")


def _slugify(texto: str) -> str:
    texto_limpo = re.sub(r"[^a-zA-Z0-9]+", "_", (texto or "nota").strip().lower())
    return texto_limpo.strip("_") or "nota"


def _conteudo_para_texto(conteudo) -> str:
    if conteudo is None:
        return ""
    if isinstance(conteudo, str):
        return conteudo
    if isinstance(conteudo, (dict, list)):
        return json.dumps(conteudo, ensure_ascii=False)
    return str(conteudo)


def _resumir_texto(texto: str, limite: int = 140) -> str:
    conteudo_limpo = " ".join((texto or "").split())
    if len(conteudo_limpo) <= limite:
        return conteudo_limpo
    return conteudo_limpo[: limite - 3] + "..."


def carregar_arquivos_index_db(usuario_id: int) -> list[dict]:
    query = """
        SELECT nome, data_mod, conteudo
        FROM memoria
        WHERE id_user = %s
        ORDER BY nome ASC
    """

    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, (usuario_id,))
            rows = cursor.fetchall()

    arquivos: list[dict] = []
    for nome, data_atualizacao, conteudo in rows:
        nome_nota = nome if isinstance(nome, str) and nome.strip() else "anotacao"
        conteudo_texto = _conteudo_para_texto(conteudo)
        arquivos.append(
            {
                "id": f"nota_{_slugify(nome_nota)}",
                "tipo": "dados_usuario",
                "descricao": f"Anotação do usuário: {nome_nota}",
                "quando_usar": f"Use quando a pergunta exigir dados da anotação '{nome_nota}'.",
                "arquivo": nome_nota,
                "resumo": _resumir_texto(conteudo_texto),
                "data_mod": data_atualizacao.isoformat() if data_atualizacao else "",
            }
        )

    return arquivos


def carregar_index_dinamico(usuario_id: int) -> dict:
    return {
        "arquivos": carregar_arquivos_index_db(usuario_id),
        "treinos": treinos_index,
    }

TREINOS_PERMITIDOS = {t["arquivo"] for t in treinos_index}


#=====================================================================
#---------------------------UTILITÁRIOS-------------------------------
#=====================================================================

def limpar_nome_arquivo(nome):
    return str(nome or "").replace('"', '').replace("'", '').strip()


def _build_arquivo_alias_map(index_dinamico: dict) -> dict[str, str]:
    alias_map: dict[str, str] = {}

    for item in index_dinamico.get("arquivos", []):
        if not isinstance(item, dict):
            continue

        arquivo_nome = limpar_nome_arquivo(item.get("arquivo"))
        arquivo_id = limpar_nome_arquivo(item.get("id"))
        if arquivo_nome:
            alias_map[arquivo_nome] = arquivo_nome
            alias_map[arquivo_nome.lower()] = arquivo_nome
        if arquivo_id and arquivo_nome:
            alias_map[arquivo_id] = arquivo_nome
            alias_map[arquivo_id.lower()] = arquivo_nome

    return alias_map


def extrair_json(resposta):
    """Tenta extrair um bloco JSON válido mesmo se vier com adornos do modelo."""
    if isinstance(resposta, dict):
        return resposta

    texto = (resposta or "").strip()

    if texto.startswith("```"):
        texto = re.sub(r"^```(?:json)?", "", texto, flags=re.IGNORECASE).strip()
        if texto.endswith("```"):
            texto = texto[:-3].strip()

    # 1) tenta parse direto
    try:
        return json.loads(texto)
    except json.JSONDecodeError:
        pass

    # 2) tenta parsear qualquer objeto JSON válido dentro do texto
    decoder = json.JSONDecoder()
    for idx, caractere in enumerate(texto):
        if caractere != "{":
            continue
        try:
            objeto, _ = decoder.raw_decode(texto[idx:])
            if isinstance(objeto, dict):
                return objeto
        except json.JSONDecodeError:
            continue

    # 3) fallback para regex simples, se houver bloco entre chaves
    correspondencia = JSON_BLOCK_PATTERN.search(texto)
    if correspondencia:
        return json.loads(correspondencia.group(0))

    raise json.JSONDecodeError("Nenhum JSON válido encontrado", texto, 0)


#=====================================================================
#-------------------------PROMPT DE DECISÃO---------------------------
#=====================================================================

def acao1(pergunta, index_dinamico: dict):
    arquivos_index = index_dinamico.get("arquivos", [])
    treinos_index_dinamico = index_dinamico.get("treinos", [])

    print(arquivos_index);
    prompt = f"""
Você é um assistente treinador de powerlifting.

SUA TAREFA NÃO É RESPONDER A PERGUNTA.
Sua tarefa é APENAS decidir a ação correta do sistema.

========================
AÇÕES DISPONÍVEIS
========================

1. APENAS_RESPONDER  
Use quando a pergunta puder ser respondida com CONHECIMENTO GERAL.

Exemplos:
- regras do powerlifting
- exercícios de competição
- conceitos básicos de treino
- educação geral sobre força

2. LER_ARQUIVO  
Use SOMENTE quando a pergunta exigir informações ESPECÍFICAS
já registradas sobre o USUÁRIO.

3. FAZER_ANOTACAO  
Use SOMENTE quando o usuário fornecer uma informação nova
objetiva que deva ser salva.

========================
ARQUIVOS DISPONÍVEIS
========================

{arquivos_index}

=======================
TREINOS DISPONÍVEIS
=======================

{treinos_index_dinamico}

========================
REGRAS OBRIGATÓRIAS
========================

- Nunca invente nomes de arquivos
- Use SOMENTE arquivos listados acima
- Se nenhum arquivo for necessário, use APENAS_RESPONDER
- Se houver dúvida, escolha APENAS_RESPONDER
- Responda SOMENTE em JSON válido
- Não escreva explicações
- Não escreva texto fora do JSON
- NÃO responda a pergunta do usuario, apenas decida a ação

========================
FORMATOS PERMITIDOS
========================

{{ "acao": "APENAS_RESPONDER" }}

{{ "acao": "LER_ARQUIVO", "arquivos": ["arquivo.json"] }}

{{ "acao": "FAZER_ANOTACAO", "arquivo": "arquivo.json", "anotacao": "texto curto" }}

IMPORTANTE: Em "arquivos" e "arquivo", prefira usar exatamente o valor do campo "arquivo" dos itens listados.
Se usar o campo "id", o sistema tentará converter automaticamente.

========================
PERGUNTA DO USUÁRIO
========================
{pergunta}
"""

    resp = modelo_decisao.invoke(prompt)
    print("[DECISÃO IA]:", resp)
    return resp


#=====================================================================
#---------------------PROCESSAMENTO DA DECISÃO------------------------
#=====================================================================

def verificar_decisao(resposta, pergunta, index_dinamico: dict, usuario_id: int):
    try:
        dados = extrair_json(resposta)
    except json.JSONDecodeError as err:
        print("ERRO: resposta da IA não é JSON válido")
        print("Conteúdo recebido:", resposta)
        print("Detalhes:", err)
        return resposta_simples(pergunta)

    acao = dados.get("acao")

    # ------------------ VALIDAÇÃO DA AÇÃO ------------------

    if acao not in {"LER_ARQUIVO", "FAZER_ANOTACAO", "APENAS_RESPONDER"}:
        print("ERRO: ação inválida")
        return resposta_simples(pergunta)

    # ------------------ VALIDAÇÃO DE ARQUIVOS ------------------

    if acao == "LER_ARQUIVO":
        arquivos = dados.get("arquivos", [])
        alias_map = _build_arquivo_alias_map(index_dinamico)
        arquivos_validos_lista = set(alias_map.keys()) | TREINOS_PERMITIDOS

        arquivos_validos = []
        for nome in arquivos:
            nome = limpar_nome_arquivo(nome)

            if nome not in arquivos_validos_lista:
                print(f"ERRO: IA tentou usar arquivo não listado: {nome}")
            else:
                if nome in TREINOS_PERMITIDOS:
                    arquivos_validos.append(nome)
                else:
                    arquivos_validos.append(alias_map.get(nome) or alias_map.get(nome.lower(), nome))

        # Fallback automático
        if not arquivos_validos:
            print("Nenhum arquivo válido. Usando APENAS_RESPONDER.")
            return resposta_simples(pergunta)

        return executar_leitura(arquivos_validos, pergunta, usuario_id)

    elif acao == "FAZER_ANOTACAO":
        alias_map = _build_arquivo_alias_map(index_dinamico)
        arquivo_solicitado = limpar_nome_arquivo(dados.get("arquivo"))
        arquivo_resolvido = alias_map.get(arquivo_solicitado) or alias_map.get(arquivo_solicitado.lower()) or arquivo_solicitado

        return executar_escrita(
            arquivo_resolvido,
            dados.get("anotacao", ""),
            pergunta,
            usuario_id,
        )

    else:
        return resposta_simples(pergunta)


#=====================================================================
#-----------------------RESPOSTA SIMPLES-------------------------------
#=====================================================================

def resposta_simples(pergunta):
    prompt = f"""
Você é um assistente treinador de powerlifting.
Responda de forma clara, objetiva e correta.

Pergunta:
{pergunta}
"""
    resp = modelo_resposta.invoke(prompt)
    resposta_final = resp
    return resposta_final


#=====================================================================
#-----------------------LEITURA DE DADOS-------------------------------
#=====================================================================

def executar_leitura(arquivos, pergunta, usuario_id: int):
    conteudos = []

    for nome in arquivos:
        query = """
            SELECT conteudo
            FROM memoria
            WHERE id_user = %s AND nome = %s
            ORDER BY data_mod DESC NULLS LAST
            LIMIT 1
        """

        conteudo_nota = None
        with _obter_conexao_postgres() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (usuario_id, nome))
                row = cursor.fetchone()
                if row:
                    conteudo_nota = row[0]

        if conteudo_nota is None:
            continue

        conteudos.append(f"ARQUIVO: {nome}\n{_conteudo_para_texto(conteudo_nota)}")

    if not conteudos:
        return resposta_simples(pergunta)

    contexto = "\n--------------------\n".join(conteudos)

    prompt = f"""
Você é um assistente treinador de powerlifting.
Utilize o contexto abaixo para responder a pergunta.

CONTEXTO:
--------------------
{contexto}
--------------------

Pergunta:
{pergunta}
"""
    resp = modelo_resposta.invoke(prompt)
    resposta_final = resp
    return resposta_final


#=====================================================================
#-----------------------ESCRITA DE DADOS-------------------------------
#=====================================================================

def _construir_conteudo_anotacao(texto: str, conteudo_existente):
    novo_item = {
        "texto": texto,
        "data": date.today().isoformat(),
    }

    if isinstance(conteudo_existente, dict):
        historico = conteudo_existente.get("historico_anotacoes_ia")
        if not isinstance(historico, list):
            historico = []
        historico.append(novo_item)
        atualizado = dict(conteudo_existente)
        atualizado["historico_anotacoes_ia"] = historico
        atualizado["ultima_anotacao_ia"] = texto
        return atualizado

    if isinstance(conteudo_existente, list):
        atualizado_lista = list(conteudo_existente)
        atualizado_lista.append(novo_item)
        return atualizado_lista

    if conteudo_existente is None:
        return {
            "ultima_anotacao_ia": texto,
            "historico_anotacoes_ia": [novo_item],
        }

    return {
        "conteudo_original": conteudo_existente,
        "ultima_anotacao_ia": texto,
        "historico_anotacoes_ia": [novo_item],
    }


def executar_escrita(arquivo, texto, pergunta, usuario_id: int):
    nome_nota = arquivo if isinstance(arquivo, str) and arquivo.strip() else "anotacao_ia"
    texto_anotacao = str(texto or "").strip()
    if not texto_anotacao:
        return resposta_simples(pergunta)

    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT conteudo
                FROM memoria
                WHERE id_user = %s AND nome = %s
                ORDER BY data_mod DESC NULLS LAST
                LIMIT 1
                """,
                (usuario_id, nome_nota),
            )
            existing = cursor.fetchone()

            conteudo_existente = existing[0] if existing else None
            conteudo_atualizado = _construir_conteudo_anotacao(texto_anotacao, conteudo_existente)
            conteudo_json = json.dumps(conteudo_atualizado, ensure_ascii=False)

            if existing:
                cursor.execute(
                    """
                    UPDATE memoria
                    SET data_mod = CURRENT_DATE, conteudo = %s::jsonb
                    WHERE id_user = %s AND nome = %s
                    """,
                    (conteudo_json, usuario_id, nome_nota),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO memoria (id_user, nome, data_mod, conteudo)
                    VALUES (%s, %s, CURRENT_DATE, %s::jsonb)
                    """,
                    (usuario_id, nome_nota, conteudo_json),
                )
        conn.commit()

    prompt = f"""
Uma anotação foi salva com sucesso.

Arquivo: {arquivo}
Conteúdo:
{texto}

Mensagem do usuário:
{pergunta}
"""
    resp = modelo_resposta.invoke(prompt)
    resposta_final = resp
    return resposta_final


#=====================================================================
#-----------------------------EXECUÇÃO--------------------------------
#=====================================================================

def executar(pergunta):
    return executar_com_usuario(pergunta, usuario_id=1)


def executar_com_usuario(pergunta, usuario_id: int):
    index_dinamico = carregar_index_dinamico(usuario_id)
    decisao = acao1(pergunta, index_dinamico)
    return verificar_decisao(decisao, pergunta, index_dinamico, usuario_id)

executar_com_usuario(input("Faça sua pergunta: "), usuario_id=1)
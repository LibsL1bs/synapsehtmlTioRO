import json
import os
from pathlib import Path

try:
    from langchain_ollama import OllamaLLM
except ModuleNotFoundError as error:
    if error.name == "langchain_ollama":
        raise SystemExit(
            "langchain_ollama não foi encontrado neste interpretador. "
            "Rode com '../.venv/bin/python chatbotv4.py' ou ative a .venv e use 'python chatbotv4.py'."
        ) from error
    raise


def _carregar_env_arquivo() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return

    for linha in env_path.read_text(encoding="utf-8").splitlines():
        texto = linha.strip()
        if not texto or texto.startswith("#") or "=" not in texto:
            continue

        chave, valor = texto.split("=", 1)
        chave = chave.strip()
        valor = valor.strip().strip('"').strip("'")
        if chave:
            os.environ.setdefault(chave, valor)


_carregar_env_arquivo()

modelo_decisao = OllamaLLM(model="llama3", temperature=0.1)
modelo_resposta = OllamaLLM(model="mistral", temperature=0.1)

DATABASE_URL_FIXA = "postgresql://postgres:12345678@localhost:5432/postgres"


# ======================================================================================
# --------- CONEXÃO COM BANCO ---------------------------------------------------------
# ======================================================================================


def _obter_conexao_postgres():
    database_url = os.getenv("DATABASE_URL") or DATABASE_URL_FIXA

    try:
        import psycopg
    except Exception as error:
        raise RuntimeError(f"Driver Postgres indisponível (psycopg): {error}")

    try:
        return psycopg.connect(database_url)
    except Exception as error:
        raise RuntimeError(f"Não foi possível conectar ao Postgres: {error}")


# ======================================================================================
# --------- HELPERS -------------------------------------------------------------------
# ======================================================================================


def _conteudo_para_texto(conteudo) -> str:
    if isinstance(conteudo, str):
        return conteudo
    if conteudo is None:
        return ""
    if isinstance(conteudo, (dict, list)):
        return json.dumps(conteudo, ensure_ascii=False, indent=2)
    return str(conteudo)


def _normalizar_conteudo_json(conteudo) -> dict | list:
    if isinstance(conteudo, (dict, list)):
        return conteudo
    if conteudo is None:
        return {}
    if isinstance(conteudo, str):
        texto = conteudo.strip()
        if not texto:
            return {}
        try:
            parsed = json.loads(texto)
            if isinstance(parsed, (dict, list)):
                return parsed
            return {"valor": parsed}
        except json.JSONDecodeError:
            return {"valor": texto}
    return {"valor": conteudo}


def extract_json(text: str) -> list[object]:
    if not isinstance(text, str) or not text:
        return []

    decoder = json.JSONDecoder()
    results: list[object] = []
    cursor = 0

    while cursor < len(text):
        start_obj = text.find("{", cursor)
        start_arr = text.find("[", cursor)
        candidates = [idx for idx in (start_obj, start_arr) if idx != -1]
        if not candidates:
            break

        start = min(candidates)
        try:
            parsed, end = decoder.raw_decode(text[start:])
            results.append(parsed)
            cursor = start + end
        except json.JSONDecodeError:
            cursor = start + 1

    return results


def _extrair_decisao_json(resposta: str) -> dict:
    if isinstance(resposta, dict):
        return resposta
    blocos = extract_json(resposta)
    for bloco in blocos:
        if isinstance(bloco, dict):
            return bloco
    raise ValueError("Nenhum JSON válido encontrado na resposta da IA.")


# ======================================================================================
# --------- ACESSO AO BANCO (MEMÓRIAS) ------------------------------------------------
# ======================================================================================


def _listar_memorias_usuario(usuario_id: int) -> list[dict]:
    query = """
        SELECT id_memoria, nome, tipo, subtipo, conteudo, data_mod
        FROM memoria
        WHERE id_user = %s
        ORDER BY nome ASC
    """
    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, (usuario_id,))
            rows = cursor.fetchall()

    return [
        {
            "id_memoria": row[0],
            "nome": row[1],
            "tipo": row[2],
            "subtipo": row[3],
            "conteudo": row[4],
            "data_mod": row[5],
        }
        for row in rows
    ]


def _ler_conteudo_memoria(usuario_id: int, nome: str):
    query = """
        SELECT conteudo
        FROM memoria
        WHERE id_user = %s AND nome = %s
        ORDER BY data_mod DESC NULLS LAST
        LIMIT 1
    """
    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, (usuario_id, nome))
            row = cursor.fetchone()
    return row[0] if row else None


def _salvar_conteudo_memoria(usuario_id: int, nome: str, conteudo) -> None:
    conteudo_json = json.dumps(
        _normalizar_conteudo_json(conteudo), ensure_ascii=False
    )
    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT 1 FROM memoria
                WHERE id_user = %s AND nome = %s
                LIMIT 1
                """,
                (usuario_id, nome),
            )
            existe = cursor.fetchone() is not None

            if existe:
                cursor.execute(
                    """
                    UPDATE memoria
                    SET conteudo = %s::jsonb, data_mod = CURRENT_DATE
                    WHERE id_user = %s AND nome = %s
                    """,
                    (conteudo_json, usuario_id, nome),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO memoria (id_user, nome, data_mod, conteudo)
                    VALUES (%s, %s, CURRENT_DATE, %s::jsonb)
                    """,
                    (usuario_id, nome, conteudo_json),
                )
        conn.commit()


def gerar_lista_nomes_descricoes_index(usuario_id: int) -> list[dict[str, str]]:
    memorias = _listar_memorias_usuario(usuario_id)
    return [
        {
            "nome": str(memoria.get("nome") or "").strip(),
            "descricao": str(memoria.get("subtipo") or "").strip(),
        }
        for memoria in memorias
    ]


# ======================================================================================
# --------- FLUXO IA ------------------------------------------------------------------
# ======================================================================================


def decisao(pergunta: str, lista_index: list[dict[str, str]]) -> str:
    prompt = f"""
Você é um classificador de ações para um sistema de treino de powerlifting.

Sua tarefa NÃO é responder à pergunta do usuário.

Sua tarefa é apenas decidir:
- Se é necessário ler arquivos existentes.
- Quais arquivos precisam ser lidos.
- Se há novas informações objetivas que devem ser anotadas.
- Em quais arquivos essas informações devem ser anotadas.

ARQUIVOS DISPONÍVEIS:
{json.dumps(lista_index, ensure_ascii=False, indent=2)}

PERGUNTA DO USUÁRIO:
{pergunta}

Retorne APENAS um JSON válido com este formato:
{{
  "leitura_necessaria": true/false,
  "arquivos_para_leitura": ["nome_do_arquivo"],
  "anotacao_necessaria": true/false,
  "arquivos_para_anotacao": [
    {{ "arquivo": "nome_do_arquivo", "resumo": "texto" }}
  ]
}}
"""
    return _invocar_modelo(prompt)


def executar_anotacao(
    contexto: list[dict], pergunta: str, usuario_id: int
) -> list[str]:
    prompt = f"""
Extraia da mensagem do usuário as atualizações dos arquivos e retorne APENAS JSON válido.
O campo "conteudo" de cada arquivo deve ser SEMPRE um objeto JSON válido (nunca string pura).

MENSAGEM:
{pergunta}

ARQUIVOS (conteúdo atual):
{json.dumps(contexto, ensure_ascii=False, indent=2)}

Formato obrigatório:
{{
  "arquivos": [
    {{
      "nome": "nome_do_arquivo",
      "conteudo": {{ ... }}
    }}
  ]
}}
"""
    resp = _invocar_modelo(prompt)
    blocos = extract_json(resp)
    if not blocos or not isinstance(blocos[0], dict):
        return []

    atualizacoes = blocos[0].get("arquivos", []) or []
    nomes_atualizados: list[str] = []

    for item in atualizacoes:
        nome = str(item.get("nome") or "").strip()
        if not nome:
            continue

        conteudo_novo = _normalizar_conteudo_json(item.get("conteudo"))
        _salvar_conteudo_memoria(usuario_id, nome, conteudo_novo)
        nomes_atualizados.append(nome)

    return nomes_atualizados


def executar_leitura(
    arquivos_para_leitura: list[str], usuario_id: int
) -> list[dict[str, str]]:
    contexto: list[dict[str, str]] = []

    for nome in arquivos_para_leitura:
        nome = str(nome).strip()
        conteudo = _ler_conteudo_memoria(usuario_id, nome)
        if conteudo is None:
            continue
        contexto.append(
            {
                "arquivo": nome,
                "conteudo": _conteudo_para_texto(conteudo),
            }
        )

    return contexto


def gerar_resposta(
    pergunta: str,
    contexto_leitura: list[dict[str, str]],
    anotacoes_realizadas: list[str],
) -> str:
    partes_contexto: list[str] = []

    if contexto_leitura:
        blocos = []
        for item in contexto_leitura:
            blocos.append(f"ARQUIVO: {item['arquivo']}\n{item['conteudo']}")
        partes_contexto.append(
            "DADOS DO USUÁRIO:\n--------------------\n"
            + "\n--------------------\n".join(blocos)
            + "\n--------------------"
        )

    if anotacoes_realizadas:
        partes_contexto.append(
            "ANOTAÇÕES SALVAS COM SUCESSO: "
            + ", ".join(anotacoes_realizadas)
        )

    if partes_contexto:
        contexto_str = "\n\n".join(partes_contexto)
        prompt = f"""
Você é um assistente treinador de powerlifting.
Utilize o contexto abaixo para responder ao usuário de forma clara e objetiva.

{contexto_str}

Pergunta do usuário:
{pergunta}
"""
    else:
        prompt = f"""
Você é um assistente treinador de powerlifting.
Responda de forma clara, objetiva e correta.

Pergunta:
{pergunta}
"""

    return _invocar_modelo(prompt)


def organizar_plano(decisao_dados: str, pergunta: str, usuario_id: int) -> str:
    try:
        decisao_dict = _extrair_decisao_json(decisao_dados)
    except (json.JSONDecodeError, ValueError):
        return gerar_resposta(pergunta, [], [])

    leitura_necessaria = bool(decisao_dict.get("leitura_necessaria"))
    arquivos_para_leitura = decisao_dict.get("arquivos_para_leitura", []) or []
    escrita_necessaria = bool(decisao_dict.get("anotacao_necessaria"))
    arquivos_para_anotacao = decisao_dict.get("arquivos_para_anotacao", []) or []

    memorias = _listar_memorias_usuario(usuario_id)
    nomes_existentes = {str(m.get("nome") or "").strip() for m in memorias}

    anotacoes_realizadas: list[str] = []
    if escrita_necessaria and arquivos_para_anotacao:
        contexto_anotacao = []
        for item in arquivos_para_anotacao:
            nome = str(item.get("arquivo") or "").strip()
            if nome not in nomes_existentes:
                continue
            conteudo_atual = _ler_conteudo_memoria(usuario_id, nome)
            contexto_anotacao.append(
                {
                    "nome": nome,
                    "conteudo": _conteudo_para_texto(conteudo_atual),
                }
            )

        if contexto_anotacao:
            anotacoes_realizadas = executar_anotacao(
                contexto_anotacao, pergunta, usuario_id
            )

    contexto_leitura: list[dict[str, str]] = []
    if leitura_necessaria and arquivos_para_leitura:
        nomes_validos = [
            n for n in arquivos_para_leitura if str(n).strip() in nomes_existentes
        ]
        if nomes_validos:
            contexto_leitura = executar_leitura(nomes_validos, usuario_id)

    return gerar_resposta(pergunta, contexto_leitura, anotacoes_realizadas)


def executar_com_usuario(pergunta: str, usuario_id: int) -> str:
    lista_index = gerar_lista_nomes_descricoes_index(usuario_id)
    decisao_resposta = decisao(pergunta, lista_index)
    return organizar_plano(decisao_resposta, pergunta, usuario_id)


if __name__ == "__main__":
    pergunta = input("Faça sua pergunta: ")
    resposta = executar_com_usuario(pergunta, usuario_id=1)
    print("\n[RESPOSTA]:", resposta)

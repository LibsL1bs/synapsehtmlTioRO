import base64
import datetime as dt
import hashlib
import hmac
import json
import os
import time
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserAdminUpdate(BaseModel):
    nome: str
    email: str
    senha: str | None = None
    ativo: bool
    role: str | int


class UserAdminCreate(BaseModel):
    nome: str
    email: str
    senha: str
    ativo: bool
    role: str | int


class ProfileFileUpdate(BaseModel):
    origem: str
    nome: str
    data: str | None = None
    tipo: str | None = None
    subtipo: str | None = None
    conteudo: object


class Pergunta(BaseModel):
    pergunta: str


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL_FIXA = "postgresql://postgres:12345678@localhost:5432/postgres"
ROLE_ADMIN = 1
ROLE_USER = 2
ROLE_NAME_TO_CODE = {"admin": ROLE_ADMIN, "user": ROLE_USER}
ROLE_CODE_TO_NAME = {ROLE_ADMIN: "admin", ROLE_USER: "user"}
REQUEST_SOURCE_SYSTEM = "system"
REQUEST_SOURCE_ADMIN = "admin"
REQUEST_SOURCE_EXTERNAL = "external"
REQUEST_SOURCES = {REQUEST_SOURCE_SYSTEM, REQUEST_SOURCE_ADMIN, REQUEST_SOURCE_EXTERNAL}
TOKEN_EXPIRES_SECONDS = 60 * 60 * 12
TOKEN_SECRET = os.getenv("AUTH_SECRET_KEY", "dev-secret-change-me")
TOKEN_ALGORITHM = "HS256"


# ---------- auth helpers ----------
def _base64url_encode(payload: bytes) -> str:
    return base64.urlsafe_b64encode(payload).rstrip(b"=").decode("utf-8")


def _base64url_decode(token_chunk: str) -> bytes:
    padding = "=" * ((4 - len(token_chunk) % 4) % 4)
    return base64.urlsafe_b64decode((token_chunk + padding).encode("utf-8"))


def _normalize_role_to_code(role: str | int | None) -> int:
    if isinstance(role, int):
        if role in ROLE_CODE_TO_NAME:
            return role
        raise HTTPException(status_code=400, detail="Role inválida. Use admin(1) ou user(2).")

    if role is None:
        return ROLE_USER

    role_str = str(role).strip().lower()
    if role_str.isdigit():
        role_int = int(role_str)
        if role_int in ROLE_CODE_TO_NAME:
            return role_int
        raise HTTPException(status_code=400, detail="Role inválida. Use admin(1) ou user(2).")

    if role_str in ROLE_NAME_TO_CODE:
        return ROLE_NAME_TO_CODE[role_str]

    raise HTTPException(status_code=400, detail="Role inválida. Use admin(1) ou user(2).")


def _role_code_to_name(role_code: int) -> str:
    return ROLE_CODE_TO_NAME.get(role_code, "user")


def _resolve_request_source(x_request_source: str | None) -> str:
    if not x_request_source:
        return REQUEST_SOURCE_EXTERNAL

    source = x_request_source.strip().lower()
    if source not in REQUEST_SOURCES:
        raise HTTPException(status_code=400, detail="Header X-Request-Source inválido. Use: system, admin ou external.")
    return source


def _parse_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status_code=401, detail="Header Authorization inválido. Use Bearer <token>.")
    return parts[1].strip()


def _issue_access_token(user_id: int, nome: str, email: str, role_code: int) -> str:
    now = int(time.time())
    header = {"alg": TOKEN_ALGORITHM, "typ": "JWT"}
    payload = {
        "sub": user_id,
        "nome": nome,
        "email": email,
        "role": role_code,
        "iat": now,
        "exp": now + TOKEN_EXPIRES_SECONDS,
    }

    header_b64 = _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    message = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(TOKEN_SECRET.encode("utf-8"), message, hashlib.sha256).digest()
    signature_b64 = _base64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def _decode_access_token(token: str) -> dict[str, Any]:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido.")

    message = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_signature = hmac.new(TOKEN_SECRET.encode("utf-8"), message, hashlib.sha256).digest()
    provided_signature = _base64url_decode(signature_b64)
    if not hmac.compare_digest(expected_signature, provided_signature):
        raise HTTPException(status_code=401, detail="Token inválido.")

    try:
        payload = json.loads(_base64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido.")

    exp = payload.get("exp")
    if not isinstance(exp, int) or exp < int(time.time()):
        raise HTTPException(status_code=401, detail="Token expirado.")

    return payload


def _authorize_request(
    authorization: str | None,
    x_request_source: str | None,
    *,
    allow_system_anonymous: bool = False,
    require_admin: bool = False,
) -> dict[str, Any]:
    source = _resolve_request_source(x_request_source)
    token = _parse_bearer_token(authorization)

    if source == REQUEST_SOURCE_SYSTEM and allow_system_anonymous and token is None:
        return {"source": source, "authenticated": False, "user_id": None, "role_code": None}

    if token is None:
        raise HTTPException(status_code=401, detail="Autenticação obrigatória para esta origem de requisição.")

    payload = _decode_access_token(token)
    user_id = payload.get("sub")
    role_code = _normalize_role_to_code(payload.get("role"))

    if not isinstance(user_id, int):
        raise HTTPException(status_code=401, detail="Token inválido.")

    if (require_admin or source == REQUEST_SOURCE_ADMIN) and role_code != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Acesso restrito a usuários admin.")

    return {"source": source, "authenticated": True, "user_id": user_id, "role_code": role_code}


# ---------- db helpers ----------
def _obter_conexao_postgres():
    database_url = os.getenv("DATABASE_URL") or DATABASE_URL_FIXA
    try:
        import psycopg
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"Driver Postgres indisponível (psycopg): {error}")

    try:
        return psycopg.connect(database_url)
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"Não foi possível conectar ao Postgres: {error}")


def _resolver_coluna(colunas: set[str], candidatas: list[str]) -> str | None:
    for candidata in candidatas:
        if candidata in colunas:
            return candidata
    return None


def _resolver_memoria_schema(cursor) -> tuple[str, set[str]]:
    cursor.execute(
        """
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name IN ('memoria', 'memorias', 'notas')
        """
    )
    rows = cursor.fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="Tabela de memória não encontrada.")

    por_tabela: dict[str, set[str]] = {}
    for table_name, column_name in rows:
        nome_tabela = str(table_name).lower()
        por_tabela.setdefault(nome_tabela, set()).add(str(column_name).lower())

    for nome_tabela in ("memoria", "memorias", "notas"):
        colunas = por_tabela.get(nome_tabela)
        if colunas and "conteudo" in colunas:
            return nome_tabela, colunas

    raise HTTPException(status_code=400, detail="Tabela de memória sem coluna 'conteudo'.")


def _normalizar_estado_conteudo(conteudo):
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
        except Exception:
            return {"valor": texto}
    return {"valor": conteudo}


def _conteudo_para_texto(conteudo) -> str:
    if isinstance(conteudo, str):
        return conteudo
    if conteudo is None:
        return ""
    if isinstance(conteudo, (dict, list)):
        return json.dumps(conteudo, ensure_ascii=False, indent=2)
    return str(conteudo)


def _parse_data_memoria_iso(data_valor: str) -> dt.datetime | None:
    if not isinstance(data_valor, str) or not data_valor.strip():
        return None
    texto = data_valor.strip().replace("Z", "+00:00")
    try:
        parsed = dt.datetime.fromisoformat(texto)
    except Exception:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def _carregar_memorias(
    usuario_id: int | None = None,
    tipos: set[str] | None = None,
    excluir_tipos: set[str] | None = None,
    limite: int | None = None,
) -> list[dict[str, Any]]:
    usuario_id_consulta = usuario_id if isinstance(usuario_id, int) else 1
    limite_consulta = max(1, min(int(limite), 100)) if isinstance(limite, int) else None

    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            tabela_memoria, colunas = _resolver_memoria_schema(cursor)

            coluna_nome = _resolver_coluna(colunas, ["nome", "arquivo", "titulo"])
            coluna_data = _resolver_coluna(colunas, ["data", "data_atualizacao", "created_at", "updated_at"])
            coluna_usuario = _resolver_coluna(colunas, ["usuario", "id_usuario", "user_id"])
            coluna_tipo = _resolver_coluna(colunas, ["tipo"])
            coluna_subtipo = _resolver_coluna(colunas, ["subtipo", "sub_tipo"])
            coluna_conteudo = "conteudo"

            select_nome = coluna_nome if coluna_nome else "NULL"
            select_data = coluna_data if coluna_data else "NULL"
            select_usuario = coluna_usuario if coluna_usuario else "NULL"
            select_tipo = coluna_tipo if coluna_tipo else "NULL"
            select_subtipo = coluna_subtipo if coluna_subtipo else "NULL"

            filtros: list[str] = []
            parametros: list[Any] = []

            if coluna_usuario:
                filtros.append(f"{coluna_usuario} = %s")
                parametros.append(usuario_id_consulta)

            if coluna_tipo and tipos:
                filtros.append(f"LOWER(COALESCE({coluna_tipo}::text, '')) = ANY(%s)")
                parametros.append([tipo.lower() for tipo in tipos])

            if coluna_tipo and excluir_tipos:
                filtros.append(f"NOT (LOWER(COALESCE({coluna_tipo}::text, '')) = ANY(%s))")
                parametros.append([tipo.lower() for tipo in excluir_tipos])

            where_clause = f"WHERE {' AND '.join(filtros)}" if filtros else ""
            order_clause = f"ORDER BY {coluna_data} DESC" if coluna_data else ""
            limit_clause = "LIMIT %s" if limite_consulta is not None else ""

            query = f"""
                SELECT {select_nome} AS nome,
                       {select_data} AS data_mod,
                       {select_usuario} AS usuario,
                       {select_tipo} AS tipo,
                       {select_subtipo} AS subtipo,
                       {coluna_conteudo} AS conteudo
                FROM {tabela_memoria}
                {where_clause}
                {order_clause}
                {limit_clause}
            """

            if limite_consulta is not None:
                parametros.append(limite_consulta)

            cursor.execute(query, tuple(parametros))
            rows = cursor.fetchall()

    resultado: list[dict[str, Any]] = []
    for indice, (nome, data_mod, usuario, tipo, subtipo, conteudo) in enumerate(rows, start=1):
        nome_valor = nome if isinstance(nome, str) and nome.strip() else f"anotacao_{indice}"
        resultado.append(
            {
                "nome": nome_valor,
                "tipo": str(tipo).strip().lower() if tipo is not None else "",
                "subtipo": str(subtipo).strip().lower() if subtipo is not None else "",
                "data_atualizacao": data_mod.isoformat() if data_mod else "",
                "usuario": usuario if isinstance(usuario, int) else usuario_id_consulta,
                "conteudo": _normalizar_estado_conteudo(conteudo),
            }
        )

    return resultado


def _carregar_notas(usuario_id: int | None = None) -> list[dict[str, Any]]:
    return _carregar_memorias(usuario_id, excluir_tipos={"estado"})


def _carregar_estado(usuario_id: int | None = None) -> dict[str, Any] | None:
    estados = _carregar_memorias(usuario_id, tipos={"estado"}, limite=1)
    if not estados:
        return None
    estado = estados[0]
    return {
        "data": estado.get("data_atualizacao") or "",
        "usuario": estado.get("usuario") or (usuario_id if isinstance(usuario_id, int) else 1),
        "conteudo": _normalizar_estado_conteudo(estado.get("conteudo")),
    }


def _carregar_estados(usuario_id: int | None = None, limite: int | None = 3) -> list[dict[str, Any]]:
    estados = _carregar_memorias(usuario_id, tipos={"estado"}, limite=limite)
    usuario_padrao = usuario_id if isinstance(usuario_id, int) else 1
    return [
        {
            "data": item.get("data_atualizacao") or "",
            "usuario": item.get("usuario") or usuario_padrao,
            "conteudo": _normalizar_estado_conteudo(item.get("conteudo")),
        }
        for item in estados
    ]


def _build_tree_from_memorias(memorias: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tree = [
        {
            "name": "perfil",
            "type": "folder",
            "children": [
                {"name": "anatomico", "type": "folder", "children": []},
                {"name": "fisiologico", "type": "folder", "children": []},
                {"name": "psicologico", "type": "folder", "children": []},
            ],
        },
        {"name": "estado", "type": "folder", "children": []},
        {
            "name": "dados",
            "type": "folder",
            "children": [
                {"name": "treinos", "type": "folder", "children": []},
                {"name": "notas", "type": "folder", "children": []},
            ],
        },
        {
            "name": "interpretado",
            "type": "folder",
            "children": [
                {"name": "hipoteses", "type": "folder", "children": []},
                {"name": "notas", "type": "folder", "children": []},
            ],
        },
    ]

    def folder_children(pasta: str, subpasta: str | None = None) -> list[dict[str, Any]]:
        for folder in tree:
            if folder.get("name") != pasta:
                continue
            if subpasta is None:
                return folder["children"]
            for child in folder["children"]:
                if child.get("name") == subpasta:
                    return child["children"]
        return []

    for indice, memoria in enumerate(memorias, start=1):
        nome = memoria.get("nome") or f"memoria_{indice}"
        nome_arquivo = str(nome).strip() or f"memoria_{indice}"
        tipo = str(memoria.get("tipo") or "").strip().lower()
        subtipo = str(memoria.get("subtipo") or "").strip().lower()
        conteudo = memoria.get("conteudo")

        file_node = {
            "name": nome_arquivo,
            "type": "file",
            "content": {
                "nome": nome_arquivo,
                "tipo": tipo,
                "subtipo": subtipo,
                "data": memoria.get("data_atualizacao") or "",
                "conteudo": _conteudo_para_texto(conteudo),
                "conteudo_raw": _normalizar_estado_conteudo(conteudo),
                "origem": "estado" if tipo == "estado" else "nota",
            },
        }

        if tipo == "perfil":
            if subtipo == "anatomico":
                destino = folder_children("perfil", "anatomico")
            elif subtipo == "fisiologico":
                destino = folder_children("perfil", "fisiologico")
            else:
                destino = folder_children("perfil", "psicologico")
        elif tipo == "estado":
            destino = folder_children("estado")
        elif tipo == "bruta" and subtipo == "treino":
            destino = folder_children("dados", "treinos")
        elif tipo == "interpretada" and subtipo == "hipotese":
            destino = folder_children("interpretado", "hipoteses")
        elif tipo == "interpretada":
            destino = folder_children("interpretado", "notas")
        else:
            destino = folder_children("dados", "notas")

        destino.append(file_node)

    for folder in tree:
        for child in folder.get("children", []):
            if child.get("type") == "folder":
                child["children"].sort(key=lambda item: str(item.get("name", "")).lower())
        if folder["name"] == "estado":
            folder["children"].sort(key=lambda item: str(item.get("name", "")).lower())

    return tree


def _build_empty_tree() -> list[dict[str, Any]]:
    return _build_tree_from_memorias([])


def _garantir_colunas_users():
    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id_user SERIAL PRIMARY KEY,
                    nome VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    senha TEXT NOT NULL,
                    role VARCHAR(20) NOT NULL DEFAULT 'user',
                    ativo BOOLEAN NOT NULL DEFAULT TRUE
                )
                """
            )
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'")
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE")
        conn.commit()


def _serializar_usuario(row: tuple[Any, ...]) -> dict[str, Any]:
    role_code = _normalize_role_to_code(row[3])
    return {
        "id_user": row[0],
        "nome": row[1],
        "email": row[2],
        "role": _role_code_to_name(role_code),
        "role_id": role_code,
        "ativo": bool(row[4]),
    }


def _atualizar_memoria_usuario(
    usuario_id: int,
    nome: str,
    data_referencia: str | None,
    novo_conteudo,
    *,
    tipo_incluir: set[str] | None = None,
    tipo_excluir: set[str] | None = None,
    subtipo: str | None = None,
):
    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            tabela_memoria, colunas = _resolver_memoria_schema(cursor)

            coluna_nome = _resolver_coluna(colunas, ["nome", "arquivo", "titulo"])
            coluna_data = _resolver_coluna(colunas, ["data", "data_atualizacao", "created_at", "updated_at"])
            coluna_usuario = _resolver_coluna(colunas, ["usuario", "id_usuario", "user_id"])
            coluna_tipo = _resolver_coluna(colunas, ["tipo"])
            coluna_subtipo = _resolver_coluna(colunas, ["subtipo", "sub_tipo"])

            filtros: list[str] = []
            parametros: list[Any] = []

            if coluna_usuario:
                filtros.append(f"{coluna_usuario} = %s")
                parametros.append(usuario_id)
            if coluna_nome:
                filtros.append(f"{coluna_nome} = %s")
                parametros.append(nome)
            if data_referencia and coluna_data:
                filtros.append(f"{coluna_data} = %s::timestamp")
                parametros.append(data_referencia)
            if coluna_tipo and tipo_incluir:
                filtros.append(f"LOWER(COALESCE({coluna_tipo}::text, '')) = ANY(%s)")
                parametros.append([item.lower() for item in tipo_incluir])
            if coluna_tipo and tipo_excluir:
                filtros.append(f"NOT (LOWER(COALESCE({coluna_tipo}::text, '')) = ANY(%s))")
                parametros.append([item.lower() for item in tipo_excluir])
            if coluna_subtipo and subtipo:
                filtros.append(f"LOWER(COALESCE({coluna_subtipo}::text, '')) = %s")
                parametros.append(subtipo.lower())

            where_clause = f"WHERE {' AND '.join(filtros)}" if filtros else ""
            order_clause = f"ORDER BY {coluna_data} DESC" if coluna_data else ""

            cursor.execute(
                f"""
                SELECT ctid
                FROM {tabela_memoria}
                {where_clause}
                {order_clause}
                LIMIT 1
                """,
                tuple(parametros),
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Arquivo de memória não encontrado.")

            row_ctid = row[0]
            cursor.execute(
                f"""
                UPDATE {tabela_memoria}
                SET conteudo = %s::jsonb
                WHERE ctid = %s
                """,
                (json.dumps(_normalizar_estado_conteudo(novo_conteudo), ensure_ascii=False), row_ctid),
            )

        conn.commit()


# ---------- routes ----------
@app.get("/")
def status():
    return {"status": "ok"}


@app.post("/auth/register")
def register(user: UserRegister):
    _garantir_colunas_users()
    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_user FROM users WHERE email = %s", (user.email,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email já cadastrado.")
            cursor.execute(
                """
                INSERT INTO users (nome, email, senha, role, ativo)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id_user, nome, email, role, ativo
                """,
                (user.name, user.email, user.password, "user", True),
            )
            created = cursor.fetchone()
        conn.commit()
    return _serializar_usuario(created)


@app.post("/auth/login")
def login(user: UserLogin):
    _garantir_colunas_users()
    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_user, nome, email, senha, role, ativo FROM users WHERE email = %s", (user.email,))
            row = cursor.fetchone()
            if not row or row[3] != user.password:
                raise HTTPException(status_code=401, detail="Credenciais inválidas.")
            if not bool(row[5]):
                raise HTTPException(status_code=403, detail="Usuário inativo.")
            user_id, nome, email, _, role_db, _ = row

    role_code = _normalize_role_to_code(role_db)
    access_token = _issue_access_token(user_id, nome, email, role_code)
    return {
        "id_user": user_id,
        "email": email,
        "nome": nome,
        "role": _role_code_to_name(role_code),
        "role_id": role_code,
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": TOKEN_EXPIRES_SECONDS,
    }


@app.post("/chat")
def chat(
    dados: Pergunta,
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_source: str | None = Header(default=None, alias="X-Request-Source"),
):
    auth_context = _authorize_request(authorization, x_request_source)
    try:
        from backend.chatbotv4 import executar_com_usuario
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"Serviço de chat indisponível: {error}")

    resposta = executar_com_usuario(dados.pergunta, usuario_id=auth_context["user_id"])
    return {"resposta": resposta}


@app.get("/profile/tree")
def profile_tree(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_source: str | None = Header(default=None, alias="X-Request-Source"),
):
    auth_context = _authorize_request(authorization, x_request_source)
    try:
        memorias = _carregar_memorias(auth_context["user_id"])
        return {"tree": _build_tree_from_memorias(memorias)}
    except HTTPException as error:
        if error.status_code == 503:
            return {"tree": _build_empty_tree(), "warning": "Banco indisponível no momento."}
        raise


@app.get("/notes")
def get_notes(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_source: str | None = Header(default=None, alias="X-Request-Source"),
):
    auth_context = _authorize_request(authorization, x_request_source)
    return {"notas": _carregar_notas(auth_context["user_id"])}


@app.get("/estado")
def get_estado(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_source: str | None = Header(default=None, alias="X-Request-Source"),
    incluir_historico: bool = False,
    limite_historico: int = 3,
):
    auth_context = _authorize_request(
        authorization,
        x_request_source,
        allow_system_anonymous=True,
    )

    try:
        estado = _carregar_estado(auth_context["user_id"])
        if incluir_historico:
            estados = _carregar_estados(auth_context["user_id"], limite_historico)
            return {"estado": estado, "estados": estados}
        return {"estado": estado}
    except HTTPException as error:
        if error.status_code == 503:
            return {"estado": None, "warning": "Banco indisponível no momento."}
        raise


@app.post("/profile/file/update")
def update_profile_file(
    payload: ProfileFileUpdate,
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_source: str | None = Header(default=None, alias="X-Request-Source"),
):
    auth_context = _authorize_request(authorization, x_request_source)
    usuario_id = auth_context["user_id"]

    origem = (payload.origem or "").strip().lower()
    if origem == "nota":
        _atualizar_memoria_usuario(
            usuario_id,
            payload.nome,
            payload.data,
            payload.conteudo,
            tipo_excluir={"estado"},
            subtipo=payload.subtipo,
        )
    elif origem == "estado":
        _atualizar_memoria_usuario(
            usuario_id,
            payload.nome,
            payload.data,
            payload.conteudo,
            tipo_incluir={"estado"},
        )
    else:
        raise HTTPException(status_code=400, detail="Origem inválida. Use 'nota' ou 'estado'.")

    return {"updated": True}


@app.get("/users")
def list_users(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_source: str | None = Header(default=None, alias="X-Request-Source"),
):
    _authorize_request(authorization, x_request_source, require_admin=True)
    _garantir_colunas_users()
    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_user, nome, email, role, ativo FROM users ORDER BY id_user ASC")
            rows = cursor.fetchall()
    return {"users": [_serializar_usuario(row) for row in rows]}


@app.get("/users/{user_id}")
def get_user(
    user_id: int,
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_source: str | None = Header(default=None, alias="X-Request-Source"),
):
    auth_context = _authorize_request(authorization, x_request_source)

    requester_role = auth_context["role_code"]
    requester_id = auth_context["user_id"]
    if requester_role != ROLE_ADMIN and requester_id != user_id:
        raise HTTPException(status_code=403, detail="Acesso negado para consultar outro usuário.")

    _garantir_colunas_users()
    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_user, nome, email, role, ativo FROM users WHERE id_user = %s", (user_id,))
            row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    return {"user": _serializar_usuario(row)}


@app.put("/users/{user_id}")
def update_user(
    user_id: int,
    user: UserAdminUpdate,
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_source: str | None = Header(default=None, alias="X-Request-Source"),
):
    auth_context = _authorize_request(authorization, x_request_source)
    _garantir_colunas_users()

    requested_role_code = _normalize_role_to_code(user.role)
    requested_role_name = _role_code_to_name(requested_role_code)

    is_admin_requester = auth_context["role_code"] == ROLE_ADMIN
    if not is_admin_requester and auth_context["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Você só pode atualizar o próprio perfil.")

    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_user, role, ativo FROM users WHERE id_user = %s", (user_id,))
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Usuário não encontrado.")

            existing_role_name = str(existing[1]).strip().lower() if existing[1] is not None else "user"
            existing_ativo = bool(existing[2])

            final_role = requested_role_name if is_admin_requester else existing_role_name
            final_ativo = bool(user.ativo) if is_admin_requester else existing_ativo

            if user.senha and user.senha.strip():
                cursor.execute(
                    """
                    UPDATE users
                    SET nome = %s, email = %s, senha = %s, ativo = %s, role = %s
                    WHERE id_user = %s
                    RETURNING id_user, nome, email, role, ativo
                    """,
                    (user.nome, user.email, user.senha, final_ativo, final_role, user_id),
                )
            else:
                cursor.execute(
                    """
                    UPDATE users
                    SET nome = %s, email = %s, ativo = %s, role = %s
                    WHERE id_user = %s
                    RETURNING id_user, nome, email, role, ativo
                    """,
                    (user.nome, user.email, final_ativo, final_role, user_id),
                )
            updated = cursor.fetchone()
        conn.commit()

    return {"user": _serializar_usuario(updated)}


@app.post("/users")
def create_user(
    user: UserAdminCreate,
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_source: str | None = Header(default=None, alias="X-Request-Source"),
):
    _authorize_request(authorization, x_request_source, require_admin=True)
    _garantir_colunas_users()

    role_code = _normalize_role_to_code(user.role)
    role = _role_code_to_name(role_code)

    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_user FROM users WHERE email = %s", (user.email,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email já cadastrado.")

            cursor.execute(
                """
                INSERT INTO users (nome, email, senha, ativo, role)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id_user, nome, email, role, ativo
                """,
                (user.nome, user.email, user.senha, user.ativo, role),
            )
            created = cursor.fetchone()
        conn.commit()

    return {"user": _serializar_usuario(created)}


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_source: str | None = Header(default=None, alias="X-Request-Source"),
):
    _authorize_request(authorization, x_request_source, require_admin=True)
    with _obter_conexao_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE id_user = %s RETURNING id_user", (user_id,))
            deleted = cursor.fetchone()
            if not deleted:
                raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        conn.commit()
    return {"deleted": True, "id_user": deleted[0]}

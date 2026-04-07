import express from "express";
import bcrypt from "bcrypt";
import sql from "./database.js";
import { issueAccessSession } from "./authSession.js";
import requireAdminAuth from "./middlewares/requireAdminAuth.js";
import requireAuth from "./middlewares/requireAuth.js";
import { carregarDashboardEstado } from "./middlewares/load_state.js";
import { edit_memory } from "./middlewares/memory_tree.js";
import { executar_com_usuario } from "./chatbotv4.js";

const routes = express.Router();
const BCRYPT_ROUNDS = 10;

const isPasswordHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

const hashPassword = async (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const comparePassword = async (password, storedPassword) => {
  if (typeof storedPassword !== "string" || !storedPassword) return false;

  if (isPasswordHash(storedPassword)) {
    return bcrypt.compare(password, storedPassword);
  }

  return password === storedPassword;
};

//===================================================================================================
//------------------------------------ USUARIOS - ADMIN ---------------------------------------------
//===================================================================================================

routes.get("/users", requireAdminAuth, async (req, res) => {
  try {
    const rows = await sql`SELECT id_user, nome, email, role_user, ativo FROM users ORDER BY id_user ASC`;
    return res.status(200).json({
      users: rows.map((row) => ({
        id_user: Number(row.id_user),
        nome: row.nome,
        email: row.email,
        role_user: row.role_user === 1 || row.role_user === "1" || row.role_user === "admin" ? 1 : 0,
        role_id: row.role_user === 1 || row.role_user === "1" || row.role_user === "admin" ? 1 : 0,
        ativo: Boolean(row.ativo),
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//---------------------------------------------------------------------------------------------------

routes.get("/users/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await sql`SELECT id_user, nome, email, role_user, ativo FROM users WHERE id_user = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    const user = rows[0];
    const roleId = user.role_user === 1 || user.role_user === "1" || user.role_user === "admin" ? 1 : 0;
    return res.status(200).json({ user: {
      id_user: Number(user.id_user),
      nome: user.nome,
      email: user.email,
      role_user: roleId,
      role_id: roleId,
      ativo: Boolean(user.ativo),
    }});
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//---------------------------------------------------------------------------------------------------

routes.post("/users", requireAdminAuth, async (req, res) => {
  try {
    const nome = String(req.body?.nome ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const senha = String(req.body?.senha ?? "").trim();
    const roleUser = Number(req.body?.role_user) === 1 ? 1 : 0;
    const ativo = req.body?.ativo !== undefined ? Boolean(req.body.ativo) : true;

    if (!nome || !email || !senha) return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });

    const exists = await sql`SELECT id_user FROM users WHERE email = ${email}`;
    if (exists.length > 0) return res.status(400).json({ error: "Email já cadastrado." });

    const senhaHash = await hashPassword(senha);

    const rows = await sql`
      INSERT INTO users (nome, senha, email, role_user, ativo)
      VALUES (${nome}, ${senhaHash}, ${email}, ${roleUser}, ${ativo})
      RETURNING id_user, nome, email, role_user, ativo
    `;
    const user = rows[0];
    const roleId = user.role_user === 1 || user.role_user === "1" || user.role_user === "admin" ? 1 : 0;
    return res.status(201).json({ user: {
      id_user: Number(user.id_user),
      nome: user.nome,
      email: user.email,
      role_user: roleId,
      role_id: roleId,
      ativo: Boolean(user.ativo),
    }});
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//---------------------------------------------------------------------------------------------------

routes.put("/users/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const nome = String(req.body?.nome ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const senha = String(req.body?.senha ?? "").trim();
    const roleUser = Number(req.body?.role_user) === 1 ? 1 : 0;
    const ativo = req.body?.ativo !== undefined ? Boolean(req.body.ativo) : true;

    if (!nome || !email) return res.status(400).json({ error: "Nome e email são obrigatórios." });

    let rows;
    if (senha) {
      const senhaHash = await hashPassword(senha);

      rows = await sql`
        UPDATE users SET nome = ${nome}, senha = ${senhaHash}, email = ${email}, role_user = ${roleUser}, ativo = ${ativo}
        WHERE id_user = ${id}
        RETURNING id_user, nome, email, role_user, ativo
      `;
    } else {
      rows = await sql`
        UPDATE users SET nome = ${nome}, email = ${email}, role_user = ${roleUser}, ativo = ${ativo}
        WHERE id_user = ${id}
        RETURNING id_user, nome, email, role_user, ativo
      `;
    }
    if (!rows[0]) return res.status(404).json({ error: "Usuário não encontrado" });
    const user = rows[0];
    const roleId = user.role_user === 1 || user.role_user === "1" || user.role_user === "admin" ? 1 : 0;
    return res.status(200).json({ user: {
      id_user: Number(user.id_user),
      nome: user.nome,
      email: user.email,
      role_user: roleId,
      role_id: roleId,
      ativo: Boolean(user.ativo),
    }});
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//---------------------------------------------------------------------------------------------------

routes.delete("/users/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await sql`DELETE FROM users WHERE id_user = ${id} RETURNING id_user`;

    if (rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    return res.status(200).json({ deleted: true, id_user: Number(rows[0].id_user) });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});



//===================================================================================================
//------------------------------------ USUARIOS - PUBLIC -------------------------------------------
//===================================================================================================

routes.post("/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "").trim();

    if (!email || !password) {
      console.warn(`campos obrigatórios ausentes`);
      return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const rows = await sql`
      SELECT id_user, nome, email, senha, role_user, ativo
      FROM users
      WHERE LOWER(TRIM(email)) = ${email}
      ORDER BY id_user DESC
      LIMIT 1
    `;

    const user = rows[0];
    const passwordMatches = user ? await comparePassword(password, user.senha) : false;

    if (!user || !passwordMatches) {
      console.warn(`[AUTH][LOGIN][401] credenciais inválidas found=${rows.length}`);
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    if (!isPasswordHash(user.senha)) {
      const senhaHash = await hashPassword(password);
      await sql`
        UPDATE users
        SET senha = ${senhaHash}
        WHERE id_user = ${user.id_user}
      `;
    }

    if (!user.ativo) {
      console.warn(`[AUTH][LOGIN][403] usuário inativo id_user=${Number(user.id_user)}`);
      return res.status(403).json({ error: "Usuário inativo." });
    }

    const roleId = user.role_user === 1 || user.role_user === "1" || user.role_user === "admin" ? 1 : 0;
    const serializedUser = {
      id_user: Number(user.id_user),
      nome: user.nome,
      email: user.email,
      role_user: roleId,
      role_id: roleId,
      ativo: Boolean(user.ativo),
    };
    const session = issueAccessSession(serializedUser);
    return res.status(200).json({
      ...serializedUser,
      access_token: session.accessToken,
      token_type: "bearer",
      expires_in: session.expiresIn,
    });
  } catch (error) {
    console.error("[AUTH][LOGIN][500] erro interno:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//---------------------------------------------------------------------------------------------------

routes.post("/auth/register", async (req, res) => {
  try {
    const nome = String(req.body?.nome ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const senha = String(req.body?.senha ?? "").trim();

    if (!nome || !email || !senha) {
      console.warn("[AUTH][REGISTER][400] campos obrigatórios ausentes");
      return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
    }

    const exists = await sql`SELECT id_user FROM users WHERE LOWER(TRIM(email)) = ${email}`;
    if (exists.length > 0) {
      console.warn("[AUTH][REGISTER][400] email já cadastrado");
      return res.status(400).json({ error: "Email já cadastrado." });
    }

    const senhaHash = await hashPassword(senha);

    const rows = await sql`
      INSERT INTO users (nome, senha, email, role_user, ativo)
      VALUES (${nome}, ${senhaHash}, ${email}, ${0}, ${true})
      RETURNING id_user, nome, email, role_user, ativo
    `;
    const created = rows[0];
    const roleId = created.role_user === 1 || created.role_user === "1" || created.role_user === "admin" ? 1 : 0;
    console.info(`[AUTH][REGISTER][201] usuário criado id_user=${Number(created.id_user)}`);
    return res.status(201).json({
      id_user: Number(created.id_user),
      nome: created.nome,
      email: created.email,
      role_user: roleId,
      role_id: roleId,
      ativo: Boolean(created.ativo),
    });
  } catch (error) {
    console.error("[AUTH][REGISTER][500] erro interno:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});




//===================================================================================================
//------------------------------------ MEMORIA - ADMIN ----------------------------------------------
//===================================================================================================

routes.get("/memoria/:id", requireAdminAuth, async (req, res) => {
  try {
    const id_usuario = Number(req.params.id);
    const rows = await sql`
      SELECT id_memoria, nome, tipo, subtipo, conteudo, id_user
      FROM memoria
      WHERE id_user = ${id_usuario}
      ORDER BY nome ASC
    `;
    return res.status(200).json({ memoria: rows.map(row => ({
      id_memoria: Number(row.id_memoria),
      nome: row.nome,
      tipo: row.tipo,
      subtipo: row.subtipo,
      conteudo: row.conteudo,
      id_user: Number(row.id_user),
    })) });
  }
  catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//---------------------------------------------------------------------------------------------------

routes.get("/dashboard/state", requireAuth, async (req, res) => {
  try {
    const idUsuario = Number(req.authUser?.id_user);
    if (!idUsuario) return res.status(401).json({ error: "Usuário inválido na sessão." });

    const rows = await sql`
      SELECT conteudo, data_mod
      FROM memoria
      WHERE id_user = ${idUsuario}
        AND tipo = 'estado'
      ORDER BY data_mod DESC NULLS LAST, id_memoria DESC
      LIMIT 3
    `;

    const payload = carregarDashboardEstado(rows);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//---------------------------------------------------------------------------------------------------

routes.post("/memoria/edit", requireAdminAuth, async (req, res) => {
  try {
    const { id_memoria, id_user, conteudo } = await edit_memory(req.body || {});

    const rows = await sql`
      UPDATE memoria
      SET conteudo = ${conteudo}
      WHERE id_memoria = ${id_memoria}
        AND id_user = ${id_user}
      RETURNING id_memoria, id_user
    `;

    if (!rows[0]) {
      return res.status(404).json({ error: "Memória não encontrada para atualização." });
    }

    return res.status(200).json({
      updated: true,
      id_memoria: Number(rows[0].id_memoria),
      id_user: Number(rows[0].id_user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    if (message.includes("obrigatórios") || message.includes("conteudo")) {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//===================================================================================================
//------------------------------- MEMORIA - TREINOS - ADMIN -----------------------------------------
//===================================================================================================

routes.get("/treinos", requireAdminAuth, async (req, res) => {
  try {
    
    const rows = await sql`
      SELECT conteudo, data_mod
      FROM memoria
      WHERE id_user = ${idUsuario}
        AND tipo = 'bruta'
      ORDER BY data_mod DESC NULLS LAST, id_memoria DESC
    `;
    return res.status(200).json({ treinos: rows.map(row => ({
      conteudo: row.conteudo,
      data_mod: row.data_mod,
    })) });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//---------------------------------------------------------------------------------------------------

routes.post("/treinos", requireAdminAuth, async (req, res) => {
  try {
    const { conteudo } = req.body || {};
    if(!conteudo) return res.status(400).json({ error: "Campo 'conteudo' é obrigatório." });
    const idUsuario = Number(req.authUser?.id_user);
    if (!idUsuario) return res.status(401).json({ error: "Usuário inválido na sessão." });

    const rows = await sql`
      INSERT INTO memoria (id_user, tipo, subtipo, nome, conteudo)
      VALUES (${idUsuario}, 'bruta', 'treino', ${Date.now()}, ${conteudo.trim()})
      RETURNING id_memoria, data_mod
    `;

    if (!rows[0]) {
      return res.status(500).json({ error: "Falha ao salvar o treino." });
    }
    return res.status(201).json({ id_memoria: Number(rows[0].id_memoria), data_mod: rows[0].data_mod });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//---------------------------------------------------------------------------------------------------

routes.delete("/treinos/:id_memoria", requireAdminAuth, async (req, res) => {
  try {
    const { id_memoria } = req.params;
    const idUsuario = Number(req.authUser?.id_user);
    if (!idUsuario) return res.status(401).json({ error: "Usuário inválido na sessão." });

    const rows = await sql`
      DELETE FROM memoria
      WHERE id_memoria = ${id_memoria}
        AND id_user = ${idUsuario}
        AND tipo = 'bruta'
        AND subtipo = 'treino'
      RETURNING id_memoria
    `;

    if (rows.length === 0) {
      return res.status(404).json({ error: "Treino não encontrado para exclusão." });
    }
    return res.status(200).json({ deleted: true, id_memoria: Number(rows[0].id_memoria) });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//---------------------------------------------------------------------------------------------------

routes.put("/treinos/:id_memoria", requireAdminAuth, async (req, res) => {
  try {
    const { id_memoria } = req.params;
    const { conteudo } = req.body || {};
    if(!conteudo) return res.status(400).json({ error: "Campo 'conteudo' é obrigatório." });
    const idUsuario = Number(req.authUser?.id_user);
    if (!idUsuario) return res.status(401).json({ error: "Usuário inválido na sessão." });

    const rows = await sql`
      UPDATE memoria
      SET conteudo = ${conteudo.trim()}, data_mod = NOW()
      WHERE id_memoria = ${id_memoria}
        AND id_user = ${idUsuario}
        AND tipo = 'bruta'
        AND subtipo = 'treino'
      RETURNING id_memoria, data_mod
     `;

    if (!rows[0]) {
      return res.status(404).json({ error: "Treino não encontrado para atualização." });
    }
    return res.status (200).json({ updated: true, id_memoria: Number(rows[0].id_memoria), data_mod: rows[0].data_mod });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});


//===================================================================================================
//------------------------------------ CHAT ----------------------------------------------
//===================================================================================================


routes.post("/chat", async (req, res) => {
  try {
    const { pergunta } = req.body || {};
    if (typeof pergunta !== "string" || !pergunta.trim()) {
      return res.status(400).json({ error: "Campo 'pergunta' é obrigatório e deve ser uma string não vazia." });
    }

    const idUsuarioHeader = req.header("X-User-Id") || req.header("x-user-id");
    const usuarioId = Number(idUsuarioHeader);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({ error: "Header 'X-User-Id' é obrigatório e deve ser um inteiro válido." });
    }

    const resposta = await executar_com_usuario(pergunta.trim(), usuarioId);
    return res.status(200).json({ resposta });
  } catch (error) {
    console.error("Erro no endpoint /chat:", error);
    return res.status(500).json({
      error: error?.message || "Erro interno do servidor",
    });
  }
});








export default routes;

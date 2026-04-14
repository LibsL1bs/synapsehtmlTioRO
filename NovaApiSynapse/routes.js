import express from "express";
import cors from "cors";
import sql from "";
import { CompararHash, CriarHash } from './utils.js';

const app = express();
app.use(cors());
app.use(express.json());

//Area Usuario
app.post('/cadastro/user', async (req, res) => {
  const { nome, email, senha } = req.body;

  const hash = await CriarHash(senha, 10)

  await sql`insert into usuarios(nome, email, senha ) values(${nome},${email},${hash},1)`;

  if (res.status(200)) {
    return res.status(200).json("Usuário criado com sucesso!");
  } else {
    return res.status(500).json("Erro ao cadastrar usuário.");
  }
})

app.post("/usuarios/login", async (req, res) => {
  const { email, senha } = req.body;
  const usuario = await sql`select id_user,nome,nivel,senha from usuarios where email = ${email}`;

  console.log(usuario[0].senha);
  if (usuario[0].length !== 0) {
    const senhaValida = await CompararHash(senha, usuario[0].senha);
    if (senhaValida) {
      return res.status(200).json({ id_user: usuario[0].id_user, nome: usuario[0].nome, nivel: usuario[0].nivel });
    }
    return res.status(401).json("Senha incorreta");
  }
  return res.status(401).json("Erro ao cadastrar usuário");
});

app.get("/ListarUsers", async (req, res) => {
  const listar = await sql`SELECT id_user, nome FROM usuarios;`
  return res.status(200).json(listar)
});


//Area Agendamentos
app.post("/Criar_Treino", async (req, res) => {
  const { nome, tipo, subtipo, conteudo, id_user, data_mod } = req.body

  const criar = await sql`INSERT INTO memorias(nome, tipo, subtipo ,conteudo, id_user, data_mod) VALUES(${nome}, ${tipo}, ${subtipo}, ${conteudo}, ${id_user}, ${data_mod})`;
  return res.status(200).json(criar[0])
})

app.put("/Editar_Treino/:id", async (req, res) => {
  const { id } = req.params
  const { nome, tipo, subtipo, conteudo, id_user, data_mod} = req.body

  console.log(req.body)
  const editar = await sql`UPDATE memorias
	SET nome=${nome}, tipo=${tipo}, subtipo=${subtipo}, conteudo=${conteudo}, id_user=${id_user}, data_mod=${data_mod}
	WHERE id_memoria = ${id}`
  return res.status(200).json(editar)
})

app.delete("/Apagar_Treino/:id", async (req, res) => {
  const { id } = req.params
  const apagar = await sql`DELETE FROM memorias
WHERE id_memoria = ${id};
`
  return res.status(200).json(apagar)
});

app.get("/Listar_Treino", async (req, res) => {
  const listar = await sql`SELECT * FROM memorias;`
  return res.status(200).json(listar)
})
app.get("/Treino/:id", async (req, res) => {
  const { id } = req.params
  const listar = await sql`SELECT * FROM memorias WHERE id_memoria = ${id}`;
  return res.status(200).json(listar[0])
})

app.listen(3000, () => {
  console.log("API Ligada & Rodando.");
});


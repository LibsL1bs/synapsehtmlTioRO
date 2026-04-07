import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_SNIPPET = `
import json
import sys
from chatbotv4 import executar_com_usuario

pergunta = sys.argv[1]
usuario_id = int(sys.argv[2])
resposta = executar_com_usuario(pergunta, usuario_id=usuario_id)
print(json.dumps({"resposta": resposta}, ensure_ascii=False))
`;

const runPython = (pythonBin, pergunta, usuarioId) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      pythonBin,
      ["-c", PYTHON_SNIPPET, pergunta, String(usuarioId)],
      {
        cwd: __dirname,
        env: process.env,
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Processo Python finalizou com código ${code}.`));
        return;
      }

      const lines = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const payloadLine = lines[lines.length - 1] || "";

      try {
        const payload = JSON.parse(payloadLine);
        resolve(payload?.resposta ? String(payload.resposta) : "");
      } catch {
        resolve(payloadLine || stdout.trim());
      }
    });
  });

export async function executar_com_usuario(pergunta, usuarioId) {
  if (typeof pergunta !== "string" || !pergunta.trim()) {
    throw new Error("Pergunta inválida para executar_com_usuario.");
  }

  const parsedUserId = Number(usuarioId);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    throw new Error("usuarioId inválido para executar_com_usuario.");
  }

  try {
    return await runPython("python3", pergunta.trim(), parsedUserId);
  } catch (errorPython3) {
    if (errorPython3?.code !== "ENOENT") throw errorPython3;
    return runPython("python", pergunta.trim(), parsedUserId);
  }
}

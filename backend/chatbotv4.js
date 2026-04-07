import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VENV_PYTHON = path.resolve(__dirname, "../.venv/bin/python");

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
        const stderrLines = stderr
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        const mensagem = stderrLines.length > 0
          ? stderrLines[stderrLines.length - 1]
          : `Processo Python finalizou com código ${code}.`;
        reject(new Error(mensagem));
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

  const interpreters = [VENV_PYTHON, "python3", "python"];

  for (const pythonBin of interpreters) {
    try {
      return await runPython(pythonBin, pergunta.trim(), parsedUserId);
    } catch (error) {
      // Só tenta o próximo interpretador quando o binário não existe.
      if (error?.code === "ENOENT") continue;
      throw error;
    }
  }

  throw new Error("Nenhum interpretador Python disponível para executar o chatbot.");
}

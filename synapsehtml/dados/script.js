const ROUTES = {
  dashboard: "../dashboard/",
  dados: "../dados/",
  perfil: "../perfil/",
  metricas: "../metricas/",
  educacional: "../educacional/",
  treinos: "../treinos/treino.html",
  adminSistema: "../admin-sistema/",
  adminUsuarios: "../admin-usuarios/",
  adminLogs: "../admin-logs/",
  adminTestes: "../admin-testes/",
  adminDados: "../admin-dados/",
  login: "../login/",
};

const CHAT_STORAGE_KEY = "chat-messages-html-v2";


function getStoredUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function resolveApiBaseUrl() {
  if (window.SYNAPSE_API_URL) return window.SYNAPSE_API_URL;

  const isHttp = window.location.protocol === "http:" || window.location.protocol === "https:";
  if (isHttp && window.location.port === "8002") return window.location.origin;

  return "http://localhost:8002";
}

const API_BASE_URL = resolveApiBaseUrl();


function clearStoredUser() {
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
}

const LOGOUT_BACK_BLOCK_KEY = "synapse-logout-back-block";
const NOT_FOUND_ROUTE = "../notfound/";

function markLogoutBackBlock() {
  sessionStorage.setItem(LOGOUT_BACK_BLOCK_KEY, "1");
}

function hasHistoryBackNavigation() {
  const navEntry = performance.getEntriesByType("navigation")[0];
  return navEntry?.type === "back_forward";
}

function enforceLogoutBackBlock(force = false) {
  const shouldBlock = sessionStorage.getItem(LOGOUT_BACK_BLOCK_KEY) === "1";
  if (!shouldBlock) return false;

  const currentUser = getStoredUser();
  if (currentUser?.access_token) {
    sessionStorage.removeItem(LOGOUT_BACK_BLOCK_KEY);
    return false;
  }

  if (force || hasHistoryBackNavigation()) {
    window.location.replace(NOT_FOUND_ROUTE);
    return true;
  }

  return false;
}

function installBackNavigationGuard() {
  window.addEventListener("pageshow", () => {
    enforceLogoutBackBlock(true);
  });
  window.addEventListener("popstate", () => {
    enforceLogoutBackBlock(true);
  });
}

function isAdminUser(user) {
  if (!user) return false;
  return Number(user.role_id ?? user.role_user) === 1;
}

function bindRouteButtons() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.getAttribute("data-route");
      window.location.href = ROUTES[route] || ROUTES.dashboard;
    });
  });
}

function getErrorMessage(error, fallback = "Erro desconhecido") {
  if (error && error.message) return error.message;
  return fallback;
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadChatMessages() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAT_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveChatMessages(messages) {
  sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
}

async function performApiFetch(path, init) {
  return fetch(`${API_BASE_URL}${path}`, init);
}

async function loginWithCredentials(email, password) {
  const response = await performApiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || "Falha no login");
  }

  return response.json();
}

async function apiRequest(path, init = {}) {
  const user = getStoredUser();

  if (!user?.access_token) throw new Error("Usuário não autenticado.");

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${user.access_token}`);
  headers.set("X-Request-Source", isAdminUser(user) ? "admin" : "system");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await performApiFetch(path, { ...init, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Erro ${response.status}`);
  }

  if (response.status === 204) return undefined;
  return response.json();
}

function setupChat() {
  const form = document.getElementById("chat-form");
  const log = document.getElementById("chat-log");
  if (!form || !log) return;

  function renderChat() {
    const messages = loadChatMessages();
    log.innerHTML = messages.map((msg) => `<div class="syn-chat-msg ${msg.role}">${escapeHtml(msg.content)}</div>`).join("");
    log.scrollTop = log.scrollHeight;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.querySelector("input[name='pergunta']");
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const user = getStoredUser();
    const messages = loadChatMessages();
    messages.push({ role: "user", content: text });
    saveChatMessages(messages);
    renderChat();
    input.value = "";

    try {
      const data = await apiRequest("/chat", {
        method: "POST",
        headers: { "X-User-Id": String(user?.id_user || "") },
        body: JSON.stringify({ pergunta: text }),
      });
      messages.push({ role: "assistant", content: String(data?.resposta || "Sem resposta") });
    } catch (error) {
      messages.push({ role: "assistant", content: getErrorMessage(error, "Erro ao enviar mensagem.") });
    }

    saveChatMessages(messages);
    renderChat();
  });

  renderChat();
}

function isPrimitiveValue(value) {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function isStructuredJson(value) {
  return Boolean(value) && (Array.isArray(value) || typeof value === "object");
}

function pathSegment(prefix, segment) {
  return prefix ? `${prefix}.${segment}` : segment;
}

function arrayPathSegment(prefix, index) {
  return `${prefix}[${index}]`;
}

function collectEditableLines(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const itemPath = arrayPathSegment(prefix, index);
      if (isPrimitiveValue(item)) {
        return [{ path: itemPath, label: itemPath, value: item }];
      }
      return collectEditableLines(item, itemPath);
    });
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => {
      const itemPath = pathSegment(prefix, key);
      if (isPrimitiveValue(item)) {
        return [{ path: itemPath, label: key, value: item }];
      }
      return collectEditableLines(item, itemPath);
    });
  }

  return [];
}

function primitiveToText(value) {
  if (value === null) return "--";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function parsePrimitiveText(path, text, baseValue) {
  const trimmed = String(text || "").trim();

  if (typeof baseValue === "string") {
    return { ok: true, value: text };
  }

  if (typeof baseValue === "number") {
    const numericText = trimmed.replace(",", ".");
    const parsed = Number(numericText);
    if (!Number.isFinite(parsed)) {
      return { ok: false, error: `${path}: valor numerico invalido` };
    }
    return { ok: true, value: parsed };
  }

  if (typeof baseValue === "boolean") {
    if (trimmed === "true") return { ok: true, value: true };
    if (trimmed === "false") return { ok: true, value: false };
    return { ok: false, error: `${path}: valor booleano invalido (use true/false)` };
  }

  if (baseValue === null) {
    if (trimmed.length === 0 || trimmed === "--" || trimmed.toLowerCase() === "null") {
      return { ok: true, value: null };
    }

    const lowered = trimmed.toLowerCase();
    if (lowered === "true") return { ok: true, value: true };
    if (lowered === "false") return { ok: true, value: false };

    const numericText = trimmed.replace(",", ".");
    const parsedNumber = Number(numericText);
    if (Number.isFinite(parsedNumber)) {
      return { ok: true, value: parsedNumber };
    }

    return { ok: true, value: text };
  }

  return { ok: false, error: `${path}: tipo nao suportado` };
}

function applyEditedValues(base, valueMap, currentPath = "") {
  if (Array.isArray(base)) {
    const rebuilt = [];
    for (let index = 0; index < base.length; index += 1) {
      const path = arrayPathSegment(currentPath, index);
      const item = base[index];
      if (isPrimitiveValue(item)) {
        const parseResult = parsePrimitiveText(path, valueMap[path] ?? primitiveToText(item), item);
        if (!parseResult.ok) return parseResult;
        rebuilt.push(parseResult.value);
      } else {
        const nested = applyEditedValues(item, valueMap, path);
        if (!nested.ok) return nested;
        rebuilt.push(nested.value);
      }
    }
    return { ok: true, value: rebuilt };
  }

  if (base && typeof base === "object") {
    const rebuilt = {};
    for (const [key, item] of Object.entries(base)) {
      const path = pathSegment(currentPath, key);
      if (isPrimitiveValue(item)) {
        const parseResult = parsePrimitiveText(path, valueMap[path] ?? primitiveToText(item), item);
        if (!parseResult.ok) return parseResult;
        rebuilt[key] = parseResult.value;
      } else {
        const nested = applyEditedValues(item, valueMap, path);
        if (!nested.ok) return nested;
        rebuilt[key] = nested.value;
      }
    }
    return { ok: true, value: rebuilt };
  }

  return { ok: true, value: base };
}

function hasCompatibleStructure(base, candidate) {
  if (Array.isArray(base)) {
    if (!Array.isArray(candidate) || base.length !== candidate.length) return false;
    return base.every((item, index) => hasCompatibleStructure(item, candidate[index]));
  }

  if (base && typeof base === "object") {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const baseObj = base;
    const candidateObj = candidate;
    const baseKeys = Object.keys(baseObj).sort();
    const candidateKeys = Object.keys(candidateObj).sort();

    if (baseKeys.length !== candidateKeys.length) return false;
    if (!baseKeys.every((key, index) => key === candidateKeys[index])) return false;

    return baseKeys.every((key) => hasCompatibleStructure(baseObj[key], candidateObj[key]));
  }

  return !Array.isArray(candidate) && (candidate === null || typeof candidate !== "object");
}

function normalizeMemoryContent(rawValue) {
  if (isStructuredJson(rawValue)) return rawValue;
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      if (isStructuredJson(parsed)) return parsed;
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

function setRowStatus(row, message, isError = false) {
  const statusNode = row.querySelector("[data-status]");
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.className = `text-[10px] font-mono ${isError ? "text-red-500" : "text-muted-foreground/80"}`;
}

async function persistMemoryRow(row, memory, userId) {
  const valueSpans = row.querySelectorAll("[data-memory-value]");
  const valueMap = {};
  valueSpans.forEach((span) => {
    const path = span.getAttribute("data-path") || "";
    valueMap[path] = span.textContent ?? "";
  });

  const rebuilt = applyEditedValues(memory.conteudo_raw, valueMap);
  if (!rebuilt.ok) {
    setRowStatus(row, rebuilt.error, true);
    return;
  }

  if (!hasCompatibleStructure(memory.conteudo_raw, rebuilt.value)) {
    setRowStatus(row, "Somente valores podem ser alterados.", true);
    return;
  }

  try {
    setRowStatus(row, "Salvando...");
    await apiRequest("/memoria/edit", {
      method: "POST",
      body: JSON.stringify({
        id_memoria: Number(memory.id_memoria),
        id_user: Number(userId),
        conteudo: rebuilt.value,
      }),
    });
    memory.conteudo_raw = rebuilt.value;
    setRowStatus(row, "Alteracoes salvas.");
  } catch (error) {
    setRowStatus(row, getErrorMessage(error, "Erro ao salvar."), true);
  }
}

function renderMemories(memories) {
  const rows = document.getElementById("memory-rows");
  if (!rows) return;

  const user = getStoredUser();
  const userId = Number(user?.id_user || 0);

  const normalized = memories.map((memory) => {
    const conteudoRaw = normalizeMemoryContent(memory.conteudo);
    return {
      ...memory,
      conteudo_raw: conteudoRaw,
    };
  });

  rows.innerHTML = normalized.map((memory) => {
    const editableLines = memory.conteudo_raw ? collectEditableLines(memory.conteudo_raw) : [];
    const contentHtml = editableLines.length > 0
      ? editableLines.map((line, index) => {
          const separator = index < editableLines.length - 1
            ? '<span class="text-muted-foreground/50"> | </span>'
            : "";
          return `<span class="inline-flex items-center gap-1 mr-1">\
            <span class="text-muted-foreground">${escapeHtml(line.label)}:</span>\
            <span data-memory-value data-path="${escapeHtml(line.path)}" contenteditable="true" spellcheck="false" class="text-foreground outline-none">${escapeHtml(primitiveToText(line.value))}</span>\
            ${separator}\
          </span>`;
        }).join("")
      : `<span class="text-muted-foreground/80">${escapeHtml(String(typeof memory.conteudo === "string" ? memory.conteudo : JSON.stringify(memory.conteudo ?? "")) )}</span>`;

    return `
      <div class="w-full text-left grid grid-cols-12 gap-2 px-0 py-3 items-start hover:surface-1 transition-colors syn-memory-row" data-memory-id="${Number(memory.id_memoria || 0)}">
        <span class="col-span-3 text-xs font-mono text-foreground">${memory.nome || "-"}</span>
        <span class="col-span-2 text-xs font-mono text-muted-foreground">${memory.tipo || "-"}</span>
        <span class="col-span-2 text-xs font-mono text-muted-foreground">${memory.subtipo || "-"}</span>
        <span class="col-span-5 text-xs font-mono text-muted-foreground/80 break-words">
          ${contentHtml}
          <span data-status class="block text-[10px] font-mono text-muted-foreground/70 mt-1">Clique no valor para editar.</span>
        </span>
      </div>
    `;
  }).join("");

  rows.querySelectorAll("[data-memory-value]").forEach((span) => {
    span.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
      }
    });

    span.addEventListener("blur", async (event) => {
      const editableNode = event.currentTarget;
      const row = editableNode.closest(".syn-memory-row");
      if (!row) return;

      const memoryId = Number(row.getAttribute("data-memory-id") || 0);
      const memory = normalized.find((item) => Number(item.id_memoria) === memoryId);
      if (!memory || !memory.conteudo_raw || !userId) return;

      await persistMemoryRow(row, memory, userId);
    });
  });
}

async function loadMemories() {
  const rows = document.getElementById("memory-rows");
  if (!rows) return;

  const user = getStoredUser();
  if (!user?.id_user) {
    rows.innerHTML = `<div class="text-xs text-red-500 font-mono">Usuário não autenticado.</div>`;
    return;
  }

  try {
    const data = await apiRequest(`/memoria/${user.id_user}`);
    const memories = Array.isArray(data?.memoria) ? data.memoria.slice(0, 120) : [];

    if (!memories.length) {
      rows.innerHTML = `<div class="text-xs text-muted-foreground font-mono">Nenhuma memória encontrada.</div>`;
      return;
    }

    renderMemories(memories);
  } catch (error) {
    rows.innerHTML = `<div class="text-xs text-red-500 font-mono">${getErrorMessage(error, "Erro ao carregar memórias")}</div>`;
  }
}

function initPage() {
  installBackNavigationGuard();
  if (enforceLogoutBackBlock()) return;

  const user = getStoredUser();
  if (!user) {
    window.location.href = ROUTES.login;
    return;
  }

  if (!isAdminUser(user)) {
    document.querySelectorAll("[data-admin-only]").forEach((item) => {
      item.style.display = "none";
    });
  }

  bindRouteButtons();
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    markLogoutBackBlock();
    clearStoredUser();
    window.location.href = ROUTES.login;
  });
  setupChat();
  loadMemories();
}

initPage();

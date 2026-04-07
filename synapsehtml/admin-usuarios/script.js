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

  return "http://192.168.1.30:8002";
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

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getErrorMessage(error, fallback = "Erro desconhecido") {
  if (error && error.message) return error.message;
  return fallback;
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

async function apiRequest(path, init = {}) {
  const user = getStoredUser();
  if (!user?.access_token) throw new Error("Usuário não autenticado.");

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${user.access_token}`);
  headers.set("X-Request-Source", "admin");
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

function editUser(button) {
  const nome = prompt("Nome", button.dataset.nome || "");
  if (nome === null) return null;
  const email = prompt("Email", button.dataset.email || "");
  if (email === null) return null;
  const roleLabel = prompt("Role (user/admin)", button.dataset.roleLabel || "user") || button.dataset.roleLabel || "user";
  const roleUser = String(roleLabel).toLowerCase() === "admin" ? 1 : 0;

  return {
    nome,
    email,
    role_user: roleUser,
    senha: prompt("Nova senha (opcional)", "") || "",
    ativo: button.dataset.ativo === "true",
  };
}

function renderUsers(users) {
  const usersList = document.getElementById("users-list");
  if (!usersList) return;

  usersList.innerHTML = users.map((user) => `
    <div class="w-full text-left grid grid-cols-12 gap-2 px-0 py-3 items-center hover:surface-1 transition-colors">
      <span class="col-span-1 text-xs font-mono text-muted-foreground">${user.id_user}</span>
      <span class="col-span-3 text-xs font-mono text-foreground">${escapeHtml(user.nome || "")}</span>
      <span class="col-span-3 text-xs font-mono text-muted-foreground">${escapeHtml(user.email || "")}</span>
      <span class="col-span-1 text-[10px] font-mono text-muted-foreground">${Number(user.role_id ?? user.role_user) === 1 ? "admin" : "user"}</span>
      <span class="col-span-2 text-[10px] font-mono text-muted-foreground">${user.ativo ? "ativo" : "inativo"}</span>
      <span class="col-span-2 flex gap-1">
        <button class="text-[9px] px-2 py-1 border border-border font-mono" data-action="edit" data-id="${user.id_user}" data-nome="${escapeHtml(user.nome || "")}" data-email="${escapeHtml(user.email || "")}" data-role-label="${Number(user.role_id ?? user.role_user) === 1 ? "admin" : "user"}" data-ativo="${user.ativo}">Editar</button>
        <button class="text-[9px] px-2 py-1 border border-alert/40 text-alert font-mono" data-action="delete" data-id="${user.id_user}">Excluir</button>
      </span>
    </div>
  `).join("");
}

async function loadUsers() {
  const usersList = document.getElementById("users-list");
  if (!usersList) return;
  usersList.textContent = "Carregando usuários...";

  try {
    const data = await apiRequest("/users");
    const users = Array.isArray(data?.users) ? data.users : [];
    if (!users.length) {
      usersList.textContent = "Nenhum usuário encontrado.";
      return;
    }
    renderUsers(users);
  } catch (error) {
    usersList.innerHTML = `<span class="text-red-500">${getErrorMessage(error, "Erro ao carregar usuários")}</span>`;
  }
}

function bindCrud() {
  const createForm = document.getElementById("create-user-form");
  const usersList = document.getElementById("users-list");
  const errorBox = document.getElementById("admin-user-error");
  if (!createForm || !usersList || !errorBox) return;

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.textContent = "";
    const data = new FormData(createForm);

    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          nome: String(data.get("nome") || "").trim(),
          email: String(data.get("email") || "").trim(),
          senha: String(data.get("senha") || "").trim(),
          role_user: String(data.get("role") || "user").trim().toLowerCase() === "admin" ? 1 : 0,
          ativo: true,
        }),
      });

      createForm.reset();
      await loadUsers();
    } catch (error) {
      errorBox.textContent = getErrorMessage(error, "Erro ao criar usuário.");
    }
  });

  usersList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!target || !target.dataset) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;

    try {
      if (action === "delete") {
        if (!window.confirm("Tem certeza que deseja excluir este usuário?")) return;
        await apiRequest(`/users/${id}`, { method: "DELETE" });
        await loadUsers();
        return;
      }

      const payload = editUser(target);
      if (!payload) return;

      await apiRequest(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      await loadUsers();
    } catch (error) {
      const fallback = action === "delete" ? "Erro ao excluir usuário." : "Erro ao editar usuário.";
      errorBox.textContent = getErrorMessage(error, fallback);
    }
  });
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
    window.location.href = ROUTES.dashboard;
    return;
  }

  bindRouteButtons();
  bindCrud();
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    markLogoutBackBlock();
    clearStoredUser();
    window.location.href = ROUTES.login;
  });
  setupChat();
  loadUsers();
}

initPage();
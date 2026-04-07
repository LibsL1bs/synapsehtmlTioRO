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


function saveStoredUser(user, persist) {
  const roleId = Number(user?.role_id ?? user?.role_user) === 1 ? 1 : 0;
  const serialized = JSON.stringify({ ...user, role_id: roleId, role_user: roleId });

  if (persist) {
    localStorage.setItem("user", serialized);
    sessionStorage.removeItem("user");
    return;
  }

  sessionStorage.setItem("user", serialized);
  localStorage.removeItem("user");
}

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

function bindProfileForm() {
  const form = document.getElementById("perfil-form");
  const deleteButton = document.getElementById("perfil-delete-btn");
  const errorBox = document.getElementById("perfil-error");
  const successBox = document.getElementById("perfil-ok");
  const displayName = document.getElementById("perfil-display-name");
  const displayEmail = document.getElementById("perfil-display-email");

  if (!form || !errorBox || !successBox) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.textContent = "";
    successBox.textContent = "";

    const user = getStoredUser();
    if (!user?.id_user) {
      errorBox.textContent = "Usuário não autenticado.";
      return;
    }

    const data = new FormData(form);
    const nome = String(data.get("nome") || "").trim();
    const email = String(data.get("email") || "").trim();
    const currentPassword = String(data.get("currentPassword") || "").trim();
    const newPassword = String(data.get("newPassword") || "").trim();
    const confirmPassword = String(data.get("confirmPassword") || "").trim();

    if (!nome || !email) {
      errorBox.textContent = "Nome e email são obrigatórios.";
      return;
    }

    let senha = "";

    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
        errorBox.textContent = "Dados de senha inválidos.";
        return;
      }

      try {
        await loginWithCredentials(String(user.email || ""), currentPassword);
        senha = newPassword;
      } catch {
        errorBox.textContent = "Senha atual inválida.";
        return;
      }
    }

    try {
      await apiRequest(`/users/${user.id_user}`, {
        method: "PUT",
        body: JSON.stringify({ nome, email, senha, ativo: true, role_user: Number(user.role_id ?? user.role_user) === 1 ? 1 : 0 }),
      });

      const persist = Boolean(localStorage.getItem("user"));
      saveStoredUser({ ...user, nome, email }, persist);
      if (displayName) displayName.textContent = nome;
      if (displayEmail) displayEmail.textContent = email;
      successBox.textContent = "Perfil atualizado com sucesso.";
      form.reset();
      const nomeInput = form.querySelector("input[name='nome']");
      const emailInput = form.querySelector("input[name='email']");
      if (nomeInput) nomeInput.value = nome;
      if (emailInput) emailInput.value = email;
    } catch (error) {
      errorBox.textContent = getErrorMessage(error, "Erro ao salvar alterações.");
    }
  });

  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      errorBox.textContent = "";
      successBox.textContent = "";

      const user = getStoredUser();
      if (!user?.id_user) {
        errorBox.textContent = "Usuário não autenticado.";
        return;
      }

      const confirmed = window.confirm("Tem certeza que deseja deletar seu perfil? Esta ação não pode ser desfeita.");
      if (!confirmed) return;

      const previousLabel = deleteButton.textContent;
      deleteButton.textContent = "DELETANDO...";
      deleteButton.disabled = true;

      try {
        await apiRequest(`/users/${user.id_user}`, { method: "DELETE" });
        markLogoutBackBlock();
        clearStoredUser();
        window.location.href = ROUTES.login;
      } catch (error) {
        deleteButton.textContent = previousLabel;
        deleteButton.disabled = false;
        errorBox.textContent = getErrorMessage(error, "Erro ao deletar perfil.");
      }
    });
  }
}

function initPage() {
  installBackNavigationGuard();
  if (enforceLogoutBackBlock()) return;

  const currentUser = getStoredUser();
  if (!currentUser) {
    window.location.href = ROUTES.login;
    return;
  }

  const displayName = document.getElementById("perfil-display-name");
  const displayEmail = document.getElementById("perfil-display-email");
  if (displayName) displayName.textContent = String(currentUser?.nome || "");
  if (displayEmail) displayEmail.textContent = String(currentUser?.email || "");

  const form = document.getElementById("perfil-form");
  if (form) {
    const nomeInput = form.querySelector("input[name='nome']");
    const emailInput = form.querySelector("input[name='email']");
    if (nomeInput) nomeInput.value = String(currentUser?.nome || "");
    if (emailInput) emailInput.value = String(currentUser?.email || "");
  }

  if (!isAdminUser(currentUser)) {
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
  bindProfileForm();
}

initPage();

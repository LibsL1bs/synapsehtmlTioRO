const ROUTES = { dashboard: "../dashboard/", dados: "../dados/", perfil: "../perfil/", metricas: "../metricas/", educacional: "../educacional/", treinos: "../treinos/treino.html", adminSistema: "../admin-sistema/", adminUsuarios: "../admin-usuarios/", adminLogs: "../admin-logs/", adminTestes: "../admin-testes/", adminDados: "../admin-dados/", login: "../login/" };
const CHAT_STORAGE_KEY = "chat-messages-html-v2";
const API_BASE_URL = window.SYNAPSE_API_URL || window.location.origin;

function getStoredUser() { const raw = localStorage.getItem("user") || sessionStorage.getItem("user"); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } }
function clearStoredUser() { localStorage.removeItem("user"); sessionStorage.removeItem("user"); }
const LOGOUT_BACK_BLOCK_KEY = "synapse-logout-back-block";
const NOT_FOUND_ROUTE = "../notfound/";
function markLogoutBackBlock() { sessionStorage.setItem(LOGOUT_BACK_BLOCK_KEY, "1"); }
function hasHistoryBackNavigation() { const navEntry = performance.getEntriesByType("navigation")[0]; return navEntry?.type === "back_forward"; }
function enforceLogoutBackBlock(force = false) { const shouldBlock = sessionStorage.getItem(LOGOUT_BACK_BLOCK_KEY) === "1"; if (!shouldBlock) return false; const currentUser = getStoredUser(); if (currentUser?.access_token) { sessionStorage.removeItem(LOGOUT_BACK_BLOCK_KEY); return false; } if (force || hasHistoryBackNavigation()) { window.location.replace(NOT_FOUND_ROUTE); return true; } return false; }
function installBackNavigationGuard() { window.addEventListener("pageshow", () => { enforceLogoutBackBlock(true); }); window.addEventListener("popstate", () => { enforceLogoutBackBlock(true); }); }
function isAdminUser(user) { if (!user) return false; return Number(user.role_id ?? user.role_user) === 1; }
function bindRouteButtons() { document.querySelectorAll("[data-route]").forEach((button) => { button.addEventListener("click", () => { const route = button.getAttribute("data-route"); window.location.href = ROUTES[route] || ROUTES.dashboard; }); }); }
function escapeHtml(text) { return String(text || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function loadChatMessages() { try { return JSON.parse(sessionStorage.getItem(CHAT_STORAGE_KEY) || "[]"); } catch { return []; } }
function saveChatMessages(messages) { sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages)); }
async function performApiFetch(path, init) { return fetch(`${API_BASE_URL}${path}`, init); }
async function apiRequest(path, init = {}) { const user = getStoredUser(); if (!user?.access_token) throw new Error("Usuário não autenticado."); const headers = new Headers(init.headers || {}); headers.set("Authorization", `Bearer ${user.access_token}`); headers.set("X-Request-Source", isAdminUser(user) ? "admin" : "system"); if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json"); const response = await performApiFetch(path, { ...init, headers }); if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.detail || errorData.error || `Erro ${response.status}`); } if (response.status === 204) return undefined; return response.json(); }

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
      const data = await apiRequest("/chat", { method: "POST", headers: { "X-User-Id": String(user?.id_user || "") }, body: JSON.stringify({ pergunta: text }) });
      messages.push({ role: "assistant", content: String(data?.resposta || "Sem resposta") });
    } catch (error) {
      messages.push({ role: "assistant", content: error && error.message ? error.message : "Erro ao enviar mensagem." });
    }

    saveChatMessages(messages);
    renderChat();
  });

  renderChat();
}

function setupEducationalCards() {
  const cards = document.querySelectorAll(".edu-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const isOpen = card.classList.toggle("is-open");
      card.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });
}

function initPage() {
  installBackNavigationGuard();
  if (enforceLogoutBackBlock()) return;

  const user = getStoredUser();
  if (!user) { window.location.href = ROUTES.login; return; }

  if (!isAdminUser(user)) {
    document.querySelectorAll("[data-admin-only]").forEach((item) => {
      item.style.display = "none";
    });
  }

  bindRouteButtons();
  document.getElementById("logout-btn")?.addEventListener("click", () => { markLogoutBackBlock(); clearStoredUser(); window.location.href = ROUTES.login; });
  setupChat();
  setupEducationalCards();
}

initPage();

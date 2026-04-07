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
function resolveApiBaseUrl() {
  if (window.SYNAPSE_API_URL) return window.SYNAPSE_API_URL;

  const isHttp = window.location.protocol === "http:" || window.location.protocol === "https:";
  if (isHttp && window.location.port === "8002") return window.location.origin;

  return "http://192.168.1.30:8002";
}

const API_BASE_URL = resolveApiBaseUrl();
const CIRCUMFERENCE = 2 * Math.PI * 54;

function getStoredUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

function metricCard(title, value, unit = "%", indicators = [], subtitle = "", hideUnit = false) {
  return `
    <div class="surface-2 rounded-sm border border-border border-l-2 border-l-alert p-4 panel-shadow transition-all duration-150 hover:border-l-alert/60">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
          <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em] font-mono">${title}</span>
        </div>
        <div class="ml-2 h-px flex-1 bg-muted-foreground/80"></div>
      </div>
      <div class="flex items-baseline gap-1">
        <span class="text-2xl font-bold text-foreground font-mono leading-none">${value ?? "--"}</span>
        ${hideUnit ? "" : `<span class="text-xs text-muted-foreground font-mono">${unit}</span>`}
      </div>
      ${indicators.length ? `<div class="mt-2 space-y-1.5">${indicators.map((item) => `<div class="flex items-center justify-between text-[11px] font-mono"><span class="text-muted-foreground">${item.label}</span><span class="text-foreground">${item.value}</span></div>`).join("")}</div>` : ""}
      ${subtitle ? `<div class="tech-divider my-2"></div><p class="text-[11px] text-muted-foreground leading-relaxed">${subtitle}</p>` : ""}
    </div>
  `;
}

function workoutHtml(workout = {}) {
  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

  return `
    <div class="flex items-center gap-2 mb-3 pb-2 border-b border-border">
      <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono">Próximo Treino</span>
    </div>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-base font-bold text-foreground font-mono">${workout.title || "Próximo treino"}</span>
        ${workout.statusLabel ? `<span class="text-[10px] text-alert font-mono surface-3 px-2 py-0.5 rounded-sm border border-border uppercase tracking-wider">${workout.statusLabel}</span>` : ""}
      </div>
      <div class="grid grid-cols-2 gap-3">
        ${workout.target ? `<div class="flex items-center gap-2 surface-1 rounded-sm px-2.5 py-1.5 border border-border"><span class="text-xs text-secondary-foreground font-mono">${workout.target}</span></div>` : ""}
        ${workout.duration ? `<div class="flex items-center gap-2 surface-1 rounded-sm px-2.5 py-1.5 border border-border"><span class="text-xs text-secondary-foreground font-mono">${workout.duration}</span></div>` : ""}
      </div>
      ${exercises.length ? `<div class="border-t border-border pt-3"><div class="space-y-1">${exercises.map((exercise, index) => `<div class="flex items-center gap-2 px-1"><span class="text-[10px] text-muted-foreground font-mono w-4">${String(index + 1).padStart(2, "0")}</span><div class="w-px h-3 bg-border"></div><span class="text-xs text-muted-foreground font-mono">${exercise.label}</span></div>`).join("")}</div></div>` : ""}
    </div>
  `;
}

async function loadDashboard() {
  const subtitle = document.getElementById("subtitle");
  const weekBlock = document.getElementById("week-block");
  const readinessValue = document.getElementById("readiness-value");
  const readinessCircle = document.getElementById("readiness-circle");
  const cardsWrap = document.getElementById("cards-wrap");
  const nextWorkout = document.getElementById("next-workout");

  if (!subtitle || !weekBlock || !readinessValue || !readinessCircle || !cardsWrap || !nextWorkout) return;

  try {
    const payload = await apiRequest("/dashboard/state", { cache: "no-store" });
    const metrics = payload?.metrics || {};
    const readiness = Number(payload?.readiness ?? 0);
    const normalizedReadiness = Math.max(0, Math.min(100, readiness));

    subtitle.textContent = payload?.updated_at
      ? `COCKPIT DE PERFORMANCE — atualizado em ${new Date(payload.updated_at).toLocaleString("pt-BR")}`
      : "COCKPIT DE PERFORMANCE — aguardando dados";
    weekBlock.textContent = `Semana ${String(payload?.semana ?? "—")} / Bloco ${String(payload?.bloco ?? "—")}`;
    readinessValue.textContent = Number.isFinite(readiness) ? String(readiness) : "--";
    readinessCircle.setAttribute("stroke-dashoffset", String(CIRCUMFERENCE - (normalizedReadiness / 100) * CIRCUMFERENCE));

    const leftColumn = [
      metricCard("Sono", metrics?.sono?.value, metrics?.sono?.unit || "horas", metrics?.sono?.indicators || []),
      metricCard("Alimentação", metrics?.alimentacao?.value, metrics?.alimentacao?.unit || "kcal", metrics?.alimentacao?.indicators || []),
    ].join("");

    const rightColumn = [
      metricCard("Fadiga Neural Aproximada", metrics?.fadiga?.value, "%", [], metrics?.fadiga?.subtitle || ""),
      metricCard("Tendência de Progresso", null, "%", metrics?.tendencia?.indicators || [], "", true),
    ].join("");

    cardsWrap.innerHTML = `<div class="w-1/2 space-y-3">${rightColumn}</div><div class="w-1/2 space-y-3">${leftColumn}</div>`;
    nextWorkout.innerHTML = workoutHtml(payload?.nextWorkout);
  } catch (error) {
    subtitle.textContent = "COCKPIT DE PERFORMANCE — erro ao carregar";
    cardsWrap.innerHTML = `<div class="text-xs text-red-500 font-mono">${getErrorMessage(error, "Erro desconhecido")}</div>`;
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
  loadDashboard();
}

initPage();

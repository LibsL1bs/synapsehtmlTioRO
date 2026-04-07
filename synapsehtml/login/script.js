const ROUTES = {
  login: "../login/",
  registro: "../registro/",
  perfil: "../perfil/",
  dashboard: "../dashboard/",
};

function resolveApiBaseUrl() {
  if (window.SYNAPSE_API_URL) return window.SYNAPSE_API_URL;

  const isHttp = window.location.protocol === "http:" || window.location.protocol === "https:";
  if (isHttp && window.location.port === "8002") {
    return window.location.origin;
  }

  return "http://localhost:8002";
}

const API_BASE_URL = resolveApiBaseUrl();


const form = document.getElementById("login-form");
const errorBox = document.getElementById("login-error");

function setLoginError(message) {
  if (!errorBox) return;
  const text = String(message || "").trim();
  errorBox.textContent = text;
  errorBox.style.display = text ? "block" : "none";
}

function getStoredUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStoredUser(user, persist) {
  const roleId = Number(user?.role_id ?? user?.role_user) === 1 ? 1 : 0;
  const normalized = JSON.stringify({
    ...user,
    role_id: roleId,
    role_user: roleId,
  });

  if (persist) {
    localStorage.setItem("user", normalized);
    sessionStorage.removeItem("user");
    return;
  }

  sessionStorage.setItem("user", normalized);
  localStorage.removeItem("user");
}

function bindRouteButtons() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.getAttribute("data-route");
      window.location.href = ROUTES[route] || ROUTES.login;
    });
  });
}

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

async function performApiFetch(path, init) {
  return fetch(`${API_BASE_URL}${path}`, init);
}

async function loginUser(email, password) {
  const response = await performApiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || "Falha ao autenticar");
  }

  return response.json();
}

if (getStoredUser()) {
  window.location.href = ROUTES.dashboard;
}

bindRouteButtons();

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginError("");

    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const data = new FormData(form);
      const email = String(data.get("email") || "").trim();
      const password = String(data.get("password") || "").trim();
      const persist = data.get("persist") === "on";

      if (!email || !password) {
        throw new Error("Informe email e senha.");
      }

      if (!isValidEmailFormat(email)) {
        const message = "O campo email deve conter um email válido.";
        console.warn("[LOGIN_HTML] erro de autenticação: formato de email inválido", { email });
        throw new Error(message);
      }

      const user = await loginUser(email, password);
      if (!user?.access_token || !user?.id_user) {
        throw new Error("Resposta de login inválida. Tente novamente.");
      }

      saveStoredUser(user, persist);
      window.location.href = ROUTES.dashboard;
    } catch (error) {
      const message = error && error.message ? error.message : "Erro ao iniciar sessão.";
      setLoginError(message);
      window.alert(message);
      console.error("[LOGIN_HTML] falha de login:", error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

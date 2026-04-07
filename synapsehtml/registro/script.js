const ROUTES = {
  login: "../login/",
  registro: "../registro/",
  dashboard: "../dashboard/",
};

const API_BASE_URL = window.SYNAPSE_API_URL || "http://192.168.1.30:8002";

const form = document.getElementById("register-form");
const errorBox = document.getElementById("register-error");
const successBox = document.getElementById("register-ok");

function getStoredUser() {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function bindRouteButtons() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.getAttribute("data-route");
      window.location.href = ROUTES[route] || ROUTES.login;
    });
  });
}

async function performApiFetch(path, init) {
  return fetch(`${API_BASE_URL}${path}`, init);
}

async function registerUser(nome, email, senha) {
  const response = await performApiFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Request-Source": "external" },
    body: JSON.stringify({ nome, email, senha }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || "Falha ao registrar");
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
    errorBox.textContent = "";
    successBox.textContent = "";

    const data = new FormData(form);
    const nome = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const senha = String(data.get("password") || "").trim();
    const confirm = String(data.get("confirm") || "").trim();

    if (!nome || !email || !senha || !confirm) {
      errorBox.textContent = "Preencha todos os campos.";
      return;
    }

    if (senha !== confirm) {
      errorBox.textContent = "As senhas não coincidem.";
      return;
    }

    try {
      await registerUser(nome, email, senha);
      successBox.textContent = "Conta criada com sucesso! Redirecionando...";
      setTimeout(() => {
        window.location.href = ROUTES.login;
      }, 1100);
    } catch (error) {
      errorBox.textContent = error && error.message ? error.message : "Erro desconhecido";
    }
  });
}

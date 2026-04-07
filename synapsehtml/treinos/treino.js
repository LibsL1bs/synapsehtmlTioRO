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

const API_BASE = window.SYNAPSE_API_URL || window.location.origin;
const STORAGE_KEY = "synapse-treinos";
const SET_TYPES = ["aquec", "serie", "back-off", "pap"];
const LOGOUT_BACK_BLOCK_KEY = "synapse-logout-back-block";
const NOT_FOUND_ROUTE = "../notfound/";

const getStoredUser = () => {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const markLogoutBackBlock = () => {
  sessionStorage.setItem(LOGOUT_BACK_BLOCK_KEY, "1");
};

const hasHistoryBackNavigation = () => {
  const navEntry = performance.getEntriesByType("navigation")[0];
  return navEntry?.type === "back_forward";
};

const enforceLogoutBackBlock = (force = false) => {
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
};

const installBackNavigationGuard = () => {
  window.addEventListener("pageshow", () => {
    enforceLogoutBackBlock(true);
  });
  window.addEventListener("popstate", () => {
    enforceLogoutBackBlock(true);
  });
};

const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
let user = null;
try {
  user = rawUser ? JSON.parse(rawUser) : null;
} catch {
  user = null;
}
installBackNavigationGuard();
if (!user) {
  if (!enforceLogoutBackBlock()) {
    window.location.href = ROUTES.login;
  }
}

const api = (path, init = {}) => {
  const headers = new Headers(init.headers || {});
  if (user?.access_token) headers.set("Authorization", `Bearer ${user.access_token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE}${path}`, { ...init, headers }).then((res) => res.json().catch(() => null));
};

const state = {
  list: (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  })(),
  selected: null,
  draft: null,
  editing: null,
};

const ui = {};
let pendingExercise = null;

const clock = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const base = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h ? `${String(h).padStart(2, "0")}:${base}` : base;
};

const newSet = () => ({ reps: "5", weight: "0", type: SET_TYPES[1], rpe: "6" });

const render = () => {
  if (!ui.history || !ui.detail || !ui.empty) return;

  if (!state.list.length) {
    ui.history.innerHTML = '<div class="text-[10px] text-muted-foreground font-mono text-center py-4">Nenhum treino registrado</div>';
  } else {
    ui.history.innerHTML = state.list
      .map((training) => {
        const active = state.selected === training.localId ? "surface-3 text-foreground" : "text-muted-foreground hover:surface-2 hover:text-foreground";
        return `
          <button class="w-full text-left px-2 py-2 rounded-sm cursor-pointer mb-0.5 transition" data-select="${training.localId}">
            <div class="text-[10px] font-mono font-medium truncate ${active}">${training.nome}</div>
            <div class="text-[9px] text-muted-foreground mt-0.5">${training.data} · ${training.exercicios?.length || 0} ex</div>
          </button>`;
      })
      .join("");
    ui.history.querySelectorAll("[data-select]").forEach((button) => {
      button.onclick = () => {
        state.selected = Number(button.dataset.select);
        render();
      };
    });
  }

  const training = state.list.find((item) => item.localId === state.selected);
  if (!training) {
    ui.empty.classList.remove("syn-hidden");
    ui.detail.classList.add("syn-hidden");
    ui.detail.innerHTML = "";
    return;
  }

  ui.empty.classList.add("syn-hidden");
  ui.detail.classList.remove("syn-hidden");
  if (training._elapsed == null) training._elapsed = training.duracao || 0;
  const running = Boolean(training._timer);

  const exercises = (training.exercicios || [])
    .map(
      (exercise, index) => `
        <div class="surface-2 rounded-sm border border-border p-3 panel-shadow">
          <div class="flex items-center justify-between text-xs font-mono">
            <span><span class="text-muted-foreground mr-1">${String(index + 1).padStart(2, "0")}. </span>${exercise.nome || "Exercício"}</span>
            <span class="text-[9px] text-muted-foreground">${exercise.sets?.length || 0} séries</span>
          </div>
          <div class="space-y-1.5 mt-3">
            ${(exercise.sets && exercise.sets.length ? exercise.sets : [{ reps: "", weight: "", type: "", rpe: "" }])
              .map(
                (set, idx) => `
                  <div class="grid grid-cols-4 gap-2 text-[10px] font-mono surface-1 border border-border rounded-sm px-2 py-1">
                    <span>Série ${String(idx + 1).padStart(2, "0")}</span>
                    <span>Reps: ${set.reps || "--"}</span>
                    <span>Peso: ${set.weight || "--"}</span>
                    <span>${set.type || "--"} • ${set.rpe || "--"}</span>
                  </div>`
              )
              .join("")}
          </div>
        </div>`
    )
    .join("") || '<p class="text-xs text-muted-foreground font-mono">Nenhum exercício registrado.</p>';

  ui.detail.innerHTML = `
    <div class="surface-2 rounded-sm border border-border p-4 panel-shadow">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-[10px] text-muted-foreground font-mono tracking-wider">${training.data}</p>
          <h2 class="text-lg font-bold text-foreground font-mono">${training.nome}</h2>
        </div>
        <div class="flex items-center gap-2">
          <span id="timer-${training.localId}" class="text-sm font-mono font-bold">${clock(training._elapsed)}</span>
          <button data-start class="text-[10px] font-mono font-bold px-3 py-1.5 rounded-sm cursor-pointer border">
            ${running ? "⏹ Parar" : "▶ Iniciar"}
          </button>
          <button data-edit class="text-[10px] font-mono px-3 py-1.5 rounded-sm cursor-pointer border border-border text-muted-foreground hover:text-foreground">Editar</button>
          <button data-delete class="text-[10px] font-mono px-3 py-1.5 rounded-sm cursor-pointer border" style="color:hsl(var(--alert));border-color:hsl(var(--alert)/0.5)">Excluir</button>
        </div>
      </div>
    </div>
    <div class="space-y-3">${exercises}</div>`;

  const startBtn = ui.detail.querySelector("[data-start]");
  if (startBtn) {
    startBtn.onclick = () => {
      if (training._timer) {
        clearInterval(training._timer);
        training._timer = null;
        training.duracao = training._elapsed || 0;
        training.status = "concluido";
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.list));
        render();
        showToast("Treino finalizado!");
        if (training.id_memoria) {
          const body = JSON.stringify({ conteudo: JSON.stringify({ treino_ex: { id: training.localId, date: training.data, exercicios: training.exercicios } }) });
          api(`/treinos/${training.id_memoria}`, { method: "PUT", body });
        }
        return;
      }
      training._elapsed = training.duracao || 0;
      training._timer = setInterval(() => {
        training._elapsed += 1;
        const label = document.getElementById(`timer-${training.localId}`);
        if (label) label.textContent = clock(training._elapsed);
      }, 1000);
      render();
      showToast("Treino iniciado!");
    };
  }

  const editBtn = ui.detail.querySelector("[data-edit]");
  if (editBtn) editBtn.onclick = () => openForm(training);

  const deleteBtn = ui.detail.querySelector("[data-delete]");
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      if (training._timer) {
        clearInterval(training._timer);
        training._timer = null;
      }
      const index = state.list.findIndex((item) => item.localId === training.localId);
      state.list.splice(index, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.list));
      state.selected = null;
      render();
      showToast("Treino removido!");
      if (training.id_memoria) api(`/treinos/${training.id_memoria}`, { method: "DELETE" });
    };
  }
};

const openForm = (training) => {
  state.draft = training
    ? JSON.parse(JSON.stringify({ nome: training.nome, data: training.data, exercicios: training.exercicios || [] }))
    : { nome: `Treino ${new Date().toISOString().slice(0, 10)}`, data: new Date().toISOString().slice(0, 10), exercicios: [] };
  state.editing = training ? training.localId : null;
  ui.detailSection.classList.add("syn-hidden");
  ui.create.classList.remove("syn-hidden");
  renderForm();
};

const closeForm = () => {
  state.draft = null;
  state.editing = null;
  ui.create.classList.add("syn-hidden");
  ui.detailSection.classList.remove("syn-hidden");
  render();
};

const renderForm = () => {
  if (!state.draft) return;
  ui.formName.value = state.draft.nome;
  ui.formDate.value = state.draft.data;
  if (!state.draft.exercicios.length) {
    ui.formExercises.innerHTML = '<p class="text-[11px] text-muted-foreground font-mono">Nenhum exercício adicionado.</p>';
    return;
  }

  ui.formExercises.innerHTML = state.draft.exercicios
    .map((exercise, index) => {
      if (!exercise.sets || !exercise.sets.length) exercise.sets = [newSet()];
      return `
        <div class="surface-1 rounded-sm border border-border p-3 panel-shadow">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-mono">${exercise.nome}</span>
            <button data-remove-ex="${index}" class="text-[10px] font-mono text-muted-foreground hover:text-alert">Remover</button>
          </div>
          <div class="space-y-2 mt-3">
            ${exercise.sets
              .map(
                (set, setIndex) => `
                  <div class="grid gap-2" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr))">
                    <input data-field="reps" data-ex="${index}" data-set="${setIndex}" class="bg-transparent border border-border rounded-sm px-2 py-1 text-[11px] font-mono" value="${set.reps}" />
                    <input data-field="weight" data-ex="${index}" data-set="${setIndex}" class="bg-transparent border border-border rounded-sm px-2 py-1 text-[11px] font-mono" value="${set.weight}" />
                    <select data-field="type" data-ex="${index}" data-set="${setIndex}" class="bg-transparent border border-border rounded-sm px-2 py-1 text-[11px] font-mono">
                      ${SET_TYPES.map((type) => `<option value="${type}" ${set.type === type ? "selected" : ""}>${type.toUpperCase()}</option>`).join("")}
                    </select>
                    <input data-field="rpe" data-ex="${index}" data-set="${setIndex}" class="bg-transparent border border-border rounded-sm px-2 py-1 text-[11px] font-mono" value="${set.rpe}" />
                  </div>`
              )
              .join('<div class="h-px surface-3"></div>')}
          </div>
          <button data-add-set="${index}" class="mt-3 text-[10px] font-mono px-3 py-1.5 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:surface-3 cursor-pointer">+ Série</button>
        </div>`;
    })
    .join("");

  ui.formExercises.querySelectorAll("[data-field]").forEach((input) => {
    input.oninput = () => {
      const ex = Number(input.dataset.ex);
      const set = Number(input.dataset.set);
      state.draft.exercicios[ex].sets[set][input.dataset.field] = input.value;
    };
  });
  ui.formExercises.querySelectorAll("[data-add-set]").forEach((button) => {
    button.onclick = () => {
      state.draft.exercicios[Number(button.dataset.addSet)].sets.push(newSet());
      renderForm();
    };
  });
  ui.formExercises.querySelectorAll("[data-remove-ex]").forEach((button) => {
    button.onclick = () => {
      state.draft.exercicios.splice(Number(button.dataset.removeEx), 1);
      renderForm();
    };
  });
};

const saveDraft = () => {
  if (!state.draft) return;
  const base = {
    nome: state.draft.nome || `Treino ${new Date().toISOString().slice(0, 10)}`,
    data: state.draft.data || new Date().toISOString().slice(0, 10),
    exercicios: state.draft.exercicios.map((exercise) => ({
      nome: exercise.nome || "Exercício",
      sets: exercise.sets && exercise.sets.length ? exercise.sets : [newSet()],
    })),
  };

  if (state.editing) {
    const existing = state.list.find((item) => item.localId === state.editing);
    if (!existing) return;
    Object.assign(existing, base);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.list));
    state.selected = existing.localId;
    closeForm();
    showToast("Treino atualizado!");
    sync(existing);
    return;
  }

  const training = { localId: Date.now(), id_memoria: null, duracao: null, status: "ativo", ...base };
  state.list.unshift(training);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.list));
  state.selected = training.localId;
  closeForm();
  showToast("Treino salvo!");
  sync(training);
};

const sync = (training) => {
  const body = JSON.stringify({ conteudo: JSON.stringify({ treino_ex: { id: training.localId, date: training.data, exercicios: training.exercicios } }) });
  const request = training.id_memoria
    ? api(`/treinos/${training.id_memoria}`, { method: "PUT", body })
    : api("/treinos", { method: "POST", body });
  request.then((data) => {
    if (data?.id_memoria) {
      training.id_memoria = data.id_memoria;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.list));
    }
  });
};

const showToast = (text) => {
  const el = document.createElement("div");
  el.className = "fixed bottom-5 right-5 z-50 surface-4 border border-border rounded-sm px-4 py-2 text-xs font-mono panel-shadow-lg";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
};

const closeOverlay = () => {
  pendingExercise = null;
  ui.overlay.style.display = "none";
  ui.overlay.classList.add("syn-hidden");
};

const init = () => {
  ui.history = document.getElementById("history-list");
  ui.detail = document.getElementById("training-detail");
  ui.detailSection = document.getElementById("detail-section");
  ui.empty = document.getElementById("empty-state");
  ui.create = document.getElementById("create-view");
  ui.formName = document.getElementById("create-name");
  ui.formDate = document.getElementById("create-date");
  ui.formExercises = document.getElementById("create-exercises");
  ui.overlay = document.getElementById("exercise-overlay");
  ui.exerciseInput = document.getElementById("exercise-name-input");

  document.getElementById("logout-btn").onclick = () => {
    markLogoutBackBlock();
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    window.location.href = ROUTES.login;
  };

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.onclick = () => {
      const route = button.dataset.route;
      window.location.href = ROUTES[route] || ROUTES.dashboard;
    };
  });

  if (Number(user.role_id ?? user.role_user) !== 1) {
    document.querySelectorAll("[data-admin-only]").forEach((el) => (el.style.display = "none"));
  }

  document.getElementById("btn-open-create").onclick = () => openForm();
  document.getElementById("btn-cancel-create").onclick = closeForm;
  document.getElementById("btn-save-create").onclick = saveDraft;
  document.getElementById("btn-add-exercise").onclick = () => {
    if (!state.draft) openForm();
    pendingExercise = (name) => {
      state.draft.exercicios.push({ nome: name || "Exercício", sets: [newSet()] });
      renderForm();
    };
    ui.overlay.classList.remove("syn-hidden");
    ui.overlay.style.display = "flex";
    ui.exerciseInput.value = "";
    ui.exerciseInput.focus();
  };

  ui.formName.oninput = () => { if (state.draft) state.draft.nome = ui.formName.value; };
  ui.formDate.oninput = () => { if (state.draft) state.draft.data = ui.formDate.value; };

  ui.overlay.onclick = (event) => { if (event.target === event.currentTarget) closeOverlay(); };
  document.getElementById("exercise-close").onclick = closeOverlay;
  document.getElementById("exercise-cancel").onclick = closeOverlay;
  document.getElementById("exercise-confirm").onclick = () => {
    if (pendingExercise) pendingExercise(ui.exerciseInput.value.trim() || "Exercício");
    closeOverlay();
  };
  document.querySelectorAll("[data-exercise-option]").forEach((button) => {
    button.onclick = () => { ui.exerciseInput.value = button.dataset.exerciseOption; };
  });

  render();
};

if (user) init();
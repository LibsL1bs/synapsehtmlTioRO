export type RequestSource = "system" | "admin" | "external";

type UserRole = "admin" | "user";

export interface SessionUser {
  id_user: number;
  nome: string;
  email: string;
  role?: UserRole;
  role_id?: number;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

interface ApiRequestOptions {
  source?: RequestSource;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  useFallbackAdmin?: boolean;
}

const ADMIN_FALLBACK_EMAIL = "synapse@adm.com";
const ADMIN_FALLBACK_PASSWORD = "12345678";
const API_PORT_START = Number(import.meta.env.VITE_API_PORT || 8000);
const API_PORT_SCAN_LIMIT = Number(import.meta.env.VITE_API_PORT_SCAN_LIMIT || 10);
const API_IDENTIFIER_HEADER = "X-Synapse-Api";

let fallbackAdminPromise: Promise<SessionUser> | null = null;
let detectedApiBaseUrl: string | null = null;

const buildApiBaseCandidates = (): string[] => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return [envUrl];

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return Array.from({ length: API_PORT_SCAN_LIMIT }, (_, index) => `${protocol}//${hostname}:${API_PORT_START + index}`);
  }

  return [`http://localhost:${API_PORT_START}`];
};

const getApiBaseCandidates = (): string[] => {
  const candidates = buildApiBaseCandidates();
  if (detectedApiBaseUrl) {
    return [detectedApiBaseUrl, ...candidates.filter((candidate) => candidate !== detectedApiBaseUrl)];
  }

  return candidates;
};

export const resolveApiBaseUrl = () => {
  if (detectedApiBaseUrl) return detectedApiBaseUrl;

  const [firstCandidate] = getApiBaseCandidates();
  if (firstCandidate) return firstCandidate;

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${API_PORT_START}`;
  }

  return `http://localhost:${API_PORT_START}`;
};

const performApiFetch = async (path: string, init: RequestInit): Promise<Response> => {
  const candidates = getApiBaseCandidates();
  const hasCustomApiUrl = Boolean(import.meta.env.VITE_API_URL);
  let lastFetchError: unknown = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, init);
      const isSynapseApi = hasCustomApiUrl || response.headers.get(API_IDENTIFIER_HEADER) === "true";

      if (!isSynapseApi) {
        continue;
      }

      detectedApiBaseUrl = baseUrl;
      return response;
    } catch (error) {
      lastFetchError = error;
    }
  }

  if (lastFetchError instanceof Error) {
    throw lastFetchError;
  }

  throw new Error("Não foi possível localizar a API em nenhuma porta disponível.");
};

const mapRoleIdToName = (roleId?: number): UserRole => {
  if (roleId === 1) return "admin";
  return "user";
};

export const normalizeUserRoleId = (user: SessionUser | null): number => {
  if (!user) return 2;
  if (user.role_id === 1 || user.role_id === 2) return user.role_id;
  return user.role === "admin" ? 1 : 2;
};

export const getStoredUser = (): SessionUser | null => {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionUser;
    const roleId = normalizeUserRoleId(parsed);
    return {
      ...parsed,
      role_id: roleId,
      role: mapRoleIdToName(roleId),
    };
  } catch {
    return null;
  }
};

export const saveStoredUser = (user: SessionUser, persist: boolean) => {
  const roleId = normalizeUserRoleId(user);
  const normalizedUser: SessionUser = {
    ...user,
    role_id: roleId,
    role: mapRoleIdToName(roleId),
  };

  if (persist) {
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    sessionStorage.removeItem("user");
    return;
  }

  sessionStorage.setItem("user", JSON.stringify(normalizedUser));
  localStorage.removeItem("user");
};

export const clearStoredUser = () => {
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
};

const getRequestSourceForUser = (user: SessionUser | null): RequestSource => {
  const roleId = normalizeUserRoleId(user);
  return roleId === 1 ? "admin" : "system";
};

const loginWithCredentials = async (email: string, password: string): Promise<SessionUser> => {
  const response = await performApiFetch("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || "Falha ao autenticar");
  }

  const payload = (await response.json()) as SessionUser;
  const roleId = normalizeUserRoleId(payload);
  return {
    ...payload,
    role_id: roleId,
    role: mapRoleIdToName(roleId),
  };
};

const ensureFallbackAdmin = async (): Promise<SessionUser> => {
  if (!fallbackAdminPromise) {
    fallbackAdminPromise = loginWithCredentials(ADMIN_FALLBACK_EMAIL, ADMIN_FALLBACK_PASSWORD)
      .finally(() => {
        fallbackAdminPromise = null;
      });
  }

  return fallbackAdminPromise;
};

const buildHeaders = (baseHeaders: HeadersInit | undefined, source: RequestSource, token?: string): Headers => {
  const headers = new Headers(baseHeaders || {});
  headers.set("X-Request-Source", source);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
};

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  const user = getStoredUser();
  let effectiveUser = user;

  const source = options.source || (user ? getRequestSourceForUser(user) : "external");

  if (options.requireAdmin) {
    const isStoredAdmin = normalizeUserRoleId(user) === 1;
    if (!isStoredAdmin && options.useFallbackAdmin) {
      effectiveUser = await ensureFallbackAdmin();
    }
  }

  const mustSendAuth = Boolean(options.requireAuth || options.requireAdmin);
  const authToken = effectiveUser?.access_token;

  if (mustSendAuth && !authToken) {
    throw new Error("Usuário não autenticado para esta operação.");
  }

  const headers = buildHeaders(init.headers, options.requireAdmin ? "admin" : source, authToken);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await performApiFetch(path, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Erro ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function loginUser(email: string, password: string): Promise<SessionUser> {
  return loginWithCredentials(email, password);
}

export async function registerUser(name: string, email: string, password: string): Promise<SessionUser> {
  return apiRequest<SessionUser>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    },
    {
      source: "admin",
      requireAuth: false,
    },
  );
}

export const isAdminUser = (user: SessionUser | null): boolean => normalizeUserRoleId(user) === 1;

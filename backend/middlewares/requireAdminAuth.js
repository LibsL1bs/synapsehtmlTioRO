import { getSessionByToken } from "../authSession.js";

const extractBearerToken = (authorizationHeader) => {
  const value = String(authorizationHeader || "").trim();
  if (!value.toLowerCase().startsWith("bearer ")) return "";
  return value.slice(7).trim();
};

const requireAdminAuth = (req, res, next) => {
  const authorization = req.header("Authorization");
  const requestSource = String(req.header("X-Request-Source") || "").toLowerCase();

  const accessToken = extractBearerToken(authorization);
  if (!accessToken) {
    return res.status(401).json({ error: "Header Authorization inválido ou ausente." });
  }

  if (requestSource !== "admin") {
    return res.status(403).json({ error: "Header X-Request-Source deve ser admin." });
  }

  const session = getSessionByToken(accessToken);
  if (!session) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }

  const roleId = Number(session.user?.role_id ?? session.user?.role_user);
  if (roleId !== 1) {
    return res.status(403).json({ error: "Acesso restrito a usuários admin." });
  }

  req.authUser = session.user;
  return next();
};

export default requireAdminAuth;
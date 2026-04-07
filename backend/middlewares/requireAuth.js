import { getSessionByToken } from "../authSession.js";

const extractBearerToken = (authorizationHeader) => {
  const value = String(authorizationHeader || "").trim();
  if (!value.toLowerCase().startsWith("bearer ")) return "";
  return value.slice(7).trim();
};

const requireAuth = (req, res, next) => {
  const authorization = req.header("Authorization");
  const accessToken = extractBearerToken(authorization);

  if (!accessToken) {
    return res.status(401).json({ error: "Header Authorization inválido ou ausente." });
  }

  const session = getSessionByToken(accessToken);
  if (!session) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }

  req.authUser = session.user;
  return next();
};

export default requireAuth;

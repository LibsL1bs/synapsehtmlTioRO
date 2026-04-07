import crypto from "node:crypto";

const SESSION_TTL_SECONDS = Number(process.env.AUTH_SESSION_TTL_SECONDS || 60 * 60 * 12);
const sessions = new Map();

const cleanupExpiredSessions = () => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
};

export const issueAccessSession = (user) => {
  cleanupExpiredSessions();
  const accessToken = crypto.randomBytes(32).toString("hex");
  const expiresIn = SESSION_TTL_SECONDS;
  const expiresAt = Date.now() + expiresIn * 1000;

  sessions.set(accessToken, {
    user,
    expiresAt,
  });

  return {
    accessToken,
    expiresIn,
  };
};

export const getSessionByToken = (accessToken) => {
  cleanupExpiredSessions();
  if (!accessToken) return null;

  const session = sessions.get(accessToken);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(accessToken);
    return null;
  }

  return session;
};
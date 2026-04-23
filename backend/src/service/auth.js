const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const {
  findUserByEmail, crearRefreshToken, findRefreshToken, eliminarRefreshToken,
  revocarToken,
} = require('../model/auth');

function buildPayload(user) {
  return {
    id: user.id || user.profile_id,
    email: user.email,
    role: user.role,
    base_id: user.base_id,
    turno: user.turno,
    nombre_completo: user.nombre_completo,
    legajo: user.legajo,
  };
}

async function login(email, password) {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) return null;

  // jti único por token — permite revocación individual
  const jti = uuidv4();
  const token = jwt.sign({ ...buildPayload(user), jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  const refreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await crearRefreshToken(user.id, refreshToken, expiresAt);

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      base_id: user.base_id,
      base_nombre: user.base_nombre,
      turno: user.turno,
      nombre_completo: user.nombre_completo,
      legajo: user.legajo,
    },
  };
}

async function refresh(refreshToken) {
  const record = await findRefreshToken(refreshToken);
  if (!record) return null;

  // Rotación: eliminar el token usado y emitir uno nuevo
  await eliminarRefreshToken(refreshToken);
  const nuevoRefreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await crearRefreshToken(record.profile_id, nuevoRefreshToken, expiresAt);

  const jti = uuidv4();
  const token = jwt.sign({ ...buildPayload(record), jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, refreshToken: nuevoRefreshToken };
}

async function logout(refreshToken, accessToken) {
  // 1. Invalidar refresh token
  if (refreshToken) await eliminarRefreshToken(refreshToken);

  // 2. Revocar access token por jti (aunque aún no haya expirado)
  if (accessToken) {
    try {
      // decode sin verificar firma — solo necesitamos el jti y exp
      const decoded = jwt.decode(accessToken);
      if (decoded?.jti && decoded?.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        await revocarToken(decoded.jti, expiresAt);
      }
    } catch {
      // Si el token es malformado, ignoramos — el refresh ya fue eliminado
    }
  }
}

module.exports = { login, refresh, logout };

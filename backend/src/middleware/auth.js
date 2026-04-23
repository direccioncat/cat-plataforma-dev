const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('../model/auth');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // Verificar que el token no haya sido revocado explícitamente (logout)
  // Solo tokens que incluyen jti (emitidos después de la actualización)
  if (decoded.jti) {
    try {
      if (await isTokenRevoked(decoded.jti)) {
        return res.status(401).json({ error: 'Token revocado' });
      }
    } catch (err) {
      console.error('[auth] Error al verificar revocación:', err.message);
      // Fail-open: si la DB no responde, dejamos pasar para no cortar el servicio
    }
  }

  req.user = decoded;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sin permisos para esta acción' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };

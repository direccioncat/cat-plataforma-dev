const { login, refresh, logout } = require('../service/auth');
const { loginSchema, refreshSchema } = require('../service/validaciones/auth');

async function postLogin(req, res) {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'Credenciales incorrectas' });

  try {
    const result = await login(value.email, value.password);
    if (!result) return res.status(401).json({ error: 'Credenciales incorrectas' });
    return res.json(result);
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postRefresh(req, res) {
  const { error, value } = refreshSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'Token requerido' });

  try {
    const result = await refresh(value.refreshToken);
    if (!result) return res.status(401).json({ error: 'Token inválido o expirado' });
    return res.json(result);
  } catch (err) {
    console.error('Error en refresh:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postLogout(req, res) {
  try {
    // Recibimos tanto el refreshToken (para eliminarlo) como el
    // access token (para revocarlo por jti antes de que expire)
    await logout(req.body.refreshToken, req.body.token);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en logout:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { postLogin, postRefresh, postLogout };

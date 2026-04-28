require('dotenv').config();

// ── Validación de variables críticas en startup ───────────────
const REQUIRED_ENV = ['JWT_SECRET', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Variable de entorno requerida no definida: ${key}`);
    process.exit(1);
  }
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const server = http.createServer(app);

const origenesPermitidos = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://cat-plataforma-dev.onrender.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origenesPermitidos.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: origenesPermitidos,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOADS_DIR || 'uploads')));

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',         require('./router/auth'));
app.use('/api/profiles',     require('./router/profiles'));
app.use('/api/bases',        require('./router/bases'));
app.use('/api/misiones',     require('./router/misiones'));
app.use('/api/os',           require('./router/os'));
app.use('/api/os-adicional',           require('./router/os_adicional'));
app.use('/api/servicios-adicionales',  require('./router/servicios_adicionales'));
app.use('/api/sanciones',              require('./router/sanciones'));
app.use('/api/presupuestos',           require('./router/presupuestos'));
app.use('/api/actividad',    require('./router/actividad'));
app.use('/api/upload',       require('./router/upload'));
app.use('/api/postular',     require('./router/postular'));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.set('io', io);

// ── Socket.io — autenticación en handshake ───────────────────
const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('./model/auth');

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Socket: token requerido'));
  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new Error('Socket: token inválido o expirado'));
  }
  if (user.jti) {
    try {
      if (await isTokenRevoked(user.jti)) return next(new Error('Socket: token revocado'));
    } catch { /* fail-open */ }
  }
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  console.log(`Socket conectado: ${socket.id} (user: ${socket.user?.id})`);
  socket.on('join:base', (base_id) => {
    // Solo permite unirse a la sala de la propia base del usuario
    if (base_id && base_id === socket.user?.base_id) {
      socket.join(`base:${base_id}`);
    }
  });
  socket.on('disconnect', () => {
    console.log('Socket desconectado:', socket.id);
  });
});

app.emitToBase = (base_id, evento, data) => {
  io.to(`base:${base_id}`).emit(evento, data);
};

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const pool = require('./db/pool');

async function limpiarTokensExpirados() {
  try {
    const r1 = await pool.query(`DELETE FROM refresh_tokens WHERE expires_at < NOW()`);
    if (r1.rowCount > 0) console.log(`[job] ${r1.rowCount} refresh token(s) expirado(s) eliminado(s)`);

    const r2 = await pool.query(`DELETE FROM revoked_tokens WHERE expires_at < NOW()`);
    if (r2.rowCount > 0) console.log(`[job] ${r2.rowCount} revoked token(s) expirado(s) eliminado(s)`);
  } catch (err) {
    console.error('[job] Error en limpiarTokensExpirados:', err.message);
  }
}

async function checkVigenciaCumplida() {
  try {
    const result = await pool.query(`
      UPDATE ordenes_servicio
      SET estado = 'cumplida', updated_at = NOW()
      WHERE estado = 'vigente'
        AND vigencia_fin IS NOT NULL
        AND vigencia_fin <= NOW()
      RETURNING numero, tipo
    `);
    if (result.rows.length > 0) {
      result.rows.forEach(os => {
        console.log(`[job] OS-${String(os.numero).padStart(3,'0')} (${os.tipo}) → cumplida automaticamente`);
      });
    }
  } catch (err) {
    console.error('[job] Error en checkVigenciaCumplida:', err.message);
  }
}

setInterval(checkVigenciaCumplida, 5 * 60 * 1000);
checkVigenciaCumplida();

// Pasar servicios adicionales a "en_curso" cuando arranca el primer turno
async function checkServiciosEnCurso() {
  try {
    const result = await pool.query(`
      UPDATE servicios_adicionales sa
      SET estado = 'en_curso', updated_at = NOW()
      WHERE sa.estado = 'convocado'
        AND EXISTS (
          SELECT 1 FROM sa_turnos t
          WHERE t.servicio_id = sa.id
            AND (t.fecha + t.hora_inicio) <= NOW()
        )
      RETURNING id, os_adicional_id
    `);
    if (result.rows.length > 0) {
      result.rows.forEach(r => {
        console.log(`[job] Servicio adicional #${r.id} → en_curso (primer turno iniciado)`);
      });
    }
  } catch (err) {
    console.error('[job] Error en checkServiciosEnCurso:', err.message);
  }
}

setInterval(checkServiciosEnCurso, 60 * 1000); // cada minuto
checkServiciosEnCurso();

// Limpiar refresh tokens expirados cada hora
setInterval(limpiarTokensExpirados, 60 * 60 * 1000);
limpiarTokensExpirados();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\ncat-api corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Base de datos: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}\n`);
});

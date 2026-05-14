const pool = require('../db/pool');

// ── OS Adicional ──────────────────────────────────────────────
async function getLista({ esGlobal, base_id }) {
  const { rows } = await pool.query(
    'SELECT oa.*, b.nombre AS base_nombre, p.nombre_completo AS creado_por_nombre,' +
    ' s.numero_servicio, pr.numero AS presupuesto_numero,' +
    " COALESCE(json_agg(DISTINCT oaf.fecha ORDER BY oaf.fecha) FILTER (WHERE oaf.fecha IS NOT NULL),'[]') AS fechas," +
    ' COUNT(DISTINCT t.id) AS total_turnos, COUNT(DISTINCT fases.id) AS total_fases, COUNT(DISTINCT el.id) AS total_elementos' +
    ' FROM os_adicional oa LEFT JOIN bases b ON b.id = oa.base_id LEFT JOIN profiles p ON p.id = oa.creado_por' +
    ' LEFT JOIN servicios s ON s.id = oa.servicio_id' +
    ' LEFT JOIN presupuestos pr ON pr.id = s.presupuesto_id' +
    ' LEFT JOIN os_adicional_fechas oaf ON oaf.os_adicional_id = oa.id' +
    ' LEFT JOIN os_adicional_turnos t ON t.os_adicional_id = oa.id' +
    ' LEFT JOIN os_adicional_fases fases ON fases.os_adicional_id = oa.id' +
    ' LEFT JOIN os_adicional_elementos el ON el.fase_id = fases.id' +
    (!esGlobal ? ' WHERE oa.base_id = $1' : '') +
    ' GROUP BY oa.id, b.nombre, p.nombre_completo, s.numero_servicio, pr.numero ORDER BY oa.created_at DESC',
    !esGlobal ? [base_id] : []
  );
  return rows;
}

async function getById(id) {
  const { rows: [oa] } = await pool.query(
    'SELECT oa.*, b.nombre AS base_nombre, p.nombre_completo AS creado_por_nombre,' +
    ' s.numero_servicio, pr.numero AS presupuesto_numero, pr.beneficiario AS presupuesto_beneficiario' +
    ' FROM os_adicional oa LEFT JOIN bases b ON b.id = oa.base_id LEFT JOIN profiles p ON p.id = oa.creado_por' +
    ' LEFT JOIN servicios s ON s.id = oa.servicio_id' +
    ' LEFT JOIN presupuestos pr ON pr.id = s.presupuesto_id' +
    ' WHERE oa.id = $1', [id]
  );
  if (!oa) return null;
  const [fechas, recursos, turnos, fases] = await Promise.all([
    pool.query('SELECT * FROM os_adicional_fechas WHERE os_adicional_id = $1 ORDER BY fecha', [id]),
    pool.query('SELECT * FROM os_adicional_recursos WHERE os_adicional_id = $1 ORDER BY tipo', [id]),
    pool.query('SELECT * FROM os_adicional_turnos WHERE os_adicional_id = $1 ORDER BY fecha NULLS LAST, hora_inicio, orden', [id]),
    pool.query('SELECT * FROM os_adicional_fases WHERE os_adicional_id = $1 ORDER BY orden, created_at', [id]),
  ]);
  const fasesConElementos = await Promise.all(fases.rows.map(async (fase) => {
    const { rows: elementos } = await pool.query('SELECT * FROM os_adicional_elementos WHERE fase_id = $1 ORDER BY created_at', [fase.id]);
    return { ...fase, elementos };
  }));
  return {
    ...oa,
    fechas: fechas.rows,
    recursos: recursos.rows,
    turnos: turnos.rows.map(t => ({ ...t, fases: fasesConElementos.filter(f => f.turno_id === t.id) })),
    fases: fasesConElementos,
    fases_sin_turno: fasesConElementos.filter(f => !f.turno_id),
  };
}

async function crear(client, { nombre, evento_motivo, base, creado_por, horario_desde, horario_hasta, dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones, fechas, recursos, servicio_id }) {
  const { rows: [oa] } = await client.query(
    'INSERT INTO os_adicional (nombre, evento_motivo, base_id, creado_por, horario_desde, horario_hasta, dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones, servicio_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
    [nombre, evento_motivo, base, creado_por, horario_desde, horario_hasta, dotacion_agentes || 0, dotacion_supervisores || 0, dotacion_motorizados || 0, observaciones, servicio_id || null]
  );
  for (const f of fechas) await client.query('INSERT INTO os_adicional_fechas (os_adicional_id, fecha) VALUES ($1,$2)', [oa.id, f]);
  for (const r of recursos) await client.query('INSERT INTO os_adicional_recursos (os_adicional_id, tipo, cantidad, descripcion) VALUES ($1,$2,$3,$4)', [oa.id, r.tipo, r.cantidad, r.descripcion || null]);
  return oa;
}

async function actualizar(id, data) {
  const { nombre, evento_motivo, horario_desde, horario_hasta, dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones } = data;
  const { rows: [oa] } = await pool.query(
    'UPDATE os_adicional SET nombre=COALESCE($1,nombre), evento_motivo=COALESCE($2,evento_motivo), horario_desde=COALESCE($3,horario_desde), horario_hasta=COALESCE($4,horario_hasta), dotacion_agentes=COALESCE($5,dotacion_agentes), dotacion_supervisores=COALESCE($6,dotacion_supervisores), dotacion_motorizados=COALESCE($7,dotacion_motorizados), observaciones=COALESCE($8,observaciones), updated_at=NOW() WHERE id=$9 RETURNING *',
    [nombre, evento_motivo, horario_desde, horario_hasta, dotacion_agentes, dotacion_supervisores, dotacion_motorizados, observaciones, id]
  );
  return oa || null;
}

async function cambiarEstado(id, estado) {
  const { rows: [oa] } = await pool.query('UPDATE os_adicional SET estado=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [estado, id]);
  return oa || null;
}

async function enviarValidacion(client, id) {
  // Permite enviar a validacion desde borrador O desde requiere_revision
  const { rows: [oa] } = await client.query(
    "UPDATE os_adicional SET estado='validacion', updated_at=NOW() WHERE id=$1 AND estado IN ('borrador','requiere_revision') RETURNING *",
    [id]
  );
  return oa || null;
}

async function validar(client, id, userId) {
  const { rows: [oa] } = await client.query("UPDATE os_adicional SET estado='validada', validado_por=$1, validado_at=NOW(), updated_at=NOW() WHERE id=$2 AND estado='validacion' RETURNING *", [userId, id]);
  return oa || null;
}

async function rechazar(client, id, userId, obs_rechazo) {
  const { rows: [oa] } = await client.query("UPDATE os_adicional SET estado='rechazada', validado_por=$1, validado_at=NOW(), obs_rechazo=$2, updated_at=NOW() WHERE id=$3 AND estado='validacion' RETURNING *", [userId, obs_rechazo || null, id]);
  return oa || null;
}

async function eliminar(id) {
  // DELETE atómico — elimina solo si está en borrador, evita TOCTOU
  const { rowCount } = await pool.query("DELETE FROM os_adicional WHERE id = $1 AND estado = 'borrador'", [id]);
  if (rowCount) return { ok: true };
  const check = await pool.query('SELECT id FROM os_adicional WHERE id = $1', [id]);
  if (!check.rows[0]) return { notFound: true };
  return { badState: true };
}

// ── Servicio adicional (validación) ──────────────────────────
async function crearServicioAdicional(client, { os_adicional_id, userId, oa, calcularModulosSync }) {
  // 1) SA ya existe para esta OS → re-validación → merge inteligente de turnos
  const existe = await client.query('SELECT * FROM servicios_adicionales WHERE os_adicional_id = $1', [os_adicional_id]);
  if (existe.rows[0]) {
    await mergeOsTurnosEnSA(client, { sa_id: existe.rows[0].id, os_id: os_adicional_id, calcularModulosSync });
    return existe.rows[0];
  }

  // 2) SA directo (creado desde el Servicio) → re-vincular a la OS
  let sa;
  if (oa.servicio_id) {
    const directa = await client.query(
      'SELECT id FROM servicios_adicionales WHERE servicio_id = $1 AND os_adicional_id IS NULL LIMIT 1',
      [oa.servicio_id]
    );
    if (directa.rows[0]) {
      const { rows: [updated] } = await client.query(
        'UPDATE servicios_adicionales SET os_adicional_id=$1, servicio_id=NULL, updated_at=NOW() WHERE id=$2 RETURNING *',
        [os_adicional_id, directa.rows[0].id]
      );
      sa = updated;
      console.log(`[os_adicional] SA directo ${sa.id} re-vinculado a OS ${os_adicional_id}`);
    }
  }

  // 3) Nada existía → crear SA desde cero
  if (!sa) {
    const { rows: [nuevo] } = await client.query(
      'INSERT INTO servicios_adicionales (os_adicional_id, creado_por) VALUES ($1,$2) RETURNING *',
      [os_adicional_id, userId]
    );
    sa = nuevo;
  }

  // 4) Primera vez → insertar turnos con os_turno_id para tracking futuro
  const turnosExistentes = await client.query('SELECT COUNT(*) AS n FROM sa_turnos WHERE servicio_id = $1', [sa.id]);
  if (parseInt(turnosExistentes.rows[0].n) === 0) {
    const turnosOS = await client.query(
      'SELECT * FROM os_adicional_turnos WHERE os_adicional_id = $1 ORDER BY fecha NULLS LAST, hora_inicio, orden',
      [os_adicional_id]
    );
    for (const t of turnosOS.rows) {
      const conduccion = (t.dotacion_supervisores || 0) + (t.dotacion_coordinadores || 0) + (t.dotacion_jefes_operativo || 0);
      const choferes   = (t.dotacion_choferes || 0) + (t.dotacion_choferes_gruas || 0);
      await client.query(
        `INSERT INTO sa_turnos
           (servicio_id, nombre, fecha, hora_inicio, hora_fin, modulos,
            dotacion_agentes, dotacion_supervisores, dotacion_choferes,
            dotacion_motorizados, orden, os_turno_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [sa.id, t.nombre || null, t.fecha, t.hora_inicio, t.hora_fin,
         calcularModulosSync(t.hora_inicio, t.hora_fin),
         t.dotacion_agentes || 0, conduccion, choferes,
         t.dotacion_motorizados || 0, t.orden, t.id]
      );
    }
    if (turnosOS.rows.length === 0) {
      for (const r of [
        { rol: 'infante',     cantidad: oa.dotacion_agentes      || 0 },
        { rol: 'supervisor',  cantidad: oa.dotacion_supervisores || 0 },
        { rol: 'motorizado',  cantidad: oa.dotacion_motorizados  || 0 },
      ].filter(x => x.cantidad > 0)) {
        await client.query('INSERT INTO sa_requerimientos (servicio_id, rol, cantidad) VALUES ($1,$2,$3)', [sa.id, r.rol, r.cantidad]);
      }
    } else {
      // Sincronizar os_adicional_fechas desde los turnos reales (primera validación)
      const fechas = [...new Set(
        turnosOS.rows.filter(t => t.fecha).map(t => (t.fecha instanceof Date ? t.fecha.toISOString().slice(0, 10) : String(t.fecha).slice(0, 10)))
      )];
      await client.query('DELETE FROM os_adicional_fechas WHERE os_adicional_id = $1', [os_adicional_id]);
      for (const f of fechas) {
        await client.query('INSERT INTO os_adicional_fechas (os_adicional_id, fecha) VALUES ($1,$2)', [os_adicional_id, f]);
      }
    }
  }

  return sa;
}

// Convierte un valor de fecha (Date object o string) a 'YYYY-MM-DD' de forma segura
function toDateStr(fecha) {
  if (!fecha) return null;
  if (fecha instanceof Date) return fecha.toISOString().slice(0, 10);
  return String(fecha).slice(0, 10);
}

// ── Merge inteligente de turnos en re-validación ──────────────
async function mergeOsTurnosEnSA(client, { sa_id, os_id, calcularModulosSync }) {
  // Guard: SA debe existir y no estar cerrada
  const saCheck = await client.query("SELECT estado FROM servicios_adicionales WHERE id=$1", [sa_id]);
  if (!saCheck.rows[0]) {
    console.warn(`[mergeOsTurnosEnSA] SA ${sa_id} no existe — merge omitido`);
    return { conflictos: [] };
  }
  if (saCheck.rows[0].estado === 'cerrado') {
    console.warn(`[mergeOsTurnosEnSA] SA ${sa_id} está cerrada — merge omitido`);
    return { conflictos: [] };
  }

  // Leer max_modulos_dia desde config
  const cfgR = await client.query("SELECT valor FROM sa_scoring_config WHERE clave='max_modulos_dia'");
  const maxModulosDia = parseInt(cfgR.rows[0]?.valor || '2');

  // Turnos actuales de la OS
  const { rows: turnosOS } = await client.query(
    'SELECT * FROM os_adicional_turnos WHERE os_adicional_id=$1 ORDER BY fecha NULLS LAST, hora_inicio, orden',
    [os_id]
  );
  const turnosOSById = Object.fromEntries(turnosOS.map(t => [t.id, t]));

  // Turnos actuales del SA
  const { rows: turnosSA } = await client.query('SELECT * FROM sa_turnos WHERE servicio_id=$1', [sa_id]);

  const conflictos = [];

  // 0. Retrocompatibilidad: turnos sin os_turno_id (creados antes de la columna)
  //    → intentar matchear por fecha + hora_inicio; si no matchean, son huérfanos → borrar
  const reclamados = new Set(turnosSA.filter(t => t.os_turno_id).map(t => t.os_turno_id)); // pre-poblar con ids ya vinculados
  for (const st of turnosSA.filter(t => !t.os_turno_id)) {
    const fechaSt = toDateStr(st.fecha);
    const match = turnosOS.find(ot => {
      return toDateStr(ot.fecha) === fechaSt && ot.hora_inicio === st.hora_inicio && !reclamados.has(ot.id);
    });
    if (match) {
      // Match encontrado → asignar os_turno_id retroactivamente
      await client.query('UPDATE sa_turnos SET os_turno_id=$1 WHERE id=$2', [match.id, st.id]);
      st.os_turno_id = match.id; // mutar local para los pasos siguientes
      reclamados.add(match.id);
    } else {
      // Sin match → huérfano o duplicado → liberar postulantes y borrar
      await client.query('DELETE FROM sa_postulante_turnos WHERE turno_id=$1', [st.id]);
      await client.query('DELETE FROM sa_turnos WHERE id=$1', [st.id]);
      console.log(`[merge] Turno SA huérfano ${st.id} eliminado (sin match en OS)`);
    }
  }

  // 1. Turnos ELIMINADOS de la OS (tienen os_turno_id pero ya no existe en OS) → borrar y liberar postulantes
  //    Si el turno eliminado tenía postulantes asignados → registrar como conflicto para que el usuario lo sepa
  const turnosSAVivos = turnosSA.filter(st => st.os_turno_id); // los sin os_turno_id ya fueron procesados arriba
  for (const st of turnosSAVivos) {
    if (!turnosOSById[st.os_turno_id]) {
      // Verificar si tenía postulantes asignados antes de borrar
      const { rows: [cntDelR] } = await client.query(
        'SELECT COUNT(*) AS n FROM sa_postulante_turnos WHERE turno_id=$1', [st.id]
      );
      const asignadosEnTurnoEliminado = parseInt(cntDelR.n);
      // Siempre registrar turno eliminado como conflicto (con o sin postulantes)
      {
        const { rows: postulantesEliminados } = asignadosEnTurnoEliminado > 0
          ? await client.query(`
              SELECT pr.nombre_completo
                FROM sa_postulante_turnos pt
                JOIN sa_postulantes sp ON sp.id = pt.postulante_id
                LEFT JOIN profiles pr ON pr.id = sp.agente_id
               WHERE pt.turno_id = $1
              LIMIT 5
            `, [st.id])
          : { rows: [] };
        conflictos.push({
          turno_id: st.id,
          nombre: st.nombre || toDateStr(st.fecha) || `Turno eliminado`,
          eliminado: true,
          problemas: [{
            tipo: 'turno_eliminado',
            asignados: asignadosEnTurnoEliminado,
            postulantes: postulantesEliminados.map(p => p.nombre_completo),
          }],
        });
        console.log(`[merge] Turno SA ${st.id} eliminado con ${asignadosEnTurnoEliminado} postulante(s) — registrado como conflicto`);
      }
      await client.query('DELETE FROM sa_postulante_turnos WHERE turno_id=$1', [st.id]);
      await client.query('DELETE FROM sa_turnos WHERE id=$1', [st.id]);
      console.log(`[merge] Turno SA ${st.id} eliminado (OS turno ${st.os_turno_id} ya no existe)`);
    }
  }

  // Refrescar SA turns tras todas las eliminaciones
  const { rows: turnosSAActuales } = await client.query('SELECT * FROM sa_turnos WHERE servicio_id=$1', [sa_id]);
  const saTurnosByOsTurnoId = Object.fromEntries(
    turnosSAActuales.filter(t => t.os_turno_id).map(t => [t.os_turno_id, t])
  );

  // 2. Turnos NUEVOS o MODIFICADOS en la OS
  for (const ot of turnosOS) {
    const conduccion = (ot.dotacion_supervisores || 0) + (ot.dotacion_coordinadores || 0) + (ot.dotacion_jefes_operativo || 0);
    const choferes   = (ot.dotacion_choferes || 0) + (ot.dotacion_choferes_gruas || 0);
    const modulosNuevos  = calcularModulosSync(ot.hora_inicio, ot.hora_fin);
    const dotacionNueva  = ot.dotacion_agentes || 0;
    const st = saTurnosByOsTurnoId[ot.id];

    if (!st) {
      // Turno nuevo → crear vacío y registrar como aviso para que SSAA lo sepa
      await client.query(
        `INSERT INTO sa_turnos
           (servicio_id, nombre, fecha, hora_inicio, hora_fin, modulos,
            dotacion_agentes, dotacion_supervisores, dotacion_choferes,
            dotacion_motorizados, orden, os_turno_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [sa_id, ot.nombre || null, ot.fecha, ot.hora_inicio, ot.hora_fin, modulosNuevos,
         dotacionNueva, conduccion, choferes, ot.dotacion_motorizados || 0, ot.orden, ot.id]
      );
      conflictos.push({
        nombre: ot.nombre || toDateStr(ot.fecha) || `Turno nuevo`,
        problemas: [{ tipo: 'turno_nuevo', dotacion: dotacionNueva, fecha: toDateStr(ot.fecha) }],
      });
    } else {
      // Turno existente → actualizar + detectar conflictos
      const problemas = [];

      // Exceso de dotación
      const { rows: [cntR] } = await client.query(
        'SELECT COUNT(*) AS n FROM sa_postulante_turnos WHERE turno_id=$1', [st.id]
      );
      const asignados = parseInt(cntR.n);
      if (asignados > dotacionNueva) {
        problemas.push({ tipo: 'exceso_dotacion', asignados, dotacion_nueva: dotacionNueva });
      }

      // Exceso de módulos diarios (solo si los módulos aumentaron)
      if (modulosNuevos > (st.modulos || 0)) {
        const { rows: postulantes } = await client.query(`
          SELECT sp.agente_id, pr.nombre_completo
            FROM sa_postulante_turnos pt
            JOIN sa_postulantes sp ON sp.id = pt.postulante_id
            LEFT JOIN profiles pr ON pr.id = sp.agente_id
           WHERE pt.turno_id = $1
        `, [st.id]);

        for (const ag of postulantes) {
          const { rows: [sumR] } = await client.query(`
            SELECT COALESCE(SUM(st2.modulos), 0) AS total
              FROM sa_postulante_turnos ptt
              JOIN sa_turnos st2 ON st2.id = ptt.turno_id
              JOIN sa_postulantes sp2 ON sp2.id = ptt.postulante_id
             WHERE sp2.agente_id = $1 AND sp2.servicio_id = $2
               AND ptt.turno_id != $3
               AND DATE(st2.fecha) = DATE($4::date)
          `, [ag.agente_id, sa_id, st.id, ot.fecha]);

          const totalDia = parseInt(sumR.total) + modulosNuevos;
          if (totalDia > maxModulosDia) {
            problemas.push({
              tipo: 'exceso_modulos_dia',
              agente_id: ag.agente_id,
              agente_nombre: ag.nombre_completo,
              modulos_dia: totalDia,
              max: maxModulosDia,
            });
          }
        }
      }

      if (problemas.length > 0) {
        conflictos.push({ turno_id: st.id, nombre: ot.nombre || ot.fecha, problemas });
      }

      // Aplicar cambios al SA turn
      await client.query(`
        UPDATE sa_turnos SET
          nombre=$1, fecha=$2, hora_inicio=$3, hora_fin=$4, modulos=$5,
          dotacion_agentes=$6, dotacion_supervisores=$7,
          dotacion_choferes=$8, dotacion_motorizados=$9, updated_at=NOW()
        WHERE id=$10
      `, [ot.nombre || null, ot.fecha, ot.hora_inicio, ot.hora_fin, modulosNuevos,
          dotacionNueva, conduccion, choferes, ot.dotacion_motorizados || 0, st.id]);
    }
  }

  // Sincronizar os_adicional_fechas con las fechas reales de los turnos actuales de la OS
  // Esto evita que SADetalle muestre fechas obsoletas tras eliminar turnos
  // Usamos toDateStr() para convertir correctamente Date objects → 'YYYY-MM-DD'
  const fechasDesdeOSTurnos = [...new Set(
    turnosOS.filter(t => t.fecha).map(t => toDateStr(t.fecha))
  )];
  await client.query('DELETE FROM os_adicional_fechas WHERE os_adicional_id=$1', [os_id]);
  for (const f of fechasDesdeOSTurnos) {
    await client.query(
      'INSERT INTO os_adicional_fechas (os_adicional_id, fecha) VALUES ($1,$2)',
      [os_id, f]
    );
  }
  console.log(`[merge] OS ${os_id}: fechas sincronizadas → [${fechasDesdeOSTurnos.join(', ')}]`);

  // Guardar conflictos en el SA
  await client.query(
    'UPDATE servicios_adicionales SET conflictos_revision=$1, updated_at=NOW() WHERE id=$2',
    [conflictos.length > 0 ? JSON.stringify(conflictos) : null, sa_id]
  );

  console.log(`[merge] OS ${os_id} → SA ${sa_id}: ${turnosOS.length} turnos OS, ${conflictos.length} conflictos`);
  return conflictos;
}

// ── Actividad ─────────────────────────────────────────────────
async function registrarActividad(client, { base_id, agente_id, tipo, descripcion, metadata }) {
  try {
    await client.query('INSERT INTO actividad (base_id, agente_id, tipo, descripcion, metadata) VALUES ($1,$2,$3,$4,$5)', [base_id, agente_id, tipo, descripcion, JSON.stringify(metadata || {})]);
  } catch (e) { console.warn('Error registrando actividad:', e.message); }
}

// ── Turnos OS ─────────────────────────────────────────────────
async function getTurnos(osId) {
  const { rows } = await pool.query('SELECT t.*, (SELECT COUNT(*) FROM os_adicional_fases f WHERE f.turno_id = t.id) AS total_fases FROM os_adicional_turnos t WHERE t.os_adicional_id = $1 ORDER BY t.fecha NULLS LAST, t.hora_inicio, t.orden', [osId]);
  return rows;
}

async function crearTurno(osId, data) {
  const { nombre, fecha, hora_inicio, hora_fin, dotacion_agentes, dotacion_supervisores, dotacion_optes, dotacion_choferes, dotacion_motorizados, dotacion_choferes_gruas, dotacion_coordinadores } = data;
  const ord = await pool.query('SELECT COUNT(*) AS n FROM os_adicional_turnos WHERE os_adicional_id = $1', [osId]);
  const { rows: [t] } = await pool.query(
    'INSERT INTO os_adicional_turnos (os_adicional_id, nombre, fecha, hora_inicio, hora_fin, dotacion_agentes, dotacion_supervisores, dotacion_choferes, dotacion_motorizados, dotacion_choferes_gruas, dotacion_coordinadores, orden) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
    [osId, nombre || null, fecha || null, hora_inicio || null, hora_fin || null, dotacion_agentes || 0, dotacion_supervisores || 0, dotacion_choferes || 0, dotacion_motorizados || 0, dotacion_choferes_gruas || 0, dotacion_coordinadores || 0, parseInt(ord.rows[0].n)]
  );
  return t;
}

async function actualizarTurno(turnoId, body) {
  const CAMPOS = ['nombre','fecha','hora_inicio','hora_fin','dotacion_agentes','dotacion_supervisores','dotacion_choferes','dotacion_motorizados','dotacion_choferes_gruas','dotacion_coordinadores','orden'];
  const fields = [], params = [];
  for (const c of CAMPOS) { if (body[c] !== undefined) { params.push(body[c]); fields.push(c + ' = $' + params.length); } }
  if (!fields.length) return null;
  params.push(new Date()); fields.push('updated_at = $' + params.length);
  params.push(turnoId);
  const { rows: [t] } = await pool.query('UPDATE os_adicional_turnos SET ' + fields.join(', ') + ' WHERE id = $' + params.length + ' RETURNING *', params);
  return t || null;
}

async function eliminarTurno(turnoId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Desvincular SA turns que apuntan a este turno OS → quedan huérfanos, el próximo merge los limpia
    await client.query('UPDATE sa_turnos SET os_turno_id = NULL WHERE os_turno_id = $1', [turnoId]);
    await client.query('UPDATE os_adicional_fases SET turno_id = NULL WHERE turno_id = $1', [turnoId]);
    await client.query('DELETE FROM os_adicional_turnos WHERE id = $1', [turnoId]);
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

// ── Fases ─────────────────────────────────────────────────────
const COLORES_FASE = ['#e24b4a','#f5c800','#4ecdc4','#8b5cf6','#f97316','#22c55e'];

async function crearFase(osId, data) {
  const { nombre, horario_desde, horario_hasta, color, orden, fecha, turno_id } = data;
  const { rows: [count] } = await pool.query('SELECT COUNT(*) FROM os_adicional_fases WHERE os_adicional_id = $1', [osId]);
  const colorAuto = COLORES_FASE[parseInt(count.count) % COLORES_FASE.length];
  const { rows: [fase] } = await pool.query(
    'INSERT INTO os_adicional_fases (os_adicional_id, nombre, horario_desde, horario_hasta, color, orden, fecha, turno_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [osId, nombre, horario_desde || null, horario_hasta || null, color || colorAuto, orden || parseInt(count.count), fecha || null, turno_id || null]
  );
  return fase;
}

async function duplicarFase(client, faseId) {
  const { rows: [original] } = await client.query('SELECT * FROM os_adicional_fases WHERE id = $1', [faseId]);
  if (!original) return null;
  const { rows: elementos } = await client.query('SELECT * FROM os_adicional_elementos WHERE fase_id = $1', [faseId]);
  const { rows: [countRow] } = await client.query('SELECT COUNT(*) FROM os_adicional_fases WHERE os_adicional_id = $1', [original.os_adicional_id]);
  const colorSiguiente = COLORES_FASE[parseInt(countRow.count) % COLORES_FASE.length];
  const { rows: [nuevaFase] } = await client.query(
    'INSERT INTO os_adicional_fases (os_adicional_id, turno_id, nombre, horario_desde, horario_hasta, color, orden, fecha) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [original.os_adicional_id, original.turno_id, original.nombre + ' (copia)', original.horario_desde || null, original.horario_hasta || null, colorSiguiente, parseInt(countRow.count), original.fecha || null]
  );
  for (const el of elementos) {
    let geometria = el.geometria;
    try { const geo = typeof geometria === 'string' ? JSON.parse(geometria) : geometria; if (geo?.style) geo.style.color = colorSiguiente; if (geo?.options) geo.options.color = colorSiguiente; geometria = JSON.stringify(geo); } catch (e) {}
    await client.query('INSERT INTO os_adicional_elementos (fase_id, tipo, nombre, instruccion, geometria) VALUES ($1,$2,$3,$4,$5)', [nuevaFase.id, el.tipo, el.nombre, el.instruccion, geometria]);
  }
  const { rows: elsNuevos } = await client.query('SELECT * FROM os_adicional_elementos WHERE fase_id = $1', [nuevaFase.id]);
  return { ...nuevaFase, elementos: elsNuevos };
}

async function moverFase(faseId, turno_id) {
  const { rows: [fase] } = await pool.query('UPDATE os_adicional_fases SET turno_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [turno_id || null, faseId]);
  return fase || null;
}

async function actualizarFase(faseId, body) {
  const CAMPOS = ['nombre','horario_desde','horario_hasta','color','orden','fecha','turno_id'];
  const NULABLES = ['fecha','horario_desde','horario_hasta','turno_id'];
  const fields = [], params = [];
  for (const campo of CAMPOS) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      const val = NULABLES.includes(campo) && body[campo] === '' ? null : (body[campo] ?? null);
      params.push(val); fields.push(campo + ' = $' + params.length);
    }
  }
  if (!fields.length) return null;
  params.push(new Date()); fields.push('updated_at = $' + params.length);
  params.push(faseId);
  const { rows: [fase] } = await pool.query('UPDATE os_adicional_fases SET ' + fields.join(', ') + ' WHERE id = $' + params.length + ' RETURNING *', params);
  return fase || null;
}

async function eliminarFase(faseId) { await pool.query('DELETE FROM os_adicional_fases WHERE id = $1', [faseId]); }

// ── Elementos ─────────────────────────────────────────────────
async function crearElemento(faseId, data) {
  const { tipo, nombre, instruccion, geometria } = data;
  const { rows: [el] } = await pool.query('INSERT INTO os_adicional_elementos (fase_id, tipo, nombre, instruccion, geometria) VALUES ($1,$2,$3,$4,$5) RETURNING *', [faseId, tipo, nombre || null, instruccion || null, JSON.stringify(geometria)]);
  return el;
}

async function actualizarElemento(elId, { nombre, instruccion, geometria }) {
  const { rows: [el] } = await pool.query('UPDATE os_adicional_elementos SET nombre=COALESCE($1,nombre), instruccion=COALESCE($2,instruccion), geometria=COALESCE($3,geometria), updated_at=NOW() WHERE id=$4 RETURNING *', [nombre, instruccion, geometria ? JSON.stringify(geometria) : null, elId]);
  return el || null;
}

async function eliminarElemento(elId) { await pool.query('DELETE FROM os_adicional_elementos WHERE id = $1', [elId]); }

// ── Recursos ──────────────────────────────────────────────────
async function sincronizarRecursos(osId, recursos) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM os_adicional_recursos WHERE os_adicional_id = $1', [osId]);
    for (const r of recursos) {
      await client.query(
        'INSERT INTO os_adicional_recursos (os_adicional_id, tipo, cantidad, descripcion, categoria) VALUES ($1,$2,$3,$4,$5)',
        [osId, r.tipo, r.cantidad || 0, r.descripcion || null, r.categoria || 'elemento']
      );
    }
    await client.query('COMMIT');
    const { rows } = await pool.query('SELECT * FROM os_adicional_recursos WHERE os_adicional_id = $1 ORDER BY categoria, tipo', [osId]);
    return rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getLista, getById, crear, actualizar, cambiarEstado, enviarValidacion, validar, rechazar, eliminar, crearServicioAdicional, mergeOsTurnosEnSA, registrarActividad, getTurnos, crearTurno, actualizarTurno, eliminarTurno, crearFase, duplicarFase, moverFase, actualizarFase, eliminarFase, crearElemento, actualizarElemento, eliminarElemento, sincronizarRecursos };

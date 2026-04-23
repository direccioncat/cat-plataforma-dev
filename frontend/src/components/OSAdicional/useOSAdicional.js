/**
 * useOSAdicional.js — v3
 * + Soporte de turnos (os_adicional_turnos)
 * + duplicarFase, moverFase entre turnos
 */
import { useState, useCallback } from 'react'
import api from '../../lib/api'

export function useOSAdicional(osInicial) {
  const [os,       setOS]       = useState(osInicial || null)
  const [turnos,   setTurnos]   = useState(osInicial?.turnos   || [])
  const [fases,    setFases]    = useState(osInicial?.fases    || [])
  const [recursos, setRecursos] = useState(osInicial?.recursos || [])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  const cargar = useCallback(async (id) => {
    try {
      const data = await api.get('/api/os-adicional/' + id)
      setOS(data)
      setTurnos(data.turnos || [])
      setFases(data.fases   || [])
      setRecursos(data.recursos || [])
      return data
    } catch (e) { setError(e.message); return null }
  }, [])

  const actualizarCabecera = useCallback(async (campos) => {
    if (!os?.id) return
    setSaving(true)
    try {
      const updated = await api.put('/api/os-adicional/' + os.id, campos)
      setOS(prev => ({ ...prev, ...updated }))
    } catch (e) { setError(e.message) }
    setSaving(false)
  }, [os?.id])

  const cambiarEstado = useCallback(async (estado) => {
    if (!os?.id) return
    setSaving(true)
    try {
      const updated = await api.post('/api/os-adicional/' + os.id + '/estado', { estado })
      setOS(prev => ({ ...prev, estado: updated.estado }))
    } catch (e) { setError(e.message) }
    setSaving(false)
  }, [os?.id])

  // ── Turnos ────────────────────────────────────────────────────

  const crearTurno = useCallback(async (datos) => {
    if (!os?.id) return null
    try {
      const turno = await api.post('/api/os-adicional/' + os.id + '/turnos', datos)
      setTurnos(prev => [...prev, { ...turno, fases: [] }])
      return turno
    } catch (e) { setError(e.message); return null }
  }, [os?.id])

  const editarTurno = useCallback(async (turnoId, datos) => {
    try {
      const updated = await api.put('/api/os-adicional/turnos/' + turnoId, datos)
      setTurnos(prev => prev.map(t => t.id === turnoId ? { ...t, ...updated } : t))
      return updated
    } catch (e) { setError(e.message); return null }
  }, [])

  const eliminarTurno = useCallback(async (turnoId) => {
    try {
      await api.delete('/api/os-adicional/turnos/' + turnoId)
      setTurnos(prev => prev.filter(t => t.id !== turnoId))
      // Desvincular fases que pertenecían a este turno
      setFases(prev => prev.map(f => f.turno_id === turnoId ? { ...f, turno_id: null } : f))
    } catch (e) { setError(e.message) }
  }, [])

  // ── Fases ─────────────────────────────────────────────────────

  const crearFase = useCallback(async (datos) => {
    if (!os?.id) return null
    try {
      const fase = await api.post('/api/os-adicional/' + os.id + '/fases', datos)
      setFases(prev => [...prev, { ...fase, elementos: [] }])
      return fase
    } catch (e) { setError(e.message); return null }
  }, [os?.id])

  const eliminarFase = useCallback(async (faseId) => {
    try {
      await api.delete('/api/os-adicional/fases/' + faseId)
      setFases(prev => prev.filter(f => f.id !== faseId))
    } catch (e) { setError(e.message) }
  }, [])

  const duplicarFase = useCallback(async (faseId) => {
    try {
      const nuevaFase = await api.post('/api/os-adicional/fases/' + faseId + '/duplicar', {})
      setFases(prev => [...prev, { ...nuevaFase, elementos: nuevaFase.elementos || [] }])
      return nuevaFase
    } catch (e) { setError(e.message); return null }
  }, [])

  const moverFase = useCallback(async (faseId, turnoId) => {
    try {
      const updated = await api.patch('/api/os-adicional/fases/' + faseId + '/mover', { turno_id: turnoId || null })
      setFases(prev => prev.map(f => f.id === faseId ? { ...f, turno_id: updated.turno_id } : f))
    } catch (e) { setError(e.message) }
  }, [])

  // ── Elementos ─────────────────────────────────────────────────

  const crearElemento = useCallback(async (faseId, datos) => {
    try {
      const el = await api.post('/api/os-adicional/fases/' + faseId + '/elementos', datos)
      setFases(prev => prev.map(f =>
        f.id !== faseId ? f : { ...f, elementos: [...(f.elementos || []), el] }
      ))
      return el
    } catch (e) { setError(e.message); return null }
  }, [])

  const actualizarElemento = useCallback(async (elId, faseId, datos) => {
    try {
      const updated = await api.put('/api/os-adicional/elementos/' + elId, datos)
      setFases(prev => prev.map(f =>
        f.id !== faseId ? f : { ...f, elementos: (f.elementos || []).map(e => e.id === elId ? { ...e, ...updated } : e) }
      ))
    } catch (e) { setError(e.message) }
  }, [])

  const eliminarElemento = useCallback(async (elId, faseId) => {
    try {
      await api.delete('/api/os-adicional/elementos/' + elId)
      setFases(prev => prev.map(f =>
        f.id !== faseId ? f : { ...f, elementos: (f.elementos || []).filter(e => e.id !== elId) }
      ))
    } catch (e) { setError(e.message) }
  }, [])

  const actualizarRecursos = useCallback((nuevos) => setRecursos(nuevos), [])

  return {
    os, turnos, fases, recursos, saving, error,
    cargar,
    actualizarCabecera, cambiarEstado,
    crearTurno, editarTurno, eliminarTurno,
    crearFase, eliminarFase, duplicarFase, moverFase,
    crearElemento, actualizarElemento, eliminarElemento,
    actualizarRecursos,
    setOS, setTurnos, setFases, setRecursos,
  }
}

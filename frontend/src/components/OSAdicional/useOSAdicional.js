/**
 * useOSAdicional.js — v2
 * Modelo nuevo: elementos van directo a la fase (sin zonas)
 */
import { useState, useCallback } from 'react'
import api from '../../lib/api'

export function useOSAdicional(osInicial) {
  const [os,       setOS]       = useState(osInicial || null)
  const [fases,    setFases]    = useState(osInicial?.fases || [])
  const [recursos, setRecursos] = useState(osInicial?.recursos || [])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  const cargar = useCallback(async (id) => {
    try {
      const data = await api.get(`/api/os-adicional/${id}`)
      setOS(data)
      setFases(data.fases || [])
      setRecursos(data.recursos || [])
      return data
    } catch (e) { setError(e.message); return null }
  }, [])

  const actualizarCabecera = useCallback(async (campos) => {
    if (!os?.id) return
    setSaving(true)
    try {
      const updated = await api.put(`/api/os-adicional/${os.id}`, campos)
      setOS(prev => ({ ...prev, ...updated }))
    } catch (e) { setError(e.message) }
    setSaving(false)
  }, [os?.id])

  const cambiarEstado = useCallback(async (estado) => {
    if (!os?.id) return
    setSaving(true)
    try {
      const updated = await api.post(`/api/os-adicional/${os.id}/estado`, { estado })
      setOS(prev => ({ ...prev, estado: updated.estado }))
    } catch (e) { setError(e.message) }
    setSaving(false)
  }, [os?.id])

  // FASES
  const crearFase = useCallback(async (datos) => {
    if (!os?.id) return null
    try {
      const fase = await api.post(`/api/os-adicional/${os.id}/fases`, datos)
      setFases(prev => [...prev, { ...fase, elementos: [] }])
      return fase
    } catch (e) { setError(e.message); return null }
  }, [os?.id])

  const eliminarFase = useCallback(async (faseId) => {
    try {
      await api.delete(`/api/os-adicional/fases/${faseId}`)
      setFases(prev => prev.filter(f => f.id !== faseId))
    } catch (e) { setError(e.message) }
  }, [])

  // ELEMENTOS
  const crearElemento = useCallback(async (faseId, datos) => {
    try {
      const el = await api.post(`/api/os-adicional/fases/${faseId}/elementos`, datos)
      setFases(prev => prev.map(f =>
        f.id !== faseId ? f : { ...f, elementos: [...(f.elementos || []), el] }
      ))
      return el
    } catch (e) { setError(e.message); return null }
  }, [])

  const actualizarElemento = useCallback(async (elId, faseId, datos) => {
    try {
      const updated = await api.put(`/api/os-adicional/elementos/${elId}`, datos)
      setFases(prev => prev.map(f =>
        f.id !== faseId ? f : {
          ...f,
          elementos: (f.elementos || []).map(e => e.id === elId ? { ...e, ...updated } : e)
        }
      ))
    } catch (e) { setError(e.message) }
  }, [])

  const eliminarElemento = useCallback(async (elId, faseId) => {
    try {
      await api.delete(`/api/os-adicional/elementos/${elId}`)
      setFases(prev => prev.map(f =>
        f.id !== faseId ? f : { ...f, elementos: (f.elementos || []).filter(e => e.id !== elId) }
      ))
    } catch (e) { setError(e.message) }
  }, [])

  const actualizarRecursos = useCallback((nuevos) => setRecursos(nuevos), [])

  return {
    os, fases, recursos, saving, error,
    cargar,
    actualizarCabecera, cambiarEstado,
    crearFase, eliminarFase,
    crearElemento, actualizarElemento, eliminarElemento,
    actualizarRecursos,
    setOS, setFases, setRecursos,
  }
}

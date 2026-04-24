/**
 * Roles operativos — se usan en SS.AA. (postulantes, estructura, convocatoria,
 * presentismo, armado) y deben coincidir con las columnas de dotación de OS Adicional.
 *
 * dotacion_agentes        → infante
 * dotacion_supervisores   → supervisor
 * dotacion_choferes       → chofer
 * dotacion_motorizados    → motorizado
 * dotacion_choferes_gruas → chofer_grua
 * dotacion_coordinadores  → coordinador
 */

export const ROLES_OPERATIVOS = {
  infante:     { label: 'Infante',          color: '#0F6E56', bg: '#E1F5EE', dot: '#1D9E75', pill: '#6EE7B7' },
  supervisor:  { label: 'Supervisor',       color: '#3C3489', bg: '#EEEDFE', dot: '#7F77DD', pill: '#C7D2FE' },
  chofer:      { label: 'Chofer',           color: '#5F5E5A', bg: '#F1EFE8', dot: '#888780', pill: '#D1D5DB' },
  motorizado:  { label: 'Motorizado',       color: '#993C1D', bg: '#FAECE7', dot: '#D85A30', pill: '#FCD34D' },
  chofer_grua: { label: 'Chofer de grúa',   color: '#4F46E5', bg: '#EEF2FF', dot: '#818CF8', pill: '#C7D2FE' },
  coordinador: { label: 'Coordinador',      color: '#993556', bg: '#FBEAF0', dot: '#D4537E', pill: '#F9A8D4' },
}

// Array ordenado para selects y filtros
export const ROLES_OPERATIVOS_LIST = Object.entries(ROLES_OPERATIVOS).map(([value, cfg]) => ({
  value,
  ...cfg,
}))

// Keys válidas (para validación en el CSV import)
export const ROLES_OPERATIVOS_KEYS = Object.keys(ROLES_OPERATIVOS)

/**
 * api.js — cliente HTTP para cat-api
 * Reemplaza al cliente de Supabase
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function getToken() {
  return sessionStorage.getItem('cat_token')
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const config = { method, headers }
  if (body) config.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, config)

  // Token expirado → limpiar sesión
  if (res.status === 401) {
    sessionStorage.removeItem('cat_token')
    sessionStorage.removeItem('cat_refresh_token')
    sessionStorage.removeItem('cat_user')
    window.dispatchEvent(new Event('cat:session_expired'))
  }

  const data = await res.json()
  if (!res.ok) throw { status: res.status, message: data.error || 'Error del servidor' }
  return data
}

const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  put:    (path, body)   => request('PUT',    path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  delete: (path)         => request('DELETE', path),

  // Upload con FormData (no JSON)
  upload: async (path, formData) => {
    const headers = {}
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw { status: res.status, message: data.error || 'Error al subir archivo' }
    return data
  },
}

export default api

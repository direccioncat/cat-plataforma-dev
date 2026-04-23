import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function useSocket(base_id) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!base_id) return

    const token = sessionStorage.getItem('cat_token')
    const socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token },          // JWT requerido por el middleware de Socket.io
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join:base', base_id)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [base_id])

  return socketRef
}

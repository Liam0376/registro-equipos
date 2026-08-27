import { useCallback, useEffect, useRef, useState } from 'react'
import type { State, Student, Team } from '../types'

const CACHE_KEY = 'registro-equipos:cache'

/**
 * Data model persisted client-side, so even if the server is briefly
 * unreachable (or the built page is opened via file://) the last known
 * teams and students still show up. The server remains the source of truth.
 */
function readCache(): State {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p.teams) && Array.isArray(p.students)) {
        return { teams: p.teams, students: p.students }
      }
    }
  } catch {
    // ignore malformed cache
  }
  return { teams: [], students: [] }
}

/**
 * Detect where the WebSocket server is.
 *
 * - Vite dev server runs on :5173, WebSocket server on :3002 → use localhost:3002
 * - Production: server serves both HTTP and WS on the same port → use current host:port
 */
function getWsUrl(): string {
  const loc = window.location
  if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
    return 'ws://localhost:3002'
  }
  const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${loc.hostname}:${loc.port || '3002'}`
}

export type RegisterResult =
  | { ok: true; student: Student; team: Team }
  | { ok: false; message: string }

/**
 * Hook that connects to the registro server via WebSocket and exposes
 * actions for registering students and managing teams.
 */
export function useRegistro() {
  const [state, setState] = useState<State>(readCache)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef(new Map<string, (r: RegisterResult) => void>())
  const seqRef = useRef(0)

  // ── Connect ────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    let reconnectTimer: ReturnType<typeof setTimeout>

    function apply(data: { teams: Team[]; students: Student[] }) {
      setState({ teams: data.teams, students: data.students })
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      } catch {
        // storage may be unavailable (private mode)
      }
    }

    function connect() {
      if (!alive) return
      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'init' || msg.type === 'update') {
            apply({ teams: msg.teams, students: msg.students })
          } else if (msg.type === 'registered' && msg.reqId) {
            const resolve = pendingRef.current.get(msg.reqId)
            if (resolve) {
              pendingRef.current.delete(msg.reqId)
              resolve({ ok: true, student: msg.student, team: msg.team })
            }
          } else if (msg.type === 'error' && msg.reqId) {
            const resolve = pendingRef.current.get(msg.reqId)
            if (resolve) {
              pendingRef.current.delete(msg.reqId)
              resolve({ ok: false, message: msg.message })
            }
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (!alive) return
        reconnectTimer = setTimeout(connect, 2000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      alive = false
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────
  const send = useCallback((msg: object) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }, [])

  // ── Actions ────────────────────────────────────────────────────────
  const register = useCallback(
    (data: {
      matricula: string
      name: string
      carrera: string
      semestre: number
    }): Promise<RegisterResult> => {
      return new Promise((resolve) => {
        const reqId = `r${++seqRef.current}`
        pendingRef.current.set(reqId, resolve)
        send({ type: 'registerStudent', reqId, ...data })
        window.setTimeout(() => {
          if (pendingRef.current.delete(reqId)) {
            resolve({ ok: false, message: 'Sin conexión con el servidor.' })
          }
        }, 5000)
      })
    },
    [send],
  )

  const addTeam = useCallback(
    (name: string, color: string) => send({ type: 'addTeam', name, color }),
    [send],
  )

  const removeTeam = useCallback(
    (id: string) => send({ type: 'removeTeam', teamId: id }),
    [send],
  )

  const unregister = useCallback(
    (id: string) => send({ type: 'unregisterStudent', studentId: id }),
    [send],
  )

  const resetAll = useCallback(() => send({ type: 'resetAll' }), [send])

  const resetTeams = useCallback(() => send({ type: 'resetTeams' }), [send])

  return {
    teams: state.teams,
    students: state.students,
    connected,
    register,
    addTeam,
    removeTeam,
    unregister,
    resetAll,
    resetTeams,
  }
}
import { createServer } from 'http'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { networkInterfaces } from 'os'
import { execSync } from 'child_process'
import { WebSocketServer, WebSocket } from 'ws'

// ─── Paths ───────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = resolve(__dirname, 'data.json')
const DIST_DIR = resolve(__dirname, 'dist')

// ─── Auto-build if dist/ is missing ──────────────────────────────────
if (!existsSync(DIST_DIR) || !existsSync(resolve(DIST_DIR, 'index.html'))) {
  console.log('  ⏳ dist/ no encontrado — construyendo...')
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' })
}

// ─── Data model ──────────────────────────────────────────────────────
type Team = { id: string; name: string; color: string }
type Student = {
  id: string
  matricula: string
  name: string
  carrera: string
  semestre: number
  teamId: string
  number: number
  registeredAt: string
}

type State = { teams: Team[]; students: Student[]; lastTeamId: string | null }

const SEED_TEAMS: Team[] = [
  { id: crypto.randomUUID(), name: 'Rojo', color: '#ef4444' },
  { id: crypto.randomUUID(), name: 'Azul', color: '#3b82f6' },
  { id: crypto.randomUUID(), name: 'Verde', color: '#22c55e' },
  { id: crypto.randomUUID(), name: 'Amarillo', color: '#eab308' },
]

let state: State = {
  teams: [...SEED_TEAMS],
  students: [],
  lastTeamId: null,
}

async function loadData() {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = await readFile(DATA_FILE, 'utf-8')
      const parsed = JSON.parse(raw)
      if (
        parsed &&
        Array.isArray(parsed.teams) &&
        Array.isArray(parsed.students)
      ) {
        state = {
          teams: parsed.teams,
          students: parsed.students,
          lastTeamId: parsed.lastTeamId ?? null,
        }
      }
    }
  } catch {
    console.log('  No se pudo leer data.json — usando datos de ejemplo')
  }
}

async function saveData() {
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2))
}

// ─── Team assignment ─────────────────────────────────────────────────
/**
 * Auto-asigna al equipo con MENOS integrantes (equilibra equipos).
 * Entre equipos empatados elige el que hace más turnos que no fue elegido
 * (rotación), para no favorecer siempre al primero de la lista.
 */
function pickTeam(): Team {
  if (state.teams.length === 0) throw new Error('no-teams')
  const counts = state.teams.map(
    (t) => state.students.filter((s) => s.teamId === t.id).length,
  )
  const min = Math.min(...counts)
  const lastIdx = state.teams.findIndex((t) => t.id === state.lastTeamId)
  let best: Team | null = null
  let bestKey = Infinity

  for (let i = 0; i < state.teams.length; i++) {
    if (counts[i] !== min) continue
    const key = (i - lastIdx + state.teams.length) % state.teams.length
    if (key < bestKey) {
      bestKey = key
      best = state.teams[i]
    }
  }
  return best!
}

// ─── Validation ──────────────────────────────────────────────────────
const HEX_COLOR = /^#[0-9a-f]{6}$/i

type StudentInput = {
  matricula: string
  name: string
  carrera: string
  semestre: number
}

function validateStudent(msg: {
  matricula?: unknown
  name?: unknown
  carrera?: unknown
  semestre?: unknown
}): { ok: true; data: StudentInput } | { ok: false; message: string } {
  const matricula = typeof msg.matricula === 'string' ? msg.matricula.trim() : ''
  const name = typeof msg.name === 'string' ? msg.name.trim() : ''
  const carrera = typeof msg.carrera === 'string' ? msg.carrera.trim() : ''
  const semestre = Number(msg.semestre)

  if (!matricula) return { ok: false, message: 'Falta la matrícula.' }
  if (name.length < 2) return { ok: false, message: 'El nombre es muy corto.' }
  if (!carrera) return { ok: false, message: 'Falta la carrera.' }
  if (!Number.isInteger(semestre) || semestre < 1 || semestre > 12) {
    return { ok: false, message: 'El semestre debe ser un número del 1 al 12.' }
  }
  return { ok: true, data: { matricula, name, carrera, semestre } }
}

// ─── HTTP server (serves dist/) ──────────────────────────────────────
const http = createServer(async (req, res) => {
  // Status endpoint — useful for debugging. Solo accesible desde localhost
  // para que la red no pueda inspeccionar el servidor.
  if (req.url === '/status') {
    if (!isLocal(req.socket.remoteAddress)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ teams: state.teams.length, students: state.students.length, ok: true }))
    return
  }

  // Serve static files from dist/
  let filePath = resolve(DIST_DIR, req.url === '/' ? 'index.html' : req.url!)
  if (!existsSync(filePath)) {
    filePath = resolve(DIST_DIR, 'index.html') // SPA fallback
  }
  try {
    const content = await readFile(filePath)
    const ext = filePath.split('.').pop() || 'html'
    const types: Record<string, string> = {
      html: 'text/html',
      js: 'application/javascript',
      css: 'text/css',
      json: 'application/json',
      svg: 'image/svg+xml',
      png: 'image/png',
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

// ─── WebSocket server ────────────────────────────────────────────────
const wss = new WebSocketServer({ server: http })

// Clientes de localhost reciben el estado COMPLETO (equipos + estudiantes).
// Los clientes de la red solo ven equipos y contadores por equipo: se les
// ocultan los datos personales de los estudiantes (únicamente reciben su
// propia inscripción). Nadie de la red puede modificar nada (ver ADMIN_ACTIONS).
const localClients = new Map<WebSocket, boolean>()

function teamCounts(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const t of state.teams) counts[t.id] = 0
  for (const s of state.students) counts[s.teamId] = (counts[s.teamId] ?? 0) + 1
  return counts
}

function fullStateMsg(type: 'init' | 'update') {
  return { type, teams: state.teams, students: state.students }
}

function publicStateMsg(type: 'init' | 'update') {
  return { type, teams: state.teams, teamCounts: teamCounts() }
}

function broadcast() {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      const local = localClients.get(client) ?? false
      client.send(JSON.stringify(local ? fullStateMsg('update') : publicStateMsg('update')))
    }
  }
}

function sendTo(ws: WebSocket, msg: object) {
  ws.send(JSON.stringify(msg))
}

function nextStudentNumber(): number {
  return state.students.reduce((max, s) => Math.max(max, s.number), 0) + 1
}

wss.on('connection', (ws, req) => {
  const local = isLocal(req.socket.remoteAddress)
  localClients.set(ws, local)
  console.log(`  + Cliente conectado (${wss.clients.size} total)${local ? ' [localhost]' : ''}`)

  // Send current state immediately (completo en localhost, público en la red)
  sendTo(ws, local ? fullStateMsg('init') : publicStateMsg('init'))

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      const reqId = typeof msg.reqId === 'string' ? msg.reqId : undefined

      if (ADMIN_ACTIONS.includes(msg.type) && !isLocal(req.socket.remoteAddress)) {
        sendTo(ws, {
          type: 'error',
          reqId,
          message: 'Acción solo permitida desde localhost.',
        })
        return
      }

      switch (msg.type) {
        case 'registerStudent': {
          if (state.teams.length === 0) {
            sendTo(ws, {
              type: 'error',
              reqId,
              message: 'Aún no hay equipos configurados. Andá a Administración.',
            })
            break
          }
          const check = validateStudent(msg)
          if (!check.ok) {
            sendTo(ws, { type: 'error', reqId, message: check.message })
            break
          }
          const { matricula, name, carrera, semestre } = check.data
          const team = pickTeam()
          const student: Student = {
            id: crypto.randomUUID(),
            matricula,
            name,
            carrera,
            semestre,
            teamId: team.id,
            number: nextStudentNumber(),
            registeredAt: new Date().toISOString(),
          }
          state.students.push(student)
          state.lastTeamId = team.id
          await saveData()
          broadcast()
          sendTo(ws, { type: 'registered', reqId, student, team })
          console.log(`  ✓ ${name} (${matricula}) → ${team.name}`)
          break
        }

        case 'addTeam': {
          const name = typeof msg.name === 'string' ? msg.name.trim() : ''
          const color = typeof msg.color === 'string' ? msg.color : ''
          if (!name || !HEX_COLOR.test(color)) {
            sendTo(ws, { type: 'error', reqId, message: 'Nombre o color inválidos.' })
            break
          }
          state.teams.push({ id: crypto.randomUUID(), name, color })
          await saveData()
          broadcast()
          break
        }

        case 'removeTeam': {
          const team = state.teams.find((t) => t.id === msg.teamId)
          if (!team) break
          const members = state.students.filter((s) => s.teamId === team.id).length
          if (members > 0) {
            sendTo(ws, {
              type: 'error',
              reqId,
              message: `No se puede eliminar "${team.name}": tiene ${members} estudiante(s). Desregistralos antes.`,
            })
            break
          }
          state.teams = state.teams.filter((t) => t.id !== team.id)
          if (state.lastTeamId === team.id) state.lastTeamId = null
          await saveData()
          broadcast()
          break
        }

        case 'unregisterStudent': {
          const before = state.students.length
          state.students = state.students.filter((s) => s.id !== msg.studentId)
          if (state.students.length !== before) {
            await saveData()
            broadcast()
          }
          break
        }

        case 'resetAll': {
          state.students = []
          state.lastTeamId = null
          await saveData()
          broadcast()
          break
        }

        case 'resetTeams': {
          state.teams = SEED_TEAMS.map((t) => ({ ...t }))
          state.students = []
          state.lastTeamId = null
          await saveData()
          broadcast()
          break
        }

        default:
          console.log('  Mensaje desconocido:', msg.type)
      }
    } catch (err) {
      console.error('  Error procesando mensaje:', err)
    }
  })

  ws.on('close', () => {
    localClients.delete(ws)
    console.log(`  - Cliente desconectado (${wss.clients.size} total)`)
  })
})

// ─── Access control ──────────────────────────────────────────────────
// Acciones de administración: solo desde la computadora que corre el
// servidor (localhost). Los estudiantes se registran desde cualquier
// dispositivo de la red (registerStudent), pero no pueden gestionar.
const ADMIN_ACTIONS = ['addTeam', 'removeTeam', 'unregisterStudent', 'resetAll', 'resetTeams']

function isLocal(addr: string | undefined): boolean {
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
}

// ─── Start ───────────────────────────────────────────────────────────
// Puerto 3002 por defecto para poder correr a la par de scoreboard
// (que usa el 3001). Configurable con la variable de entorno PORT.
const PORT = Number(process.env.PORT) || 3002

await loadData()

http.listen(PORT, '0.0.0.0', () => {
  // Show local network IP so other devices can connect
  const nets = Object.values(networkInterfaces())
    .flat()
    .filter((n): n is NonNullable<typeof n> => !!n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address)

  console.log('')
  console.log('  ┌─────────────────────────────────────────────┐')
  console.log('  │      Registro de Equipos — Servidor         │')
  console.log('  ├─────────────────────────────────────────────┤')
  console.log(`  │  Local:    http://localhost:${PORT}           │`)
  if (nets.length > 0) {
    console.log(`  │  Red:      http://${nets[0]}:${PORT}  │`)
  }
  console.log('  │                                             │')
  console.log('  │  Los estudiantes entran a la portada        │')
  console.log('  │  y se les asigna equipo automáticamente.    │')
  console.log('  └─────────────────────────────────────────────┘')
  console.log('')
})
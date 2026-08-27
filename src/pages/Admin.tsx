import { useState } from 'react'
import { useRegistro } from '../hooks/useRegistro'

const DEFAULT_COLOR = '#8b5cf6'

export function Admin() {
  const { teams, students, addTeam, removeTeam, unregister, resetAll, resetTeams } =
    useRegistro()
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const membersOf = (teamId: string) =>
    students.filter((s) => s.teamId === teamId).length

  function handleAddTeam(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed.length < 2) return
    addTeam(trimmed, color)
    setName('')
    setColor(DEFAULT_COLOR)
  }

  const studentsSorted = [...students].sort(
    (a, b) => a.number - b.number,
  )

  const inputClass =
    'rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-neutral-500'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold text-white">Administración</h1>

      {/* ── Teams ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-200">Equipos</h2>

        <form
          onSubmit={handleAddTeam}
          className="flex flex-wrap items-end gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-5"
        >
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm text-neutral-400 mb-1">
              Nombre del equipo
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Rojo"
              className={`w-full ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 rounded-lg bg-neutral-800 border border-neutral-700"
            />
          </div>
          <button
            type="submit"
            className="h-10 px-5 rounded-lg bg-white text-neutral-900 font-semibold"
          >
            Agregar equipo
          </button>
        </form>

        <div className="space-y-2">
          {teams.map((t) => {
            const members = membersOf(t.id)
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3"
              >
                <span
                  className="inline-block rounded-full shrink-0"
                  style={{ width: 14, height: 14, background: t.color }}
                />
                <span className="flex-1 font-medium text-white">{t.name}</span>
                <span className="font-mono text-neutral-400">
                  {members} miembro{members === 1 ? '' : 's'}
                </span>
                <button
                  onClick={() => removeTeam(t.id)}
                  disabled={members > 0}
                  title={
                    members > 0
                      ? 'No se puede eliminar un equipo que ya tiene estudiantes.'
                      : 'Eliminar equipo'
                  }
                  className="text-neutral-500 hover:text-red-400 px-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-neutral-500"
                  aria-label={`Eliminar equipo ${t.name}`}
                >
                  ✕
                </button>
              </div>
            )
          })}
          {teams.length === 0 && (
            <p className="text-neutral-500">
              No hay equipos. Agregá el primero arriba.
            </p>
          )}
        </div>
      </section>

      {/* ── Students ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-200">
          Estudiantes registrados ({students.length})
        </h2>

        <div className="space-y-2">
          {studentsSorted.map((s) => {
            const team = teams.find((t) => t.id === s.teamId)
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3"
              >
                <span className="font-mono text-neutral-500 w-10 shrink-0">
                  #{String(s.number).padStart(3, '0')}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-white truncate">{s.name}</span>
                  <span className="block text-xs text-neutral-500 truncate">
                    {s.matricula} · {s.carrera} · {s.semestre}º
                  </span>
                </span>
                {team && (
                  <span className="inline-flex items-center gap-2 text-sm">
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{ width: 10, height: 10, background: team.color }}
                    />
                    <span className="text-neutral-300">{team.name}</span>
                  </span>
                )}
                <button
                  onClick={() => unregister(s.id)}
                  className="text-neutral-500 hover:text-red-400 px-2"
                  aria-label={`Eliminar registro de ${s.name}`}
                >
                  ✕
                </button>
              </div>
            )
          })}
          {students.length === 0 && (
            <p className="text-neutral-500">
              Todavía no hay estudiantes registrados.
            </p>
          )}
        </div>
      </section>

      {/* ── Danger zone ───────────────────────────────────────────── */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-lg font-semibold text-neutral-200">Zona de riesgo</h2>

        {!confirmClear ? (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-red-400 hover:text-red-300 font-medium"
          >
            Eliminar todos los estudiantes
          </button>
        ) : (
          <ConfirmRow
            message="¿Borrar todos los registros? No se pueden recuperar."
            onConfirm={() => {
              resetAll()
              setConfirmClear(false)
            }}
            onCancel={() => setConfirmClear(false)}
          />
        )}

        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="text-neutral-400 hover:text-red-300 font-medium"
          >
            Restaurar equipos de ejemplo (Rojo/Azul/Verde/Amarillo)
          </button>
        ) : (
          <ConfirmRow
            message="Esto borra los estudiantes y deja solo los 4 equipos de ejemplo. ¿Continuar?"
            onConfirm={() => {
              resetTeams()
              setConfirmReset(false)
            }}
            onCancel={() => setConfirmReset(false)}
          />
        )}
      </section>
    </div>
  )
}

function ConfirmRow({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-neutral-200">{message}</span>
      <button
        onClick={onConfirm}
        className="px-4 py-1.5 rounded-lg bg-red-500 text-white font-semibold"
      >
        Sí, continuar
      </button>
      <button
        onClick={onCancel}
        className="px-4 py-1.5 rounded-lg bg-neutral-800 text-neutral-300"
      >
        Cancelar
      </button>
    </div>
  )
}
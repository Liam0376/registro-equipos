import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRegistro } from '../hooks/useRegistro'
import type { Student, Team } from '../types'

const SEMESTRES = Array.from({ length: 12 }, (_, i) => i + 1)

export function Registro() {
  const { teams, teamCounts, connected, register } = useRegistro()
  const [form, setForm] = useState({
    matricula: '',
    name: '',
    carrera: '',
    semestre: 1,
  })
  const [result, setResult] = useState<{
    student: Student
    team: Team
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const distribution = useMemo(
    () =>
      teams.map((t) => ({
        team: t,
        count: teamCounts[t.id] ?? 0,
      })),
    [teams, teamCounts],
  )

  const total = useMemo(
    () => teams.reduce((sum, t) => sum + (teamCounts[t.id] ?? 0), 0),
    [teams, teamCounts],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)

    if (!form.matricula.trim()) {
      setError('Falta la matrícula.')
      return
    }
    if (form.name.trim().length < 2) {
      setError('El nombre es muy corto.')
      return
    }
    if (!form.carrera.trim()) {
      setError('Falta la carrera.')
      return
    }

    setSubmitting(true)
    const res = await register({
      matricula: form.matricula.trim(),
      name: form.name.trim(),
      carrera: form.carrera.trim(),
      semestre: form.semestre,
    })
    setSubmitting(false)

    if (res.ok) {
      setResult({ student: res.student, team: res.team })
      setForm({ matricula: '', name: '', carrera: '', semestre: 1 })
    } else {
      setError(res.message)
    }
  }

  const inputClass =
    'w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-neutral-500'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-1">
        Registro de Estudiantes
      </h1>
      <p className="text-neutral-400 mb-6">
        Completá el formulario y se te asigna un equipo automáticamente.
      </p>

      {teams.length === 0 ? (
        <div className="p-8 text-center text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-2xl">
          Aún no hay equipos configurados. Andá a{' '}
          <Link to="/admin" className="underline text-white">
            Admin
          </Link>{' '}
          para crearlos.
        </div>
      ) : result ? (
        <ResultCard
          result={result}
          onDone={() => setResult(null)}
          total={total}
        />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">
                Matrícula
              </label>
              <input
                value={form.matricula}
                onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                placeholder="Ej. A01234567"
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">
                Nombre completo
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. María López"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">
                Carrera
              </label>
              <input
                value={form.carrera}
                onChange={(e) => setForm({ ...form, carrera: e.target.value })}
                placeholder="Ej. Ingeniería en Sistemas"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">
                Semestre
              </label>
              <select
                value={form.semestre}
                onChange={(e) =>
                  setForm({ ...form, semestre: Number(e.target.value) })
                }
                className={inputClass}
              >
                {SEMESTRES.map((s) => (
                  <option key={s} value={s}>
                    {s}º
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-xl bg-white text-neutral-900 font-bold text-lg disabled:opacity-50"
          >
            {submitting ? 'Asignando equipo…' : 'Registrar y asignar equipo'}
          </button>
        </form>
      )}

      {teams.length > 0 && !result && (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-neutral-500">Distribución actual:</p>
          <div className="flex flex-wrap gap-2">
            {distribution.map(({ team, count }) => (
              <span
                key={team.id}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-sm"
              >
                <span
                  className="inline-block rounded-full"
                  style={{ width: 10, height: 10, background: team.color }}
                />
                <span className="text-neutral-300">{team.name}</span>
                <span className="font-mono text-neutral-500">{count}</span>
              </span>
            ))}
          </div>
          {!connected && (
            <p className="text-xs text-amber-400/80">
              Sin conexión con el servidor — se muestran los datos guardados.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ResultCard({
  result,
  onDone,
  total,
}: {
  result: { student: Student; team: Team }
  onDone: () => void
  total: number
}) {
  const { student, team } = result
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-8 border border-neutral-800 text-center"
        style={{ background: `${team.color}22`, borderLeft: `10px solid ${team.color}` }}
      >
        <p className="text-sm uppercase tracking-widest text-neutral-400 mb-1">
          Registrado · #{String(student.number).padStart(3, '0')}
        </p>
        <h2 className="text-neutral-300 text-lg mb-2">Tu equipo es</h2>
        <p className="text-7xl font-black mb-4" style={{ color: team.color }}>
          {team.name}
        </p>
        <p className="text-neutral-300 text-lg">
          {student.name} · {student.matricula}
        </p>
        <p className="text-neutral-500">
          {student.carrera} · {student.semestre}º semestre
        </p>
      </div>

      <button
        onClick={onDone}
        className="w-full h-14 rounded-xl bg-neutral-800 text-neutral-100 font-bold text-lg"
      >
        Registrar otro estudiante
      </button>
      <p className="text-center text-sm text-neutral-500">
        {total} estudiante{total === 1 ? '' : 's'} registrado{total === 1 ? '' : 's'} en total
      </p>
    </div>
  )
}
import { NavLink } from 'react-router-dom'
import { isLocalHost } from '../isLocalHost'

export function Nav() {
  const links = [
    { to: '/', label: 'Registro' },
    ...(isLocalHost() ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <nav className="flex gap-2 p-4 bg-neutral-900/60 border-b border-neutral-800">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) =>
            `px-4 py-2 rounded-lg font-medium transition-colors ${
              isActive
                ? 'bg-white text-neutral-900'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
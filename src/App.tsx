import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { isLocalHost } from './isLocalHost'
import { Nav } from './components/Nav'
import { Registro } from './pages/Registro'
import { Admin } from './pages/Admin'

function Layout() {
  const location = useLocation()

  // Admin solo se puede ver desde la computadora que corre el servidor
  if (location.pathname === '/admin' && !isLocalHost()) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Registro />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  )
}
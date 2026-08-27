import { HashRouter, Routes, Route } from 'react-router-dom'
import { Nav } from './components/Nav'
import { Registro } from './pages/Registro'
import { Admin } from './pages/Admin'

function Layout() {
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
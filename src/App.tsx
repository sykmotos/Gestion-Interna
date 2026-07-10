import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import NuevoTrabajo from './pages/NuevoTrabajo'
import Clientes from './pages/Clientes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nuevo" element={<NuevoTrabajo />} />
          <Route path="/clientes" element={<Clientes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

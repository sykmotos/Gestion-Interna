import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Ordenes from './pages/Ordenes'
import Caja from './pages/Caja'
import Stock from './pages/Stock'
import Clientes from './pages/Clientes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ordenes" element={<Ordenes />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/clientes" element={<Clientes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

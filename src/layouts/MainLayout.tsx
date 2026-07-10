import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Wallet, Package, Users } from 'lucide-react'

export default function MainLayout() {
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold tracking-wide transition-colors ${
      isActive ? 'text-orange-500' : 'text-zinc-500'
    }`

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-lg mx-auto relative">
        <main className="pb-[60px] min-h-screen">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-zinc-900 border-t border-zinc-800 z-50 flex">
          <NavLink to="/" end className={navCls}>
            <LayoutDashboard size={20} />
            <span>Inicio</span>
          </NavLink>
          <NavLink to="/ordenes" className={navCls}>
            <ClipboardList size={20} />
            <span>Órdenes</span>
          </NavLink>
          <NavLink to="/caja" className={navCls}>
            <Wallet size={20} />
            <span>Caja</span>
          </NavLink>
          <NavLink to="/stock" className={navCls}>
            <Package size={20} />
            <span>Stock</span>
          </NavLink>
          <NavLink to="/clientes" className={navCls}>
            <Users size={20} />
            <span>Clientes</span>
          </NavLink>
        </nav>
      </div>
    </div>
  )
}

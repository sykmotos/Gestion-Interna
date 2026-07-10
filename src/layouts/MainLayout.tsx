import { Outlet, NavLink } from 'react-router-dom'
import { BarChart2, PlusCircle, Users } from 'lucide-react'

export default function MainLayout() {
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-bold tracking-wide transition-colors ${
      isActive ? 'text-green-400' : 'text-gray-500'
    }`

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto relative">
        <main className="pb-24 min-h-screen">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-gray-900 border-t border-gray-800 z-50 flex">
          <NavLink to="/" end className={navCls}>
            <BarChart2 size={22} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/nuevo" className={navCls}>
            {({ isActive }) => (
              <>
                <PlusCircle size={28} className={isActive ? 'text-green-400' : 'text-green-500'} />
                <span className={isActive ? 'text-green-400' : 'text-green-500'}>Nuevo</span>
              </>
            )}
          </NavLink>

          <NavLink to="/clientes" className={navCls}>
            <Users size={22} />
            <span>Clientes</span>
          </NavLink>
        </nav>
      </div>
    </div>
  )
}

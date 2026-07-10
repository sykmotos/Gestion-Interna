import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/utils'
import type { Inventario } from '../types'
import { Plus, X } from 'lucide-react'

const inp =
  'w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-zinc-100 py-4 px-4 rounded-xl outline-none placeholder:text-zinc-600 transition-colors'

interface NuevoItem {
  nombre: string
  categoria: string
  cantidad: string
  precio_costo: string
  precio_venta: string
}

export default function Stock() {
  const [items, setItems] = useState<Inventario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [nuevo, setNuevo] = useState<NuevoItem>({
    nombre: '',
    categoria: '',
    cantidad: '',
    precio_costo: '',
    precio_venta: '',
  })

  const loadItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('inventario')
      .select('*')
      .order('nombre')
    if (data) setItems(data as Inventario[])
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
  }, [])

  const ajustarStock = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const nuevaCantidad = Math.max(0, item.cantidad + delta)
    const { error } = await supabase
      .from('inventario')
      .update({ cantidad: nuevaCantidad, ultima_actualizacion: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setItems(prev =>
        prev.map(i => (i.id === id ? { ...i, cantidad: nuevaCantidad } : i)),
      )
    }
  }

  const guardarNuevo = async () => {
    if (!nuevo.nombre || guardando) return
    setGuardando(true)
    const { error } = await supabase.from('inventario').insert({
      nombre: nuevo.nombre,
      categoria: nuevo.categoria || null,
      cantidad: parseInt(nuevo.cantidad) || 0,
      precio_costo: parseFloat(nuevo.precio_costo) || 0,
      precio_venta: parseFloat(nuevo.precio_venta) || 0,
    })
    if (!error) {
      setNuevo({ nombre: '', categoria: '', cantidad: '', precio_costo: '', precio_venta: '' })
      setShowModal(false)
      loadItems()
    } else {
      alert('Error al guardar.')
    }
    setGuardando(false)
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black text-zinc-100 tracking-wider">Stock</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-orange-500 active:bg-orange-600 text-white font-black px-4 py-2.5 rounded-xl text-sm tracking-wide"
        >
          <Plus size={18} />
          AGREGAR
        </button>
      </div>

      {loading && (
        <p className="text-zinc-600 text-center py-8 text-sm font-bold tracking-widest">
          CARGANDO...
        </p>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-zinc-100 font-bold text-base leading-tight">{item.nombre}</p>
                {item.categoria && (
                  <p className="text-zinc-600 text-xs mt-0.5">{item.categoria}</p>
                )}
                {item.precio_venta > 0 && (
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Venta: {formatARS(item.precio_venta)}
                  </p>
                )}
              </div>

              {/* Controles de stock */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => ajustarStock(item.id, -1)}
                  className="w-14 h-14 bg-zinc-800 active:bg-zinc-700 text-zinc-100 text-2xl font-black rounded-xl flex items-center justify-center border border-zinc-700"
                >
                  −
                </button>
                <span
                  className={`w-12 text-center font-black text-2xl ${
                    item.cantidad === 0 ? 'text-red-500' : item.cantidad <= 2 ? 'text-orange-400' : 'text-zinc-100'
                  }`}
                >
                  {item.cantidad}
                </span>
                <button
                  onClick={() => ajustarStock(item.id, 1)}
                  className="w-14 h-14 bg-orange-500 active:bg-orange-600 text-white text-2xl font-black rounded-xl flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && items.length === 0 && (
          <p className="text-zinc-700 text-center py-10 text-sm">
            Sin repuestos en inventario
          </p>
        )}
      </div>

      {/* Modal nuevo repuesto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-end">
          <div className="w-full max-w-lg mx-auto bg-zinc-900 rounded-t-2xl border-t border-zinc-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <p className="text-zinc-100 font-black text-lg tracking-wide">Nuevo Repuesto</p>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 p-1">
                <X size={22} />
              </button>
            </div>

            <input
              type="text"
              value={nuevo.nombre}
              onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))}
              placeholder="Nombre del repuesto *"
              autoFocus
              className={inp}
            />
            <input
              type="text"
              value={nuevo.categoria}
              onChange={e => setNuevo(n => ({ ...n, categoria: e.target.value }))}
              placeholder="Categoría (Ej: Frenos, Lubricantes...)"
              className={inp}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={nuevo.cantidad}
                onChange={e => setNuevo(n => ({ ...n, cantidad: e.target.value }))}
                placeholder="Cant."
                className={`${inp} text-center`}
              />
              <input
                type="number"
                inputMode="decimal"
                value={nuevo.precio_costo}
                onChange={e => setNuevo(n => ({ ...n, precio_costo: e.target.value }))}
                placeholder="$ Costo"
                className={inp}
              />
              <input
                type="number"
                inputMode="decimal"
                value={nuevo.precio_venta}
                onChange={e => setNuevo(n => ({ ...n, precio_venta: e.target.value }))}
                placeholder="$ Venta"
                className={inp}
              />
            </div>

            <button
              onClick={guardarNuevo}
              disabled={!nuevo.nombre || guardando}
              className="w-full bg-orange-500 active:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-5 rounded-xl uppercase tracking-wide min-h-[64px]"
            >
              {guardando ? 'GUARDANDO...' : 'GUARDAR REPUESTO'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

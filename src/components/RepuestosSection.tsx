import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/utils'
import type { Inventario } from '../types'
import { Package, PenLine, Trash2, X, Pencil, Check } from 'lucide-react'

export interface RepuestoItem {
  key: string
  type: 'stock' | 'manual'
  nombre: string
  costo: number
  inventario_id?: string
}

interface Props {
  items: RepuestoItem[]
  onChange: (items: RepuestoItem[]) => void
}

const inp =
  'w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 text-zinc-100 py-3 px-4 rounded-xl outline-none placeholder:text-zinc-600 transition-colors'

export default function RepuestosSection({ items, onChange }: Props) {
  const [showStockModal, setShowStockModal] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [inventario, setInventario] = useState<Inventario[]>([])
  const [loadingStock, setLoadingStock] = useState(false)
  const [manualNombre, setManualNombre] = useState('')
  const [manualCosto, setManualCosto] = useState('')
  // Edición de precio inline
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingVal, setEditingVal] = useState('')

  const openStockModal = async () => {
    setShowStockModal(true)
    setLoadingStock(true)
    const { data } = await supabase
      .from('inventario')
      .select('*')
      .gt('cantidad', 0)
      .order('nombre')
    if (data) setInventario(data as Inventario[])
    setLoadingStock(false)
  }

  const addFromStock = (item: Inventario) => {
    onChange([
      ...items,
      {
        key: `stock-${item.id}-${Date.now()}`,
        type: 'stock',
        nombre: item.nombre,
        costo: item.precio_venta,
        inventario_id: item.id,
      },
    ])
    setShowStockModal(false)
  }

  const addManual = () => {
    if (!manualNombre.trim()) return
    onChange([
      ...items,
      {
        key: `manual-${Date.now()}`,
        type: 'manual',
        nombre: manualNombre.trim(),
        costo: parseFloat(manualCosto) || 0,
      },
    ])
    setManualNombre('')
    setManualCosto('')
    setShowManual(false)
  }

  const remove = (key: string) => onChange(items.filter(i => i.key !== key))

  const startEditPrice = (item: RepuestoItem) => {
    setEditingKey(item.key)
    setEditingVal(String(item.costo))
  }

  const commitEditPrice = (key: string) => {
    const newPrice = parseFloat(editingVal) || 0
    onChange(items.map(i => i.key === key ? { ...i, costo: newPrice } : i))
    setEditingKey(null)
  }

  const total = items.reduce((s, i) => s + i.costo, 0)

  return (
    <div>
      <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-2 uppercase">
        Repuestos Utilizados
      </label>

      {items.length > 0 && (
        <div className="space-y-2 mb-3">
          {items.map(item => (
            <div
              key={item.key}
              className="bg-zinc-800 rounded-xl px-3 py-3 flex items-center gap-2 border border-zinc-700"
            >
              <div className="flex-1 min-w-0">
                <p className="text-zinc-100 text-sm font-bold leading-tight">{item.nombre}</p>
                <p className="text-zinc-600 text-xs mt-0.5">
                  {item.type === 'stock' ? '📦 Stock' : '✍️ Manual'}
                </p>
              </div>

              {/* Precio editable inline */}
              {editingKey === item.key ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-zinc-500 text-sm">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editingVal}
                    autoFocus
                    onChange={e => setEditingVal(e.target.value)}
                    onBlur={() => commitEditPrice(item.key)}
                    onKeyDown={e => e.key === 'Enter' && commitEditPrice(item.key)}
                    className="w-24 bg-zinc-700 border border-orange-500 text-orange-400 font-black py-1 px-2 rounded-lg outline-none text-sm text-right"
                  />
                  <button
                    type="button"
                    onClick={() => commitEditPrice(item.key)}
                    className="text-orange-500 p-1"
                  >
                    <Check size={15} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEditPrice(item)}
                  className="flex items-center gap-1 shrink-0 bg-zinc-700 border border-zinc-600 rounded-lg px-2.5 py-1.5 active:bg-zinc-600"
                >
                  <span className="text-orange-400 font-black text-sm">{formatARS(item.costo)}</span>
                  <Pencil size={11} className="text-zinc-500" />
                </button>
              )}

              <button
                type="button"
                onClick={() => remove(item.key)}
                className="text-red-500 active:text-red-400 p-1 shrink-0"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}

          <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-zinc-400 text-sm font-bold">Total repuestos</span>
            <span className="text-orange-500 font-black text-xl">{formatARS(total)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={openStockModal}
          className="bg-zinc-800 border border-zinc-700 active:bg-zinc-700 text-zinc-100 font-bold py-4 px-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Package size={16} className="text-orange-500" />
          Del Stock
        </button>
        <button
          type="button"
          onClick={() => setShowManual(v => !v)}
          className="bg-zinc-800 border border-zinc-700 active:bg-zinc-700 text-zinc-100 font-bold py-4 px-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <PenLine size={16} className="text-orange-500" />
          Manual
        </button>
      </div>

      {showManual && (
        <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-xl p-4 space-y-3">
          <input
            type="text"
            value={manualNombre}
            onChange={e => setManualNombre(e.target.value)}
            placeholder="Nombre del repuesto"
            autoFocus
            className={inp}
          />
          <input
            type="number"
            inputMode="decimal"
            value={manualCosto}
            onChange={e => setManualCosto(e.target.value)}
            placeholder="Precio de venta ($)"
            className={inp}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowManual(false); setManualNombre(''); setManualCosto('') }}
              className="flex-1 bg-zinc-700 text-zinc-400 font-bold py-3 rounded-xl text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={addManual}
              disabled={!manualNombre.trim()}
              className="flex-1 bg-orange-500 active:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-black py-3 rounded-xl text-sm"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-end">
          <div className="w-full max-w-lg mx-auto bg-zinc-900 rounded-t-2xl border-t border-zinc-800 p-5 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <p className="text-zinc-100 font-black text-lg">Agregar del Stock</p>
              <button type="button" onClick={() => setShowStockModal(false)} className="text-zinc-500 p-1">
                <X size={22} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pb-2">
              {loadingStock && (
                <p className="text-zinc-600 text-center py-8 text-sm font-bold tracking-widest">
                  CARGANDO...
                </p>
              )}
              {!loadingStock && inventario.length === 0 && (
                <p className="text-zinc-600 text-center py-8 text-sm">
                  Sin repuestos disponibles en stock
                </p>
              )}
              {inventario.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addFromStock(item)}
                  className="w-full bg-zinc-800 border border-zinc-700 active:bg-zinc-700 rounded-xl p-4 flex items-center justify-between text-left transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-zinc-100 font-bold text-sm leading-tight">{item.nombre}</p>
                    {item.categoria && (
                      <p className="text-zinc-500 text-xs mt-0.5">{item.categoria}</p>
                    )}
                    <p className="text-zinc-600 text-xs mt-0.5">Stock: {item.cantidad}</p>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    <p className="text-orange-500 font-black text-base">{formatARS(item.precio_venta)}</p>
                    <p className="text-zinc-600 text-xs">precio venta</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Descuenta stock en Supabase para los items de tipo 'stock' */
export async function decrementarStock(repuestos: RepuestoItem[]) {
  const counts = new Map<string, number>()
  for (const item of repuestos) {
    if (item.type === 'stock' && item.inventario_id) {
      counts.set(item.inventario_id, (counts.get(item.inventario_id) ?? 0) + 1)
    }
  }
  for (const [id, qty] of counts) {
    const { data } = await supabase
      .from('inventario')
      .select('cantidad')
      .eq('id', id)
      .single()
    if (data) {
      await supabase
        .from('inventario')
        .update({
          cantidad: Math.max(0, data.cantidad - qty),
          ultima_actualizacion: new Date().toISOString(),
        })
        .eq('id', id)
    }
  }
}

/** Devuelve stock en Supabase para los items de tipo 'stock' (inversa de decrementarStock) */
export async function incrementarStock(repuestos: RepuestoItem[]) {
  const counts = new Map<string, number>()
  for (const item of repuestos) {
    if (item.type === 'stock' && item.inventario_id) {
      counts.set(item.inventario_id, (counts.get(item.inventario_id) ?? 0) + 1)
    }
  }
  for (const [id, qty] of counts) {
    const { data } = await supabase
      .from('inventario')
      .select('cantidad')
      .eq('id', id)
      .single()
    if (data) {
      await supabase
        .from('inventario')
        .update({
          cantidad: data.cantidad + qty,
          ultima_actualizacion: new Date().toISOString(),
        })
        .eq('id', id)
    }
  }
}

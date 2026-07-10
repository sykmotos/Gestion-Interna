import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/utils'
import type { Trabajo } from '../types'

export default function Dashboard() {
  const [stats, setStats] = useState({ facturacion: 0, ganancia: 0 })
  const [ultimosTrabajo, setUltimosTrabajo] = useState<Trabajo[]>([])

  const loadData = useCallback(async () => {
    const now = new Date()
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const [{ data: statsData }, { data: ultimos }] = await Promise.all([
      supabase
        .from('trabajos')
        .select('precio_cobrado, ganancia_neta')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('trabajos')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(5),
    ])

    if (statsData) {
      setStats({
        facturacion: statsData.reduce((s, t) => s + (t.precio_cobrado ?? 0), 0),
        ganancia: statsData.reduce((s, t) => s + (t.ganancia_neta ?? 0), 0),
      })
    }
    if (ultimos) setUltimosTrabajo(ultimos as Trabajo[])
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const mesActual = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div className="px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-green-400 tracking-wider">SYK MOTOS</h1>
        <p className="text-gray-500 text-sm capitalize">{mesActual}</p>
      </div>

      {/* Stats del mes */}
      <p className="text-gray-600 text-xs font-bold tracking-widest mb-3 uppercase">Resumen del mes</p>
      <div className="space-y-3 mb-8">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">Facturación Total</p>
          <p className="text-white font-black text-3xl mt-1">{formatARS(stats.facturacion)}</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">Ganancia Neta</p>
          <p className="text-green-400 font-black text-3xl mt-1">{formatARS(stats.ganancia)}</p>
        </div>

        <div className="bg-orange-950 rounded-2xl p-5 border border-orange-900/60">
          <p className="text-orange-400 text-xs font-bold tracking-widest uppercase">
            Fondo Herramientas (10%)
          </p>
          <p className="text-orange-300 font-black text-3xl mt-1">
            {formatARS(stats.ganancia * 0.1)}
          </p>
        </div>
      </div>

      {/* Últimos 5 trabajos */}
      <p className="text-gray-600 text-xs font-bold tracking-widest mb-3 uppercase">
        Últimos trabajos
      </p>
      <div className="space-y-2">
        {ultimosTrabajo.map(t => (
          <div
            key={t.id}
            className="bg-gray-900 rounded-2xl p-4 border border-gray-800 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-green-400 font-black text-lg tracking-widest">{t.patente_id}</p>
              <p className="text-gray-400 text-sm truncate">{t.detalle_trabajo || '—'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white font-bold">{formatARS(t.ganancia_neta)}</p>
              <p className="text-gray-600 text-xs">{formatFecha(t.fecha)}</p>
            </div>
          </div>
        ))}
        {ultimosTrabajo.length === 0 && (
          <p className="text-gray-700 text-center py-8">Sin trabajos registrados aún</p>
        )}
      </div>
    </div>
  )
}

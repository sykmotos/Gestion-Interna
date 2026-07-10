import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/utils'
import type { Trabajo } from '../types'

function toDateInput(d: Date) {
  return d.toISOString().split('T')[0]
}

const now = new Date()
const defaultDesde = toDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
const defaultHasta = toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0))

const dateInp =
  'w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 text-zinc-100 py-3 px-3 rounded-xl outline-none [color-scheme:dark]'

export default function Dashboard() {
  const [desde, setDesde] = useState(defaultDesde)
  const [hasta, setHasta] = useState(defaultHasta)
  const [stats, setStats] = useState({ facturacion: 0, ganancia: 0 })
  const [enTaller, setEnTaller] = useState<Trabajo[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async (d: string, h: string) => {
    if (!d || !h) return
    setLoading(true)
    const inicio = new Date(d + 'T00:00:00').toISOString()
    const fin = new Date(h + 'T23:59:59').toISOString()

    const [{ data: statsData }, { data: tallerData }] = await Promise.all([
      supabase
        .from('trabajos')
        .select('precio_cobrado, ganancia_neta')
        .eq('estado', 'Entregado')
        .gte('fecha', inicio)
        .lte('fecha', fin),
      supabase
        .from('trabajos')
        .select('*')
        .eq('estado', 'En Taller')
        .order('fecha', { ascending: false }),
    ])

    if (statsData) {
      setStats({
        facturacion: statsData.reduce((s, t) => s + (t.precio_cobrado ?? 0), 0),
        ganancia: statsData.reduce((s, t) => s + (t.ganancia_neta ?? 0), 0),
      })
    }
    if (tallerData) setEnTaller(tallerData as Trabajo[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData(defaultDesde, defaultHasta)
  }, [fetchData])

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-black tracking-wider mb-5">
        SYK<span className="text-orange-500"> MOTOS</span>
      </h1>

      {/* Filtro de fechas exactas */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5 space-y-3">
        <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Período</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-zinc-600 text-xs block mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              className={dateInp}
            />
          </div>
          <div>
            <label className="text-zinc-600 text-xs block mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              className={dateInp}
            />
          </div>
        </div>
        <button
          onClick={() => fetchData(desde, hasta)}
          disabled={loading || !desde || !hasta}
          className="w-full bg-orange-500 active:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-3.5 rounded-xl tracking-widest uppercase text-sm transition-colors"
        >
          {loading ? 'CARGANDO...' : 'FILTRAR'}
        </button>
      </div>

      {/* Métricas */}
      <div className="space-y-3 mb-7">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">
            Facturación Bruta
          </p>
          <p className="text-zinc-100 font-black text-3xl mt-1">{formatARS(stats.facturacion)}</p>
        </div>

        <div className="bg-orange-500 rounded-xl p-5">
          <p className="text-orange-950 text-xs font-black tracking-widest uppercase">
            Ganancia Neta
          </p>
          <p className="text-white font-black text-3xl mt-1">{formatARS(stats.ganancia)}</p>
        </div>

        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">
            Fondo Herramientas (10%)
          </p>
          <p className="text-orange-500 font-black text-3xl mt-1">
            {formatARS(stats.ganancia * 0.1)}
          </p>
        </div>
      </div>

      {/* Motos en taller */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Motos en Taller</p>
        {enTaller.length > 0 && (
          <span className="bg-orange-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
            {enTaller.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {enTaller.map(t => (
          <div
            key={t.id}
            className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-orange-500 font-black text-lg tracking-widest">{t.patente_id}</p>
              <p className="text-zinc-400 text-sm truncate">{t.detalle_trabajo || '—'}</p>
            </div>
            <p className="text-zinc-600 text-xs shrink-0">
              {new Date(t.fecha).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
              })}
            </p>
          </div>
        ))}
        {enTaller.length === 0 && (
          <p className="text-zinc-700 text-center py-8 text-sm">Sin motos en taller</p>
        )}
      </div>
    </div>
  )
}

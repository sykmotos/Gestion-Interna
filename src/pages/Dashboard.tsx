import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/utils'
import type { Trabajo } from '../types'

type DateFilter = 'semana' | 'mes' | 'mes_pasado' | 'historico'

function getRange(filter: DateFilter): { inicio: string; fin: string } | null {
  const now = new Date()
  if (filter === 'historico') return null
  if (filter === 'semana') {
    const d = new Date(now)
    d.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    d.setHours(0, 0, 0, 0)
    return { inicio: d.toISOString(), fin: now.toISOString() }
  }
  if (filter === 'mes') {
    return {
      inicio: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      fin: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    }
  }
  return {
    inicio: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
    fin: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString(),
  }
}

const FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'semana', label: 'Esta Semana' },
  { value: 'mes', label: 'Este Mes' },
  { value: 'mes_pasado', label: 'Mes Pasado' },
  { value: 'historico', label: 'Histórico' },
]

export default function Dashboard() {
  const [filter, setFilter] = useState<DateFilter>('mes')
  const [stats, setStats] = useState({ facturacion: 0, ganancia: 0 })
  const [enTaller, setEnTaller] = useState<Trabajo[]>([])

  const loadData = useCallback(async () => {
    const range = getRange(filter)

    let statsQ = supabase
      .from('trabajos')
      .select('precio_cobrado, ganancia_neta')
      .eq('estado', 'Entregado')

    if (range) {
      statsQ = statsQ.gte('fecha', range.inicio).lte('fecha', range.fin)
    }

    const [{ data: statsData }, { data: tallerData }] = await Promise.all([
      statsQ,
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
  }, [filter])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-black tracking-wider mb-5">
        SYK<span className="text-orange-500"> MOTOS</span>
      </h1>

      {/* Filtro de fecha */}
      <div className="relative mb-5">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as DateFilter)}
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-lg font-bold py-4 px-4 rounded-xl outline-none appearance-none cursor-pointer"
        >
          {FILTERS.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
          ▾
        </span>
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

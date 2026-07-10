import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Cliente, Trabajo } from '../types'
import NuevoTrabajoModal from '../components/NuevoTrabajoModal'

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)

const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(null)
  const [trabajosCliente, setTrabajosCliente] = useState<Trabajo[]>([])
  const [stats, setStats] = useState({ facturacion: 0, ganancia: 0 })
  const [loadingSearch, setLoadingSearch] = useState(false)

  const loadStats = useCallback(async () => {
    const now = new Date()
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const { data } = await supabase
      .from('trabajos')
      .select('precio_cobrado, ganancia_neta')
      .gte('fecha', inicio)
      .lte('fecha', fin)

    if (data) {
      const facturacion = data.reduce((s, t) => s + (t.precio_cobrado ?? 0), 0)
      const ganancia = data.reduce((s, t) => s + (t.ganancia_neta ?? 0), 0)
      setStats({ facturacion, ganancia })
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setClienteEncontrado(null)
      setTrabajosCliente([])
      return
    }

    const timer = setTimeout(async () => {
      setLoadingSearch(true)
      const { data: cliente } = await supabase
        .from('clientes')
        .select('*')
        .ilike('patente', `%${searchQuery}%`)
        .maybeSingle()

      if (cliente) {
        setClienteEncontrado(cliente as Cliente)
        const { data: trabajos } = await supabase
          .from('trabajos')
          .select('*')
          .eq('patente_id', (cliente as Cliente).patente)
          .order('fecha', { ascending: false })
          .limit(10)
        setTrabajosCliente((trabajos as Trabajo[]) ?? [])
      } else {
        setClienteEncontrado(null)
        setTrabajosCliente([])
      }
      setLoadingSearch(false)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const mesActual = new Date().toLocaleString('es-AR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 pt-6 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-green-400 tracking-wider">SYK MOTOS</h1>
        <p className="text-gray-500 text-sm capitalize">{mesActual}</p>
      </div>

      {/* CTA principal */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-green-500 active:bg-green-600 text-black font-black text-xl py-6 rounded-2xl mb-5 tracking-wide shadow-lg shadow-green-900/40 uppercase"
      >
        + NUEVO INGRESO / TRABAJO
      </button>

      {/* Buscador */}
      <div className="relative mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value.toUpperCase())}
          placeholder="Buscar por patente..."
          className="w-full bg-gray-900 border-2 border-gray-700 focus:border-green-500 text-white text-xl py-4 px-5 rounded-2xl outline-none uppercase placeholder:normal-case placeholder:text-gray-600 tracking-widest"
        />
        {loadingSearch && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            ...
          </span>
        )}
      </div>

      {/* Resultado búsqueda */}
      {clienteEncontrado && (
        <div className="mb-5 bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-green-400 font-black text-2xl tracking-widest">
                {clienteEncontrado.patente}
              </p>
              <p className="text-white font-bold text-lg leading-tight">
                {clienteEncontrado.nombre_dueño}
              </p>
              <p className="text-gray-400 text-sm">{clienteEncontrado.modelo_moto}</p>
              <p className="text-gray-500 text-sm">{clienteEncontrado.telefono}</p>
            </div>
            {clienteEncontrado.telefono && (
              <a
                href={`https://wa.me/54${clienteEncontrado.telefono.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-700 text-white font-bold px-4 py-2 rounded-xl text-sm shrink-0"
              >
                WhatsApp
              </a>
            )}
          </div>

          {trabajosCliente.length > 0 && (
            <div className="mt-4 border-t border-gray-800 pt-4">
              <p className="text-gray-500 text-xs font-bold tracking-widest mb-3 uppercase">
                Historial ({trabajosCliente.length} trabajos)
              </p>
              <div className="space-y-2">
                {trabajosCliente.map(t => (
                  <div key={t.id} className="bg-gray-800 rounded-xl p-3 flex gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-sm leading-snug line-clamp-2">
                        {t.detalle_trabajo}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">{formatFecha(t.fecha)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-green-400 font-bold text-sm">
                        {formatARS(t.precio_cobrado)}
                      </p>
                      <p className="text-gray-500 text-xs">gan. {formatARS(t.ganancia_neta)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats del mes */}
      <p className="text-gray-600 text-xs font-bold tracking-widest mb-3 uppercase">
        Resumen del mes
      </p>

      <div className="space-y-3">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">
            Facturación Total
          </p>
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

      {showModal && (
        <NuevoTrabajoModal
          onClose={() => {
            setShowModal(false)
            loadStats()
          }}
        />
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/utils'
import type { Cliente, Trabajo } from '../types'
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'

export default function Clientes() {
  const [query, setQuery] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [historiales, setHistoriales] = useState<Record<string, Trabajo[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      let q = supabase.from('clientes').select('*').order('nombre_dueño')

      if (query.length >= 2) {
        q = q.or(`patente.ilike.%${query}%,nombre_dueño.ilike.%${query}%`)
      } else {
        q = q.limit(20)
      }

      const { data } = await q
      setClientes((data as Cliente[]) ?? [])
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const toggleCliente = async (cliente: Cliente) => {
    if (expandedId === cliente.patente) {
      setExpandedId(null)
      return
    }
    setExpandedId(cliente.patente)

    if (!historiales[cliente.patente]) {
      const { data } = await supabase
        .from('trabajos')
        .select('*')
        .eq('patente_id', cliente.patente)
        .order('fecha', { ascending: false })
      setHistoriales(prev => ({ ...prev, [cliente.patente]: (data as Trabajo[]) ?? [] }))
    }
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-black text-white mb-5 tracking-wide">Clientes</h1>

      {/* Buscador */}
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value.toUpperCase())}
        placeholder="Buscar por patente o nombre..."
        className="w-full bg-gray-900 border-2 border-gray-700 focus:border-green-500 text-white text-xl py-4 px-5 rounded-2xl outline-none mb-5 uppercase placeholder:normal-case placeholder:text-gray-600"
      />

      {loading && (
        <p className="text-gray-600 text-center py-4 text-sm font-bold tracking-widest">
          BUSCANDO...
        </p>
      )}

      <div className="space-y-2">
        {clientes.map(c => (
          <div
            key={c.patente}
            className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
          >
            {/* Header del cliente */}
            <button
              onClick={() => toggleCliente(c)}
              className="w-full p-4 flex items-center gap-3 text-left active:bg-gray-800 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-green-400 font-black text-xl tracking-widest">{c.patente}</p>
                <p className="text-white font-bold text-lg leading-tight">{c.nombre_dueño ?? '—'}</p>
                <p className="text-gray-500 text-sm">{c.modelo_moto ?? ''}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.telefono && (
                  <a
                    href={`https://wa.me/54${c.telefono.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="bg-green-800 p-2.5 rounded-xl text-green-400"
                  >
                    <MessageCircle size={18} />
                  </a>
                )}
                {expandedId === c.patente ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </div>
            </button>

            {/* Historial expandido */}
            {expandedId === c.patente && (
              <div className="border-t border-gray-800 px-4 pb-4 pt-3">
                {!historiales[c.patente] ? (
                  <p className="text-gray-600 text-sm py-2">Cargando historial...</p>
                ) : historiales[c.patente].length === 0 ? (
                  <p className="text-gray-600 text-sm py-2">Sin trabajos registrados</p>
                ) : (
                  <>
                    <p className="text-gray-600 text-xs font-bold tracking-widest uppercase mb-3">
                      {historiales[c.patente].length}{' '}
                      {historiales[c.patente].length === 1 ? 'trabajo' : 'trabajos'}
                    </p>
                    <div className="space-y-2">
                      {historiales[c.patente].map(t => (
                        <div
                          key={t.id}
                          className="bg-gray-800 rounded-xl p-3 flex gap-3 items-start"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-200 text-sm leading-snug">
                              {t.detalle_trabajo || '—'}
                            </p>
                            {t.repuestos_usados && (
                              <p className="text-gray-500 text-xs mt-0.5">
                                Rep: {t.repuestos_usados}
                              </p>
                            )}
                            <p className="text-gray-600 text-xs mt-1">{formatFecha(t.fecha)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-white font-bold text-sm">
                              {formatARS(t.precio_cobrado)}
                            </p>
                            <p className="text-green-400 text-xs">
                              gan. {formatARS(t.ganancia_neta)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {!loading && clientes.length === 0 && (
          <p className="text-gray-700 text-center py-10 text-sm">
            {query.length >= 2 ? 'Sin resultados para esa búsqueda' : 'No hay clientes registrados'}
          </p>
        )}
      </div>
    </div>
  )
}

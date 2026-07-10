import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/utils'
import type { Cliente, Trabajo } from '../types'
import { ChevronDown, ChevronUp, MessageCircle, Pencil } from 'lucide-react'
import EditClienteModal from '../components/EditClienteModal'

export default function Clientes() {
  const [query, setQuery] = useState(() => localStorage.getItem('clientes_query') ?? '')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [historiales, setHistoriales] = useState<Record<string, Trabajo[]>>({})
  const [loading, setLoading] = useState(false)
  const [editCliente, setEditCliente] = useState<Cliente | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      let q = supabase.from('clientes').select('*').order('nombre_dueño')

      if (query.length >= 2) {
        q = q.or(`patente.ilike.%${query}%,nombre_dueño.ilike.%${query}%,dni.ilike.%${query}%,telefono.ilike.%${query}%,modelo_moto.ilike.%${query}%`)
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
      <h1 className="text-2xl font-black text-zinc-100 tracking-wider mb-5">Clientes</h1>

      <input
        type="text"
        value={query}
        onChange={e => { const v = e.target.value.toUpperCase(); setQuery(v); localStorage.setItem('clientes_query', v) }}
        placeholder="Patente, nombre, DNI, teléfono, modelo..."
        className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 text-zinc-100 text-lg py-4 px-5 rounded-xl outline-none mb-5 uppercase placeholder:normal-case placeholder:text-zinc-600 transition-colors"
      />

      {loading && (
        <p className="text-zinc-600 text-center py-4 text-sm font-bold tracking-widest">
          BUSCANDO...
        </p>
      )}

      <div className="space-y-2">
        {clientes.map(c => (
          <div
            key={c.patente}
            className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
          >
            <button
              onClick={() => toggleCliente(c)}
              className="w-full p-4 flex items-center gap-3 text-left active:bg-zinc-800 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-orange-500 font-black text-xl tracking-widest">{c.patente}</p>
                <p className="text-zinc-100 font-bold text-base leading-tight">
                  {c.nombre_dueño ?? '—'}
                </p>
                <p className="text-zinc-500 text-sm">{c.modelo_moto ?? ''}</p>
                {c.dni && (
                  <p className="text-zinc-600 text-xs">DNI {c.dni}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.telefono && (
                  <a
                    href={`https://wa.me/54${c.telefono.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="bg-zinc-800 border border-zinc-700 p-2.5 rounded-xl text-green-500"
                  >
                    <MessageCircle size={18} />
                  </a>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setEditCliente(c) }}
                  className="bg-zinc-800 border border-zinc-700 p-2.5 rounded-xl text-zinc-400 active:bg-zinc-700"
                >
                  <Pencil size={16} />
                </button>
                {expandedId === c.patente ? (
                  <ChevronUp size={20} className="text-zinc-600" />
                ) : (
                  <ChevronDown size={20} className="text-zinc-600" />
                )}
              </div>
            </button>

            {expandedId === c.patente && (
              <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
                {!historiales[c.patente] ? (
                  <p className="text-zinc-600 text-sm py-2">Cargando historial...</p>
                ) : historiales[c.patente].length === 0 ? (
                  <p className="text-zinc-600 text-sm py-2">Sin trabajos registrados</p>
                ) : (
                  <>
                    <p className="text-zinc-600 text-xs font-bold tracking-widest uppercase mb-3">
                      {historiales[c.patente].length}{' '}
                      {historiales[c.patente].length === 1 ? 'trabajo' : 'trabajos'}
                    </p>
                    <div className="space-y-2">
                      {historiales[c.patente].map(t => (
                        <div
                          key={t.id}
                          className="bg-zinc-800 rounded-xl p-3 flex gap-3 items-start"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-zinc-200 text-sm leading-snug">
                              {t.detalle_trabajo || '—'}
                            </p>
                            {t.repuestos_usados && (
                              <p className="text-zinc-500 text-xs mt-0.5">
                                Rep: {t.repuestos_usados}
                              </p>
                            )}
                            {t.informe_final && (
                              <p className="text-zinc-400 text-xs mt-0.5 italic">
                                {t.informe_final}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-zinc-600 text-xs">{formatFecha(t.fecha)}</p>
                              {t.estado && (
                                <span className="text-zinc-600 text-xs">· {t.estado}</span>
                              )}
                            </div>
                          </div>
                          {t.precio_cobrado > 0 && (
                            <div className="text-right shrink-0">
                              <p className="text-zinc-100 font-bold text-sm">
                                {formatARS(t.precio_cobrado)}
                              </p>
                              <p className="text-orange-500 text-xs">
                                gan. {formatARS(t.ganancia_neta)}
                              </p>
                            </div>
                          )}
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
          <p className="text-zinc-700 text-center py-10 text-sm">
            {query.length >= 2 ? 'Sin resultados para esa búsqueda' : 'No hay clientes registrados'}
          </p>
        )}
      </div>

      {editCliente && (
        <EditClienteModal
          cliente={editCliente}
          onClose={() => setEditCliente(null)}
          onSaved={updated => {
            setClientes(prev => prev.map(c => (c.patente === updated.patente ? updated : c)))
            setEditCliente(null)
          }}
        />
      )}
    </div>
  )
}

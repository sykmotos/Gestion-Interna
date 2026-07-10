import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/utils'
import type { Cliente, Trabajo } from '../types'
import RepuestosSection, {
  type RepuestoItem,
  decrementarStock,
} from '../components/RepuestosSection'
import EditTrabajoModal from '../components/EditTrabajoModal'
import { Search, Pencil } from 'lucide-react'

const ESTADOS = ['En Taller', 'Terminado', 'Entregado'] as const
const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Débito', 'Crédito']

const inp =
  'w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-zinc-100 py-4 px-4 rounded-xl outline-none placeholder:text-zinc-600 transition-colors'

interface EntregaForm {
  precio_cobrado: string
  metodo_pago: string
  informe_final: string
}

function estadoBadge(estado: string) {
  if (estado === 'En Taller') return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  if (estado === 'Terminado') return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  return 'bg-green-500/20 text-green-400 border-green-500/30'
}

export default function Ordenes() {
  // — Persistencia de tab y búsqueda —
  const [tab, setTab] = useState<'nuevo' | 'todas'>(
    () => (localStorage.getItem('ordenes_tab') as 'nuevo' | 'todas') ?? 'nuevo',
  )
  const switchTab = (t: 'nuevo' | 'todas') => {
    setTab(t)
    localStorage.setItem('ordenes_tab', t)
  }

  // — Nuevo ingreso —
  const [patente, setPatente] = useState('')
  const [nombreDueño, setNombreDueño] = useState('')
  const [telefono, setTelefono] = useState('')
  const [dni, setDni] = useState('')
  const [modeloMoto, setModeloMoto] = useState('')
  const [fallaDec, setFallaDec] = useState('')
  const [kilometraje, setKilometraje] = useState('')
  const [sena, setSena] = useState('')
  const [repuestosNuevo, setRepuestosNuevo] = useState<RepuestoItem[]>([])
  const [buscando, setBuscando] = useState(false)
  const [clienteStatus, setClienteStatus] = useState<'existente' | 'nuevo' | null>(null)
  const [guardando, setGuardando] = useState(false)

  // — Ver todas —
  const [trabajos, setTrabajos] = useState<Trabajo[]>([])
  const [clienteMap, setClienteMap] = useState<Record<string, Cliente>>({})
  const [loadingTrabajos, setLoadingTrabajos] = useState(false)
  const [search, setSearch] = useState(() => localStorage.getItem('ordenes_search') ?? '')
  const [pendienteEntrega, setPendienteEntrega] = useState<string | null>(null)
  const [repuestosEntrega, setRepuestosEntrega] = useState<RepuestoItem[]>([])
  const [entregaForm, setEntregaForm] = useState<EntregaForm>({
    precio_cobrado: '',
    metodo_pago: 'Efectivo',
    informe_final: '',
  })
  const [editTrabajo, setEditTrabajo] = useState<Trabajo | null>(null)

  // Autocomplete patente
  useEffect(() => {
    if (patente.length < 3) {
      setClienteStatus(null)
      return
    }
    const timer = setTimeout(async () => {
      setBuscando(true)
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('patente', patente)
        .maybeSingle()
      setBuscando(false)
      if (data) {
        const c = data as Cliente
        setNombreDueño(c.nombre_dueño ?? '')
        setTelefono(c.telefono ?? '')
        setDni(c.dni ?? '')
        setModeloMoto(c.modelo_moto ?? '')
        setClienteStatus('existente')
      } else {
        setClienteStatus('nuevo')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [patente])

  const loadTrabajos = async () => {
    setLoadingTrabajos(true)
    const [{ data: tData }, { data: cData }] = await Promise.all([
      supabase.from('trabajos').select('*').order('fecha', { ascending: false }),
      supabase.from('clientes').select('*'),
    ])
    if (tData) setTrabajos(tData as Trabajo[])
    if (cData) {
      const map: Record<string, Cliente> = {}
      for (const c of cData as Cliente[]) map[c.patente] = c
      setClienteMap(map)
    }
    setLoadingTrabajos(false)
  }

  useEffect(() => {
    if (tab === 'todas') loadTrabajos()
  }, [tab])

  const trabajosFiltrados = useMemo(() => {
    if (!search.trim()) return trabajos
    const q = search.toLowerCase()
    return trabajos.filter(t => {
      const c = clienteMap[t.patente_id]
      return (
        t.patente_id.toLowerCase().includes(q) ||
        c?.nombre_dueño?.toLowerCase().includes(q) ||
        c?.dni?.toLowerCase().includes(q) ||
        c?.modelo_moto?.toLowerCase().includes(q) ||
        c?.telefono?.toLowerCase().includes(q)
      )
    })
  }, [trabajos, clienteMap, search])

  const resetNuevo = () => {
    setPatente('')
    setNombreDueño('')
    setTelefono('')
    setDni('')
    setModeloMoto('')
    setFallaDec('')
    setKilometraje('')
    setSena('')
    setRepuestosNuevo([])
    setClienteStatus(null)
  }

  const costoNuevo = repuestosNuevo.reduce((s, i) => s + i.costo, 0)
  const senaNum = parseFloat(sena) || 0

  const guardarIngreso = async () => {
    if (!patente || guardando) return
    setGuardando(true)
    try {
      await supabase
        .from('clientes')
        .upsert(
          { patente, nombre_dueño: nombreDueño, telefono, dni: dni || null, modelo_moto: modeloMoto },
          { onConflict: 'patente' },
        )

      const { data: nuevoTrabajo, error } = await supabase
        .from('trabajos')
        .insert({
          patente_id: patente,
          detalle_trabajo: fallaDec,
          repuestos_usados: repuestosNuevo.map(r => r.nombre).join(', '),
          costo_repuestos: costoNuevo,
          precio_cobrado: 0,
          ganancia_neta: 0,
          estado: 'En Taller',
          metodo_pago: 'Efectivo',
          repuestos_jsonb: repuestosNuevo,
          kilometraje: kilometraje.trim() || null,
          sena: senaNum,
          saldo_pendiente: 0,
        })
        .select()
        .single()

      if (error) throw error

      // Si hay seña, registrarla en caja
      const ops: Promise<unknown>[] = [decrementarStock(repuestosNuevo)]
      if (senaNum > 0 && nuevoTrabajo) {
        ops.push(
          supabase.from('caja_movimientos').insert({
            tipo: 'ingreso',
            concepto: `Seña Trabajo - ${patente}`,
            monto: senaNum,
            metodo_pago: 'Efectivo',
            trabajo_id: nuevoTrabajo.id,
          }),
        )
      }
      await Promise.all(ops)

      resetNuevo()
      switchTab('todas')
    } catch (err) {
      console.error(err)
      alert('Error al guardar. Revisá los datos.')
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    if (nuevoEstado === 'Entregado') {
      setPendienteEntrega(id)
      setRepuestosEntrega([])
      setEntregaForm({ precio_cobrado: '', metodo_pago: 'Efectivo', informe_final: '' })
      return
    }
    const { error } = await supabase
      .from('trabajos')
      .update({ estado: nuevoEstado })
      .eq('id', id)
    if (!error) {
      setTrabajos(prev => prev.map(t => (t.id === id ? { ...t, estado: nuevoEstado } : t)))
    }
  }

  const confirmarEntrega = async (id: string) => {
    const t = trabajos.find(w => w.id === id)
    const costo = repuestosEntrega.reduce((s, i) => s + i.costo, 0)
    const precio = parseFloat(entregaForm.precio_cobrado) || 0
    const ganancia = precio - costo
    const repuestosStr = repuestosEntrega.map(r => r.nombre).join(', ')
    const cliente = clienteMap[t?.patente_id ?? '']
    const nombreCliente = cliente?.nombre_dueño ?? t?.patente_id ?? ''

    // Lógica de seña: la caja recibe solo el saldo pendiente
    const senaExistente = t?.sena ?? 0
    const saldoPendiente = Math.max(0, precio - senaExistente)

    const { error } = await supabase
      .from('trabajos')
      .update({
        estado: 'Entregado',
        repuestos_usados: repuestosStr,
        costo_repuestos: costo,
        precio_cobrado: precio,
        ganancia_neta: ganancia,
        metodo_pago: entregaForm.metodo_pago,
        informe_final: entregaForm.informe_final.trim() || null,
        repuestos_jsonb: repuestosEntrega,
        saldo_pendiente: saldoPendiente,
      })
      .eq('id', id)

    if (!error) {
      const ops: Promise<unknown>[] = [decrementarStock(repuestosEntrega)]

      // Solo registrar el saldo si es > 0 (para no duplicar si ya se cobró con seña)
      if (saldoPendiente > 0) {
        ops.push(
          supabase.from('caja_movimientos').insert({
            tipo: 'ingreso',
            concepto: `Entrega: ${nombreCliente} (${t?.patente_id ?? ''})`,
            monto: saldoPendiente,
            metodo_pago: entregaForm.metodo_pago,
            trabajo_id: id,
          }),
        )
      }

      await Promise.all(ops)

      setTrabajos(prev =>
        prev.map(w =>
          w.id === id
            ? {
                ...w,
                estado: 'Entregado',
                repuestos_usados: repuestosStr,
                costo_repuestos: costo,
                precio_cobrado: precio,
                ganancia_neta: ganancia,
                metodo_pago: entregaForm.metodo_pago,
                informe_final: entregaForm.informe_final.trim() || null,
                saldo_pendiente: saldoPendiente,
              }
            : w,
        ),
      )
      setPendienteEntrega(null)
    }
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-black text-zinc-100 tracking-wider mb-5">Órdenes</h1>

      {/* Tabs */}
      <div className="flex bg-zinc-900 rounded-xl p-1 mb-6 border border-zinc-800">
        <button
          onClick={() => switchTab('nuevo')}
          className={`flex-1 py-3 rounded-lg text-sm font-black tracking-wide transition-colors ${
            tab === 'nuevo' ? 'bg-orange-500 text-white' : 'text-zinc-500'
          }`}
        >
          NUEVO INGRESO
        </button>
        <button
          onClick={() => { switchTab('todas'); loadTrabajos() }}
          className={`flex-1 py-3 rounded-lg text-sm font-black tracking-wide transition-colors ${
            tab === 'todas' ? 'bg-orange-500 text-white' : 'text-zinc-500'
          }`}
        >
          VER TODAS
        </button>
      </div>

      {/* ── Tab: Nuevo Ingreso ── */}
      {tab === 'nuevo' && (
        <div className="space-y-4">
          {/* Patente */}
          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
              Patente
            </label>
            <div className="relative">
              <input
                type="text"
                value={patente}
                onChange={e => setPatente(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="ABC123"
                autoFocus
                className={`${inp} text-2xl font-black tracking-widest`}
              />
              {buscando && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
                  buscando...
                </span>
              )}
            </div>
            {clienteStatus === 'existente' && (
              <p className="text-green-500 text-sm mt-1.5 font-bold">✓ Cliente encontrado — datos cargados</p>
            )}
            {clienteStatus === 'nuevo' && (
              <p className="text-orange-400 text-sm mt-1.5 font-bold">+ Cliente nuevo</p>
            )}
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Nombre del Dueño</label>
            <input type="text" value={nombreDueño} onChange={e => setNombreDueño(e.target.value)} placeholder="Juan Pérez" className={`${inp} text-xl`} />
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">DNI</label>
            <input type="text" inputMode="numeric" value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} placeholder="12345678" className={`${inp} text-xl`} />
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Teléfono</label>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="11 1234-5678" className={`${inp} text-xl`} />
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Modelo de Moto</label>
            <input type="text" value={modeloMoto} onChange={e => setModeloMoto(e.target.value)} placeholder="Honda XR 150" className={`${inp} text-xl`} />
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Kilometraje (opcional)</label>
            <input type="text" inputMode="numeric" value={kilometraje} onChange={e => setKilometraje(e.target.value)} placeholder="Ej: 15000 km" className={`${inp} text-xl`} />
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Falla Declarada</label>
            <textarea value={fallaDec} onChange={e => setFallaDec(e.target.value)} placeholder="¿Qué le pasa a la moto?" rows={3} className={`${inp} text-lg resize-none`} />
          </div>

          <RepuestosSection items={repuestosNuevo} onChange={setRepuestosNuevo} />

          {/* Seña */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
            <label className="text-zinc-500 text-xs font-bold tracking-widest block uppercase">
              Seña / Adelanto (opcional)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={sena}
              onChange={e => setSena(e.target.value)}
              placeholder="$0"
              className={`${inp} text-2xl font-bold`}
            />
            {senaNum > 0 && (
              <p className="text-green-500 text-xs font-bold pt-1">
                ✓ Se registrará {formatARS(senaNum)} en caja al guardar
              </p>
            )}
          </div>

          <button
            onClick={guardarIngreso}
            disabled={!patente || guardando}
            className="w-full bg-orange-500 active:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-xl py-5 rounded-xl uppercase tracking-wide min-h-[64px] transition-colors"
          >
            {guardando ? 'INGRESANDO...' : 'INGRESAR AL TALLER'}
          </button>
        </div>
      )}

      {/* ── Tab: Ver Todas ── */}
      {tab === 'todas' && (
        <div className="space-y-3">
          <div className="relative mb-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); localStorage.setItem('ordenes_search', e.target.value) }}
              placeholder="Patente, nombre, DNI, teléfono, modelo..."
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 text-zinc-100 py-4 pl-11 pr-4 rounded-xl outline-none placeholder:text-zinc-600 transition-colors"
            />
          </div>

          {loadingTrabajos && (
            <p className="text-zinc-600 text-center py-8 text-sm font-bold tracking-widest">CARGANDO...</p>
          )}

          {trabajosFiltrados.map(t => (
            <div key={t.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-orange-500 font-black text-xl tracking-widest">{t.patente_id}</p>
                      {clienteMap[t.patente_id]?.nombre_dueño && (
                        <p className="text-zinc-400 text-sm font-bold truncate">
                          {clienteMap[t.patente_id].nombre_dueño}
                        </p>
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm mt-0.5 line-clamp-2">{t.detalle_trabajo || '—'}</p>
                    {t.repuestos_usados && (
                      <p className="text-zinc-600 text-xs mt-0.5 line-clamp-1">Rep: {t.repuestos_usados}</p>
                    )}
                    {t.informe_final && (
                      <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2 italic">Informe: {t.informe_final}</p>
                    )}
                    {t.sena > 0 && (
                      <p className="text-yellow-500 text-xs mt-0.5 font-bold">
                        Seña: {formatARS(t.sena)}
                        {t.saldo_pendiente > 0 && ` · Saldo: ${formatARS(t.saldo_pendiente)}`}
                      </p>
                    )}
                    <p className="text-zinc-600 text-xs mt-1">{formatFecha(t.fecha)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <select
                      value={t.estado || 'En Taller'}
                      onChange={e => cambiarEstado(t.id, e.target.value)}
                      className={`text-xs font-bold py-2 px-3 rounded-lg outline-none border bg-transparent cursor-pointer ${estadoBadge(t.estado || 'En Taller')}`}
                    >
                      {ESTADOS.map(e => (
                        <option key={e} value={e} className="bg-zinc-900 text-zinc-100">{e}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setEditTrabajo(t)}
                      className="flex items-center gap-1 text-zinc-500 text-xs font-bold py-1.5 px-3 bg-zinc-800 rounded-lg border border-zinc-700 active:bg-zinc-700"
                    >
                      <Pencil size={13} />
                      EDITAR
                    </button>
                  </div>
                </div>

                {t.estado === 'Entregado' && t.precio_cobrado > 0 && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800">
                    <span className="text-zinc-500 text-xs">Cobrado: {formatARS(t.precio_cobrado)}</span>
                    <span className="text-orange-500 text-xs font-bold">Ganancia: {formatARS(t.ganancia_neta)}</span>
                  </div>
                )}
              </div>

              {/* Formulario de cierre de orden */}
              {pendienteEntrega === t.id && (
                <div className="border-t border-zinc-800 bg-zinc-950 p-4 space-y-4">
                  <p className="text-orange-500 text-xs font-black tracking-widest uppercase">
                    Cerrar orden — Repuestos y cobro
                  </p>

                  <RepuestosSection items={repuestosEntrega} onChange={setRepuestosEntrega} />

                  <div>
                    <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
                      Precio Total Cobrado ($)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={entregaForm.precio_cobrado}
                      onChange={e => setEntregaForm(f => ({ ...f, precio_cobrado: e.target.value }))}
                      placeholder="0"
                      className={`${inp} text-2xl font-bold`}
                    />
                  </div>

                  <select
                    value={entregaForm.metodo_pago}
                    onChange={e => setEntregaForm(f => ({ ...f, metodo_pago: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 py-4 px-4 rounded-xl outline-none"
                  >
                    {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>

                  <div>
                    <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
                      Informe Final (opcional)
                    </label>
                    <textarea
                      value={entregaForm.informe_final}
                      onChange={e => setEntregaForm(f => ({ ...f, informe_final: e.target.value }))}
                      placeholder="¿Qué se hizo? Diagnóstico, repuestos cambiados..."
                      rows={3}
                      className={`${inp} resize-none`}
                    />
                  </div>

                  {/* Preview financiero con seña */}
                  {entregaForm.precio_cobrado && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Repuestos</span>
                        <span className="text-zinc-400">{formatARS(repuestosEntrega.reduce((s, i) => s + i.costo, 0))}</span>
                      </div>
                      {(t.sena ?? 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-yellow-500 font-bold">Seña ya cobrada</span>
                          <span className="text-yellow-500 font-bold">-{formatARS(t.sena ?? 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-zinc-800 pt-1.5">
                        <span className="text-zinc-400 text-xs font-bold">
                          {(t.sena ?? 0) > 0 ? 'Saldo a cobrar hoy' : 'Ganancia neta'}
                        </span>
                        <span className="text-orange-500 font-black text-lg">
                          {(t.sena ?? 0) > 0
                            ? formatARS(Math.max(0, (parseFloat(entregaForm.precio_cobrado) || 0) - (t.sena ?? 0)))
                            : formatARS((parseFloat(entregaForm.precio_cobrado) || 0) - repuestosEntrega.reduce((s, i) => s + i.costo, 0))}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPendienteEntrega(null)}
                      className="flex-1 bg-zinc-800 text-zinc-400 font-bold py-4 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => confirmarEntrega(t.id)}
                      disabled={!entregaForm.precio_cobrado}
                      className="flex-1 bg-orange-500 active:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-4 rounded-xl uppercase tracking-wide"
                    >
                      CONFIRMAR
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {!loadingTrabajos && trabajosFiltrados.length === 0 && (
            <p className="text-zinc-700 text-center py-10 text-sm">
              {search ? 'Sin resultados para esa búsqueda' : 'Sin órdenes registradas'}
            </p>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editTrabajo && (
        <EditTrabajoModal
          trabajo={editTrabajo}
          onClose={() => setEditTrabajo(null)}
          onSaved={updated => {
            setTrabajos(prev => prev.map(t => (t.id === updated.id ? updated : t)))
            setEditTrabajo(null)
          }}
        />
      )}
    </div>
  )
}

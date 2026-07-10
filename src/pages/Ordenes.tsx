import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/utils'
import type { Cliente, Trabajo } from '../types'
import RepuestosSection, {
  type RepuestoItem,
  decrementarStock,
} from '../components/RepuestosSection'

const ESTADOS = ['En Taller', 'Terminado', 'Entregado'] as const
const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Débito', 'Crédito']

const inp =
  'w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-zinc-100 py-4 px-4 rounded-xl outline-none placeholder:text-zinc-600 transition-colors'

interface EntregaForm {
  precio_cobrado: string
  metodo_pago: string
}

function estadoBadge(estado: string) {
  if (estado === 'En Taller') return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  if (estado === 'Terminado') return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  return 'bg-green-500/20 text-green-400 border-green-500/30'
}

export default function Ordenes() {
  const [tab, setTab] = useState<'nuevo' | 'todas'>('nuevo')

  // — Nuevo ingreso —
  const [patente, setPatente] = useState('')
  const [nombreDueño, setNombreDueño] = useState('')
  const [telefono, setTelefono] = useState('')
  const [modeloMoto, setModeloMoto] = useState('')
  const [fallaDec, setFallaDec] = useState('')
  const [repuestosNuevo, setRepuestosNuevo] = useState<RepuestoItem[]>([])
  const [buscando, setBuscando] = useState(false)
  const [clienteStatus, setClienteStatus] = useState<'existente' | 'nuevo' | null>(null)
  const [guardando, setGuardando] = useState(false)

  // — Ver todas —
  const [trabajos, setTrabajos] = useState<Trabajo[]>([])
  const [loadingTrabajos, setLoadingTrabajos] = useState(false)
  const [pendienteEntrega, setPendienteEntrega] = useState<string | null>(null)
  const [repuestosEntrega, setRepuestosEntrega] = useState<RepuestoItem[]>([])
  const [entregaForm, setEntregaForm] = useState<EntregaForm>({
    precio_cobrado: '',
    metodo_pago: 'Efectivo',
  })

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
    const { data } = await supabase
      .from('trabajos')
      .select('*')
      .order('fecha', { ascending: false })
    if (data) setTrabajos(data as Trabajo[])
    setLoadingTrabajos(false)
  }

  useEffect(() => {
    if (tab === 'todas') loadTrabajos()
  }, [tab])

  const resetNuevo = () => {
    setPatente('')
    setNombreDueño('')
    setTelefono('')
    setModeloMoto('')
    setFallaDec('')
    setRepuestosNuevo([])
    setClienteStatus(null)
  }

  const costoNuevo = repuestosNuevo.reduce((s, i) => s + i.costo, 0)

  const guardarIngreso = async () => {
    if (!patente || guardando) return
    setGuardando(true)
    try {
      await supabase
        .from('clientes')
        .upsert(
          { patente, nombre_dueño: nombreDueño, telefono, modelo_moto: modeloMoto },
          { onConflict: 'patente' },
        )
      const { error } = await supabase.from('trabajos').insert({
        patente_id: patente,
        detalle_trabajo: fallaDec,
        repuestos_usados: repuestosNuevo.map(r => r.nombre).join(', '),
        costo_repuestos: costoNuevo,
        precio_cobrado: 0,
        ganancia_neta: 0,
        estado: 'En Taller',
        metodo_pago: 'Efectivo',
      })
      if (error) throw error
      await decrementarStock(repuestosNuevo)
      resetNuevo()
      setTab('todas')
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
      setEntregaForm({ precio_cobrado: '', metodo_pago: 'Efectivo' })
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
    const costo = repuestosEntrega.reduce((s, i) => s + i.costo, 0)
    const precio = parseFloat(entregaForm.precio_cobrado) || 0
    const ganancia = precio - costo
    const repuestosStr = repuestosEntrega.map(r => r.nombre).join(', ')

    const { error } = await supabase
      .from('trabajos')
      .update({
        estado: 'Entregado',
        repuestos_usados: repuestosStr,
        costo_repuestos: costo,
        precio_cobrado: precio,
        ganancia_neta: ganancia,
        metodo_pago: entregaForm.metodo_pago,
      })
      .eq('id', id)

    if (!error) {
      await decrementarStock(repuestosEntrega)
      setTrabajos(prev =>
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                estado: 'Entregado',
                repuestos_usados: repuestosStr,
                costo_repuestos: costo,
                precio_cobrado: precio,
                ganancia_neta: ganancia,
                metodo_pago: entregaForm.metodo_pago,
              }
            : t,
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
          onClick={() => setTab('nuevo')}
          className={`flex-1 py-3 rounded-lg text-sm font-black tracking-wide transition-colors ${
            tab === 'nuevo' ? 'bg-orange-500 text-white' : 'text-zinc-500'
          }`}
        >
          NUEVO INGRESO
        </button>
        <button
          onClick={() => { setTab('todas'); loadTrabajos() }}
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
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
              Nombre del Dueño
            </label>
            <input
              type="text"
              value={nombreDueño}
              onChange={e => setNombreDueño(e.target.value)}
              placeholder="Juan Pérez"
              className={`${inp} text-xl`}
            />
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
              Teléfono
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="11 1234-5678"
              className={`${inp} text-xl`}
            />
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
              Modelo de Moto
            </label>
            <input
              type="text"
              value={modeloMoto}
              onChange={e => setModeloMoto(e.target.value)}
              placeholder="Honda XR 150"
              className={`${inp} text-xl`}
            />
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
              Falla Declarada
            </label>
            <textarea
              value={fallaDec}
              onChange={e => setFallaDec(e.target.value)}
              placeholder="¿Qué le pasa a la moto?"
              rows={3}
              className={`${inp} text-lg resize-none`}
            />
          </div>

          {/* Repuestos */}
          <RepuestosSection items={repuestosNuevo} onChange={setRepuestosNuevo} />

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
          {loadingTrabajos && (
            <p className="text-zinc-600 text-center py-8 text-sm font-bold tracking-widest">
              CARGANDO...
            </p>
          )}

          {trabajos.map(t => (
            <div key={t.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              {/* Cabecera */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-orange-500 font-black text-xl tracking-widest">{t.patente_id}</p>
                    <p className="text-zinc-400 text-sm mt-0.5 line-clamp-2">
                      {t.detalle_trabajo || '—'}
                    </p>
                    {t.repuestos_usados && (
                      <p className="text-zinc-600 text-xs mt-0.5 line-clamp-1">
                        Rep: {t.repuestos_usados}
                      </p>
                    )}
                    <p className="text-zinc-600 text-xs mt-1">{formatFecha(t.fecha)}</p>
                  </div>

                  <select
                    value={t.estado || 'En Taller'}
                    onChange={e => cambiarEstado(t.id, e.target.value)}
                    className={`text-xs font-bold py-2 px-3 rounded-lg outline-none border shrink-0 bg-transparent cursor-pointer ${estadoBadge(t.estado || 'En Taller')}`}
                  >
                    {ESTADOS.map(e => (
                      <option key={e} value={e} className="bg-zinc-900 text-zinc-100">
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                {t.estado === 'Entregado' && t.precio_cobrado > 0 && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800">
                    <span className="text-zinc-500 text-xs">Cobrado: {formatARS(t.precio_cobrado)}</span>
                    <span className="text-orange-500 text-xs font-bold">
                      Ganancia: {formatARS(t.ganancia_neta)}
                    </span>
                  </div>
                )}
              </div>

              {/* Formulario de cierre de orden */}
              {pendienteEntrega === t.id && (
                <div className="border-t border-zinc-800 bg-zinc-950 p-4 space-y-4">
                  <p className="text-orange-500 text-xs font-black tracking-widest uppercase">
                    Cerrar orden — Repuestos y cobro
                  </p>

                  {/* Repuestos con descuento automático de stock */}
                  <RepuestosSection
                    items={repuestosEntrega}
                    onChange={setRepuestosEntrega}
                  />

                  <div>
                    <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
                      Precio Cobrado al Cliente ($)
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
                    {METODOS_PAGO.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  {/* Preview de ganancia */}
                  {entregaForm.precio_cobrado && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex justify-between items-center">
                      <div>
                        <p className="text-zinc-600 text-xs">Repuestos: {formatARS(repuestosEntrega.reduce((s, i) => s + i.costo, 0))}</p>
                        <p className="text-zinc-500 text-xs font-bold">Ganancia neta</p>
                      </div>
                      <span className="text-orange-500 font-black text-xl">
                        {formatARS(
                          (parseFloat(entregaForm.precio_cobrado) || 0) -
                            repuestosEntrega.reduce((s, i) => s + i.costo, 0),
                        )}
                      </span>
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

          {!loadingTrabajos && trabajos.length === 0 && (
            <p className="text-zinc-700 text-center py-10 text-sm">Sin órdenes registradas</p>
          )}
        </div>
      )}
    </div>
  )
}

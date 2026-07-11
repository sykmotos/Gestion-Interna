import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/utils'
import type { Trabajo } from '../types'
import { X } from 'lucide-react'
import RepuestosSection, {
  type RepuestoItem,
  decrementarStock,
  incrementarStock,
} from './RepuestosSection'

const ESTADOS = ['En Taller', 'Terminado', 'Entregado'] as const
const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Débito', 'Crédito']

const inp =
  'w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-zinc-100 py-4 px-4 rounded-xl outline-none placeholder:text-zinc-600 transition-colors'

interface Props {
  trabajo: Trabajo
  onClose: () => void
  onSaved: (updated: Trabajo) => void
}

export default function EditTrabajoModal({ trabajo, onClose, onSaved }: Props) {
  const [detalle, setDetalle] = useState(trabajo.detalle_trabajo ?? '')
  const [kilometraje, setKilometraje] = useState(trabajo.kilometraje ?? '')
  const [estado, setEstado] = useState(trabajo.estado ?? 'En Taller')
  const [metodo, setMetodo] = useState(trabajo.metodo_pago ?? 'Efectivo')
  const [manoDeObra, setManoDeObra] = useState(trabajo.mano_de_obra > 0 ? String(trabajo.mano_de_obra) : '')
  const [sena, setSena] = useState(trabajo.sena > 0 ? String(trabajo.sena) : '')
  const [informeFinal, setInformeFinal] = useState(trabajo.informe_final ?? '')
  const [repuestos, setRepuestos] = useState<RepuestoItem[]>(
    (trabajo.repuestos_jsonb ?? []) as RepuestoItem[],
  )
  const [guardando, setGuardando] = useState(false)

  const repuestosOriginales = (trabajo.repuestos_jsonb ?? []) as RepuestoItem[]

  const nuevoCosto = repuestos.reduce((s, r) => s + r.costo, 0)
  const manoDeObraNum = parseFloat(manoDeObra) || 0
  const senaNum = parseFloat(sena) || 0
  const totalCobrado = nuevoCosto + manoDeObraNum
  const ganancia = manoDeObraNum
  const saldoPendiente = Math.max(0, totalCobrado - senaNum)

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)

    const keysOriginales = new Set(repuestosOriginales.map(r => r.key))
    const keysNuevos = new Set(repuestos.map(r => r.key))
    const agregados = repuestos.filter(r => !keysOriginales.has(r.key))
    const eliminados = repuestosOriginales.filter(r => !keysNuevos.has(r.key))

    const updates = {
      detalle_trabajo: detalle.trim(),
      kilometraje: kilometraje.trim() || null,
      estado,
      metodo_pago: metodo,
      mano_de_obra: manoDeObraNum,
      precio_cobrado: totalCobrado,
      sena: senaNum,
      saldo_pendiente: saldoPendiente,
      ganancia_neta: ganancia,
      informe_final: informeFinal.trim() || null,
      repuestos_usados: repuestos.map(r => r.nombre).join(', '),
      costo_repuestos: nuevoCosto,
      repuestos_jsonb: repuestos,
    }

    const { error } = await supabase
      .from('trabajos')
      .update(updates)
      .eq('id', trabajo.id)

    if (!error) {
      await Promise.all([
        decrementarStock(agregados),
        incrementarStock(eliminados),
      ])
      onSaved({ ...trabajo, ...updates })
    }
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-end">
      <div className="w-full max-w-lg mx-auto bg-zinc-900 rounded-t-2xl border-t border-zinc-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-100 font-black text-lg">Editar Orden</p>
            <p className="text-orange-500 font-black text-base tracking-widest">{trabajo.patente_id}</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 p-1">
            <X size={22} />
          </button>
        </div>

        {/* Falla / Descripción */}
        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Falla / Descripción</label>
          <textarea
            value={detalle}
            onChange={e => setDetalle(e.target.value)}
            placeholder="Descripción del trabajo..."
            rows={3}
            className={`${inp} resize-none`}
          />
        </div>

        {/* Kilometraje */}
        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Kilometraje</label>
          <input
            type="text"
            inputMode="numeric"
            value={kilometraje}
            onChange={e => setKilometraje(e.target.value)}
            placeholder="Ej: 15000 km"
            className={inp}
          />
        </div>

        {/* Repuestos con diff de stock */}
        <RepuestosSection items={repuestos} onChange={setRepuestos} />

        {/* ── Bloque financiero ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Cobro</p>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
              Mano de Obra ($)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={manoDeObra}
              onChange={e => setManoDeObra(e.target.value)}
              placeholder="$0"
              className={`${inp} text-2xl font-bold`}
            />
          </div>

          <div>
            <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
              Seña / Adelanto ($)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={sena}
              onChange={e => setSena(e.target.value)}
              placeholder="$0"
              className={`${inp} text-2xl font-bold`}
            />
          </div>

          {/* Resumen financiero */}
          {(totalCobrado > 0 || senaNum > 0) && (
            <div className="border-t border-zinc-800 pt-3 space-y-1.5">
              {nuevoCosto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Repuestos</span>
                  <span className="text-zinc-300">{formatARS(nuevoCosto)}</span>
                </div>
              )}
              {manoDeObraNum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Mano de obra</span>
                  <span className="text-zinc-300">{formatARS(manoDeObraNum)}</span>
                </div>
              )}
              {senaNum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-500 font-bold">Seña</span>
                  <span className="text-yellow-500 font-bold">-{formatARS(senaNum)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-zinc-700 pt-2 mt-1">
                <span className="text-zinc-300 font-black text-sm uppercase tracking-wide">
                  Saldo Pendiente
                </span>
                <span className="text-orange-500 font-black text-2xl">
                  {formatARS(saldoPendiente)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Estado */}
        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Estado</label>
          <select
            value={estado}
            onChange={e => setEstado(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 py-4 px-4 rounded-xl outline-none"
          >
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Método de pago */}
        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Método de Pago</label>
          <select
            value={metodo}
            onChange={e => setMetodo(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 py-4 px-4 rounded-xl outline-none"
          >
            {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Informe final */}
        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Informe Final</label>
          <textarea
            value={informeFinal}
            onChange={e => setInformeFinal(e.target.value)}
            placeholder="¿Qué se hizo? Diagnóstico final, trabajos realizados..."
            rows={5}
            className={`${inp} resize-none`}
          />
        </div>

        <div className="flex gap-2 pt-1 pb-2">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 text-zinc-400 font-bold py-4 rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 bg-orange-500 active:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-4 rounded-xl uppercase tracking-wide"
          >
            {guardando ? 'GUARDANDO...' : 'GUARDAR'}
          </button>
        </div>
      </div>
    </div>
  )
}

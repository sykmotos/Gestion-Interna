import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/utils'
import type { Cliente, Trabajo } from '../types'
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

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-orange-500 text-xs font-black tracking-widest uppercase">{children}</span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
}

interface Props {
  trabajo: Trabajo
  cliente: Cliente | null
  onClose: () => void
  onSaved: (updated: Trabajo, updatedCliente: Cliente) => void
}

export default function EditTrabajoModal({ trabajo, cliente, onClose, onSaved }: Props) {
  // ── Cliente ──
  const [nombreDueño, setNombreDueño] = useState(cliente?.nombre_dueño ?? '')
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '')
  const [dni, setDni] = useState(cliente?.dni ?? '')

  // ── Vehículo ──
  const [patente, setPatente] = useState(trabajo.patente_id)
  const [modeloMoto, setModeloMoto] = useState(cliente?.modelo_moto ?? '')
  const [kilometraje, setKilometraje] = useState(trabajo.kilometraje ?? '')

  // ── Taller ──
  const [detalle, setDetalle] = useState(trabajo.detalle_trabajo ?? '')

  // ── Repuestos ──
  const [repuestos, setRepuestos] = useState<RepuestoItem[]>(
    (trabajo.repuestos_jsonb ?? []) as RepuestoItem[],
  )
  const repuestosOriginales = (trabajo.repuestos_jsonb ?? []) as RepuestoItem[]

  // ── Finanzas ──
  const [manoDeObra, setManoDeObra] = useState(
    trabajo.mano_de_obra > 0 ? String(trabajo.mano_de_obra) : '',
  )
  const [manoObraIncluida, setManoObraIncluida] = useState(trabajo.mano_obra_incluida ?? false)
  const [sena, setSena] = useState(trabajo.sena > 0 ? String(trabajo.sena) : '')

  // ── Cierre ──
  const [estado, setEstado] = useState(trabajo.estado ?? 'En Taller')
  const [metodo, setMetodo] = useState(trabajo.metodo_pago ?? 'Efectivo')
  const [informeFinal, setInformeFinal] = useState(trabajo.informe_final ?? '')

  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Cálculos en tiempo real
  const nuevoCosto = repuestos.reduce((s, r) => s + r.costo, 0)
  const manoDeObraNum = manoObraIncluida ? 0 : (parseFloat(manoDeObra) || 0)
  const senaNum = parseFloat(sena) || 0
  const totalCobrado = nuevoCosto + manoDeObraNum
  const saldoPendiente = Math.max(0, totalCobrado - senaNum)

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    setErrorMsg('')

    try {
      const patenteNueva = patente.trim().toUpperCase().replace(/\s/g, '')

      // Actualizar cliente
      if (cliente) {
        const { error: errC } = await supabase
          .from('clientes')
          .update({
            patente: patenteNueva,
            nombre_dueño: nombreDueño.trim(),
            telefono: telefono.trim(),
            dni: dni.trim() || null,
            modelo_moto: modeloMoto.trim(),
          })
          .eq('patente', cliente.patente)
        if (errC) throw errC
      }

      // Diff de stock
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
        mano_obra_incluida: manoObraIncluida,
        precio_cobrado: totalCobrado,
        sena: senaNum,
        saldo_pendiente: saldoPendiente,
        ganancia_neta: manoDeObraNum,
        informe_final: informeFinal.trim() || null,
        repuestos_usados: repuestos.map(r => r.nombre).join(', '),
        costo_repuestos: nuevoCosto,
        repuestos_jsonb: repuestos,
      }

      const { error: errT } = await supabase
        .from('trabajos')
        .update(updates)
        .eq('id', trabajo.id)
      if (errT) throw errT

      await Promise.all([decrementarStock(agregados), incrementarStock(eliminados)])

      const updatedCliente: Cliente = {
        id: cliente?.id ?? '',
        patente: patenteNueva,
        nombre_dueño: nombreDueño.trim(),
        telefono: telefono.trim(),
        dni: dni.trim() || null,
        modelo_moto: modeloMoto.trim(),
      }

      onSaved({ ...trabajo, ...updates, patente_id: patenteNueva }, updatedCliente)
    } catch (e) {
      console.error(e)
      setErrorMsg('Error al guardar. Revisá la consola.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-end">
      <div className="w-full max-w-lg mx-auto bg-zinc-900 rounded-t-2xl border-t border-zinc-800 p-5 space-y-4 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 bg-zinc-900 pb-2 -mx-5 px-5 pt-1 border-b border-zinc-800 z-10">
          <div>
            <p className="text-zinc-100 font-black text-lg">Editar Orden</p>
            <p className="text-orange-500 font-black text-sm tracking-widest">{trabajo.patente_id}</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 active:text-zinc-300 p-2">
            <X size={22} />
          </button>
        </div>

        {/* ── CLIENTE ── */}
        <SectionTitle>Cliente</SectionTitle>

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Nombre del Dueño</label>
          <input
            type="text"
            value={nombreDueño}
            onChange={e => setNombreDueño(e.target.value)}
            placeholder="Juan Pérez"
            className={inp}
          />
        </div>

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Teléfono</label>
          <input
            type="tel"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            placeholder="11 1234-5678"
            className={inp}
          />
        </div>

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">DNI</label>
          <input
            type="text"
            inputMode="numeric"
            value={dni}
            onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
            placeholder="12345678"
            className={inp}
          />
        </div>

        {/* ── VEHÍCULO ── */}
        <SectionTitle>Vehículo</SectionTitle>

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Patente</label>
          <input
            type="text"
            value={patente}
            onChange={e => setPatente(e.target.value.toUpperCase().replace(/\s/g, ''))}
            placeholder="ABC123"
            className={`${inp} font-black tracking-widest text-xl`}
          />
        </div>

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Marca / Modelo</label>
          <input
            type="text"
            value={modeloMoto}
            onChange={e => setModeloMoto(e.target.value)}
            placeholder="Honda XR 150"
            className={inp}
          />
        </div>

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

        {/* ── TALLER ── */}
        <SectionTitle>Taller</SectionTitle>

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Falla Declarada</label>
          <textarea
            value={detalle}
            onChange={e => setDetalle(e.target.value)}
            placeholder="¿Qué le pasa a la moto?"
            rows={3}
            className={`${inp} resize-none`}
          />
        </div>

        {/* ── REPUESTOS ── */}
        <SectionTitle>Repuestos</SectionTitle>

        <RepuestosSection items={repuestos} onChange={setRepuestos} />

        {/* ── FINANZAS ── */}
        <SectionTitle>Finanzas</SectionTitle>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          {/* Mano de obra + checkbox */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-zinc-500 text-xs font-bold tracking-widest uppercase">
                Mano de Obra ($)
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={manoObraIncluida}
                  onChange={e => setManoObraIncluida(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 cursor-pointer"
                />
                <span className="text-zinc-400 text-xs font-bold">Incluida en precio</span>
              </label>
            </div>
            <input
              type="number"
              inputMode="decimal"
              value={manoObraIncluida ? '' : manoDeObra}
              onChange={e => setManoDeObra(e.target.value)}
              placeholder={manoObraIncluida ? 'Incluida' : '$0'}
              disabled={manoObraIncluida}
              className={`${inp} text-2xl font-bold ${manoObraIncluida ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Seña */}
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
              {manoObraIncluida && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Mano de obra</span>
                  <span className="text-green-500 font-bold">Incluida</span>
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

        {/* ── CIERRE ── */}
        <SectionTitle>Cierre</SectionTitle>

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

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">Informe Final Técnico</label>
          <textarea
            value={informeFinal}
            onChange={e => setInformeFinal(e.target.value)}
            placeholder="Diagnóstico final, trabajos realizados, observaciones..."
            rows={5}
            className={`${inp} resize-none`}
          />
        </div>

        {errorMsg && (
          <p className="text-red-400 text-sm font-bold text-center">{errorMsg}</p>
        )}

        <div className="flex gap-2 pt-1 pb-4">
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
            {guardando ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/utils'
import type { CajaMovimiento } from '../types'
import { X } from 'lucide-react'

const METODOS = ['Efectivo', 'Transferencia'] as const
const inp =
  'w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-zinc-100 py-4 px-4 rounded-xl outline-none placeholder:text-zinc-600 transition-colors'

interface MovForm {
  concepto: string
  monto: string
  metodo_pago: string
}

export default function Caja() {
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalTipo, setModalTipo] = useState<'ingreso' | 'egreso' | null>(null)
  const [showCierreConfirm, setShowCierreConfirm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState<MovForm>({ concepto: '', monto: '', metodo_pago: 'Efectivo' })

  const load = async () => {
    setLoading(true)
    const { data: ultimoCierre } = await supabase
      .from('caja_movimientos')
      .select('fecha')
      .eq('tipo', 'cierre')
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()

    let q = supabase
      .from('caja_movimientos')
      .select('*')
      .order('fecha', { ascending: false })

    if (ultimoCierre) {
      q = q.gt('fecha', ultimoCierre.fecha)
    }

    const { data } = await q
    setMovimientos((data as CajaMovimiento[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Métricas del turno actual
  const efectivo = movimientos
    .filter(m => m.tipo !== 'cierre' && m.metodo_pago === 'Efectivo')
    .reduce((s, m) => m.tipo === 'ingreso' ? s + m.monto : s - m.monto, 0)

  const transferencia = movimientos
    .filter(m => m.tipo !== 'cierre' && m.metodo_pago !== 'Efectivo')
    .reduce((s, m) => m.tipo === 'ingreso' ? s + m.monto : s - m.monto, 0)

  const total = efectivo + transferencia

  const guardarMovimiento = async () => {
    if (!form.concepto.trim() || !form.monto || guardando) return
    setGuardando(true)
    await supabase.from('caja_movimientos').insert({
      tipo: modalTipo,
      concepto: form.concepto.trim(),
      monto: parseFloat(form.monto) || 0,
      metodo_pago: form.metodo_pago,
    })
    setForm({ concepto: '', monto: '', metodo_pago: 'Efectivo' })
    setModalTipo(null)
    setGuardando(false)
    load()
  }

  const cerrarCaja = async () => {
    setGuardando(true)
    await supabase.from('caja_movimientos').insert({
      tipo: 'cierre',
      concepto: 'Cierre de Caja',
      monto: 0,
      metodo_pago: 'Efectivo',
    })
    setShowCierreConfirm(false)
    setGuardando(false)
    load()
  }

  const formatHora = (fecha: string) =>
    new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  const openModal = (tipo: 'ingreso' | 'egreso') => {
    setForm({ concepto: '', monto: '', metodo_pago: 'Efectivo' })
    setModalTipo(tipo)
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-black text-zinc-100 tracking-wider mb-5">Caja</h1>

      {/* Métricas del turno */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center">
          <p className="text-zinc-600 text-[10px] font-bold tracking-widest uppercase mb-1">Efectivo</p>
          <p className={`font-black text-lg ${efectivo < 0 ? 'text-red-400' : 'text-zinc-100'}`}>
            {formatARS(efectivo)}
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center">
          <p className="text-zinc-600 text-[10px] font-bold tracking-widest uppercase mb-1">Transfer.</p>
          <p className={`font-black text-lg ${transferencia < 0 ? 'text-red-400' : 'text-zinc-100'}`}>
            {formatARS(transferencia)}
          </p>
        </div>
        <div className="bg-orange-500 rounded-xl p-3 text-center">
          <p className="text-orange-950 text-[10px] font-black tracking-widest uppercase mb-1">Total</p>
          <p className="text-white font-black text-lg">{formatARS(total)}</p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <button
          onClick={() => openModal('ingreso')}
          className="bg-green-500/20 border border-green-500/30 text-green-400 font-black py-4 px-2 rounded-xl text-xs tracking-wide uppercase active:bg-green-500/30 transition-colors"
        >
          🟢 INGRESO
        </button>
        <button
          onClick={() => openModal('egreso')}
          className="bg-red-500/20 border border-red-500/30 text-red-400 font-black py-4 px-2 rounded-xl text-xs tracking-wide uppercase active:bg-red-500/30 transition-colors"
        >
          🔴 EGRESO
        </button>
        <button
          onClick={() => setShowCierreConfirm(true)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-400 font-black py-4 px-2 rounded-xl text-xs tracking-wide uppercase active:bg-zinc-700 transition-colors"
        >
          🔒 CERRAR
        </button>
      </div>

      {/* Confirmación cierre */}
      {showCierreConfirm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-4">
          <p className="text-zinc-100 font-bold mb-1">¿Cerrar la caja del turno?</p>
          <p className="text-zinc-500 text-sm mb-4">
            Registrará un cierre. El próximo turno arranca desde cero.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCierreConfirm(false)}
              className="flex-1 bg-zinc-800 text-zinc-400 font-bold py-3 rounded-xl text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={cerrarCaja}
              disabled={guardando}
              className="flex-1 bg-zinc-700 text-zinc-200 font-black py-3 rounded-xl text-sm uppercase tracking-wide"
            >
              {guardando ? '...' : 'CONFIRMAR CIERRE'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de movimientos */}
      <p className="text-zinc-600 text-xs font-bold tracking-widest uppercase mb-3">
        Movimientos del Turno
      </p>

      {loading && (
        <p className="text-zinc-700 text-center py-8 text-sm font-bold tracking-widest">CARGANDO...</p>
      )}

      <div className="space-y-2">
        {movimientos.map(m => {
          if (m.tipo === 'cierre') {
            return (
              <div key={m.id} className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-zinc-700" />
                <span className="text-zinc-600 text-xs font-bold tracking-widest uppercase shrink-0">
                  CIERRE {formatHora(m.fecha)}
                </span>
                <div className="flex-1 h-px bg-zinc-700" />
              </div>
            )
          }
          const esIngreso = m.tipo === 'ingreso'
          return (
            <div
              key={m.id}
              className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-zinc-100 text-sm font-bold leading-tight truncate">{m.concepto}</p>
                <p className="text-zinc-600 text-xs mt-0.5">
                  {m.metodo_pago} · {formatHora(m.fecha)}
                </p>
              </div>
              <p className={`font-black text-base shrink-0 ${esIngreso ? 'text-green-400' : 'text-red-400'}`}>
                {esIngreso ? '+' : '-'}{formatARS(m.monto)}
              </p>
            </div>
          )
        })}
        {!loading && movimientos.length === 0 && (
          <p className="text-zinc-700 text-center py-8 text-sm">Sin movimientos en este turno</p>
        )}
      </div>

      {/* Modal Ingreso / Egreso */}
      {modalTipo && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-end">
          <div className="w-full max-w-lg mx-auto bg-zinc-900 rounded-t-2xl border-t border-zinc-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-zinc-100 font-black text-lg">
                {modalTipo === 'ingreso' ? '🟢 Ingreso Manual' : '🔴 Egreso / Gasto'}
              </p>
              <button type="button" onClick={() => setModalTipo(null)} className="text-zinc-500 p-1">
                <X size={22} />
              </button>
            </div>

            <input
              type="text"
              value={form.concepto}
              onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
              placeholder="Concepto *"
              autoFocus
              className={inp}
            />
            <input
              type="number"
              inputMode="decimal"
              value={form.monto}
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
              placeholder="Monto ($) *"
              className={`${inp} text-2xl font-bold`}
            />
            <select
              value={form.metodo_pago}
              onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 py-4 px-4 rounded-xl outline-none"
            >
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <button
              onClick={guardarMovimiento}
              disabled={!form.concepto.trim() || !form.monto || guardando}
              className="w-full bg-orange-500 active:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-5 rounded-xl uppercase tracking-wide min-h-[64px]"
            >
              {guardando ? 'GUARDANDO...' : 'GUARDAR'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

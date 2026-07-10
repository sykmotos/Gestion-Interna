import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Trabajo } from '../types'
import { X } from 'lucide-react'

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
  const [estado, setEstado] = useState(trabajo.estado ?? 'En Taller')
  const [metodo, setMetodo] = useState(trabajo.metodo_pago ?? 'Efectivo')
  const [informeFinal, setInformeFinal] = useState(trabajo.informe_final ?? '')
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    const updates = {
      detalle_trabajo: detalle.trim(),
      estado,
      metodo_pago: metodo,
      informe_final: informeFinal.trim() || null,
    }
    const { error } = await supabase
      .from('trabajos')
      .update(updates)
      .eq('id', trabajo.id)

    if (!error) {
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

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Falla / Descripción
          </label>
          <textarea
            value={detalle}
            onChange={e => setDetalle(e.target.value)}
            placeholder="Descripción del trabajo..."
            rows={3}
            className={`${inp} resize-none`}
          />
        </div>

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Estado
          </label>
          <select
            value={estado}
            onChange={e => setEstado(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 py-4 px-4 rounded-xl outline-none"
          >
            {ESTADOS.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Método de Pago
          </label>
          <select
            value={metodo}
            onChange={e => setMetodo(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 py-4 px-4 rounded-xl outline-none"
          >
            {METODOS_PAGO.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Informe Final (opcional)
          </label>
          <textarea
            value={informeFinal}
            onChange={e => setInformeFinal(e.target.value)}
            placeholder="¿Qué se hizo? Diagnóstico final, trabajos realizados..."
            rows={4}
            className={`${inp} resize-none`}
          />
        </div>

        <div className="flex gap-2 pt-1">
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

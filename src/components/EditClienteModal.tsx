import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../types'
import { X } from 'lucide-react'

const inp =
  'w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-zinc-100 py-4 px-4 rounded-xl outline-none placeholder:text-zinc-600 transition-colors'

interface Props {
  cliente: Cliente
  onClose: () => void
  onSaved: (updated: Cliente) => void
}

export default function EditClienteModal({ cliente, onClose, onSaved }: Props) {
  const [nombre, setNombre] = useState(cliente.nombre_dueño ?? '')
  const [telefono, setTelefono] = useState(cliente.telefono ?? '')
  const [dni, setDni] = useState(cliente.dni ?? '')
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    const updates = {
      nombre_dueño: nombre.trim(),
      telefono: telefono.trim(),
      dni: dni.trim() || null,
    }
    const { error } = await supabase
      .from('clientes')
      .update(updates)
      .eq('patente', cliente.patente)

    if (!error) {
      onSaved({ ...cliente, ...updates })
    }
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-end">
      <div className="w-full max-w-lg mx-auto bg-zinc-900 rounded-t-2xl border-t border-zinc-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-100 font-black text-lg">Editar Cliente</p>
            <p className="text-orange-500 font-black text-base tracking-widest">{cliente.patente}</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 p-1">
            <X size={22} />
          </button>
        </div>

        <div>
          <label className="text-zinc-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Nombre del Dueño
          </label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Juan Pérez"
            autoFocus
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
            DNI
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={dni}
            onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
            placeholder="12345678"
            className={`${inp} text-xl`}
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

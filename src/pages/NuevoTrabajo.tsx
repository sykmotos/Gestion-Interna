import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../types'

const inputBase =
  'w-full bg-gray-900 border-2 border-gray-700 focus:border-green-500 text-white py-4 px-4 rounded-2xl outline-none'

export default function NuevoTrabajo() {
  const navigate = useNavigate()

  const [patente, setPatente] = useState('')
  const [nombreDueño, setNombreDueño] = useState('')
  const [telefono, setTelefono] = useState('')
  const [modeloMoto, setModeloMoto] = useState('')
  const [detalleTrabajo, setDetalleTrabajo] = useState('')
  const [repuestosUsados, setRepuestosUsados] = useState('')
  const [costoRepuestos, setCostoRepuestos] = useState('')
  const [precioCobrado, setPrecioCobrado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [clienteStatus, setClienteStatus] = useState<'existente' | 'nuevo' | null>(null)

  useEffect(() => {
    if (patente.length < 3) {
      setClienteStatus(null)
      setNombreDueño('')
      setTelefono('')
      setModeloMoto('')
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

  const ganancia = (parseFloat(precioCobrado) || 0) - (parseFloat(costoRepuestos) || 0)
  const puedeGuardar = patente.length >= 3 && precioCobrado !== '' && !guardando

  const guardar = async () => {
    if (!puedeGuardar) return
    setGuardando(true)
    try {
      const { error: errCliente } = await supabase
        .from('clientes')
        .upsert(
          { patente, nombre_dueño: nombreDueño, telefono, modelo_moto: modeloMoto },
          { onConflict: 'patente' },
        )
      if (errCliente) throw errCliente

      const { error: errTrabajo } = await supabase.from('trabajos').insert({
        patente_id: patente,
        detalle_trabajo: detalleTrabajo,
        repuestos_usados: repuestosUsados,
        costo_repuestos: parseFloat(costoRepuestos) || 0,
        precio_cobrado: parseFloat(precioCobrado) || 0,
        ganancia_neta: ganancia,
      })
      if (errTrabajo) throw errTrabajo

      navigate('/')
    } catch (err) {
      console.error(err)
      alert('Error al guardar. Revisá los datos e intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h2 className="text-2xl font-black text-white uppercase tracking-wide mb-6">Nuevo Trabajo</h2>

      <div className="space-y-4">
        {/* Patente */}
        <div>
          <label className="text-gray-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Patente
          </label>
          <div className="relative">
            <input
              type="text"
              value={patente}
              onChange={e => setPatente(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="ABC123"
              autoFocus
              className={`${inputBase} text-2xl font-black tracking-widest uppercase`}
            />
            {buscando && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                buscando...
              </span>
            )}
          </div>
          {clienteStatus === 'existente' && (
            <p className="text-green-400 text-sm mt-1.5 font-bold">✓ Cliente encontrado — datos cargados</p>
          )}
          {clienteStatus === 'nuevo' && (
            <p className="text-orange-400 text-sm mt-1.5 font-bold">+ Cliente nuevo</p>
          )}
        </div>

        {/* Nombre */}
        <div>
          <label className="text-gray-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Nombre del Dueño
          </label>
          <input
            type="text"
            value={nombreDueño}
            onChange={e => setNombreDueño(e.target.value)}
            placeholder="Juan Pérez"
            className={`${inputBase} text-xl`}
          />
        </div>

        {/* Celular */}
        <div>
          <label className="text-gray-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Celular
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="11 1234-5678"
              className={`${inputBase} text-xl flex-1`}
            />
            {telefono && (
              <a
                href={`https://wa.me/54${telefono.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-700 text-white font-bold px-5 rounded-2xl flex items-center text-sm shrink-0"
              >
                WA
              </a>
            )}
          </div>
        </div>

        {/* Modelo */}
        <div>
          <label className="text-gray-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Modelo de Moto
          </label>
          <input
            type="text"
            value={modeloMoto}
            onChange={e => setModeloMoto(e.target.value)}
            placeholder="Honda XR 150"
            className={`${inputBase} text-xl`}
          />
        </div>

        {/* Detalle */}
        <div>
          <label className="text-gray-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Detalle del Trabajo
          </label>
          <textarea
            value={detalleTrabajo}
            onChange={e => setDetalleTrabajo(e.target.value)}
            placeholder="Cambio de aceite, ajuste de cadena..."
            rows={3}
            className={`${inputBase} text-lg resize-none`}
          />
        </div>

        {/* Repuestos */}
        <div>
          <label className="text-gray-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Repuestos Usados
          </label>
          <textarea
            value={repuestosUsados}
            onChange={e => setRepuestosUsados(e.target.value)}
            placeholder="Filtro de aceite, pastillas de freno..."
            rows={2}
            className={`${inputBase} text-lg resize-none`}
          />
        </div>

        {/* Costo repuestos */}
        <div>
          <label className="text-gray-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Costo Repuestos ($)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={costoRepuestos}
            onChange={e => setCostoRepuestos(e.target.value)}
            placeholder="0"
            className={`${inputBase} text-2xl font-bold`}
          />
        </div>

        {/* Precio cobrado */}
        <div>
          <label className="text-gray-500 text-xs font-bold tracking-widest block mb-1.5 uppercase">
            Precio Cobrado al Cliente ($)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={precioCobrado}
            onChange={e => setPrecioCobrado(e.target.value)}
            placeholder="0"
            className="w-full bg-gray-900 border-2 border-gray-700 focus:border-orange-500 text-white text-2xl font-bold py-4 px-4 rounded-2xl outline-none"
          />
        </div>

        {/* Preview ganancia */}
        {(costoRepuestos !== '' || precioCobrado !== '') && (
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">Ganancia Neta</p>
            <p
              className={`font-black text-3xl mt-1 ${ganancia >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              ${ganancia.toLocaleString('es-AR')}
            </p>
          </div>
        )}

        {/* Guardar */}
        <button
          onClick={guardar}
          disabled={!puedeGuardar}
          className="w-full bg-orange-500 active:bg-orange-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-black text-xl py-6 rounded-2xl uppercase tracking-wide min-h-[72px]"
        >
          {guardando ? 'GUARDANDO...' : 'GUARDAR Y FACTURAR'}
        </button>
      </div>
    </div>
  )
}

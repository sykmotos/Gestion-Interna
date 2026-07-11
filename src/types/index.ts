export interface Cliente {
  id: string
  patente: string
  nombre_dueño: string
  telefono: string
  modelo_moto: string
  dni: string | null
}

export interface Trabajo {
  id: string
  patente_id: string
  fecha: string
  detalle_trabajo: string
  repuestos_usados: string
  costo_repuestos: number
  precio_cobrado: number
  ganancia_neta: number
  estado: string
  metodo_pago: string
  informe_final: string | null
  repuestos_jsonb: object[] | null
  kilometraje: string | null
  mano_de_obra: number
  sena: number
  saldo_pendiente: number
}

export interface Inventario {
  id: string
  nombre: string
  categoria: string | null
  cantidad: number
  precio_costo: number
  precio_venta: number
  ultima_actualizacion: string
}

export interface CajaMovimiento {
  id: string
  fecha: string
  tipo: 'ingreso' | 'egreso' | 'cierre'
  concepto: string
  monto: number
  metodo_pago: string
  trabajo_id: string | null
}

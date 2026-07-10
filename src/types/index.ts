export interface Cliente {
  id: string
  patente: string
  nombre_dueño: string
  telefono: string
  modelo_moto: string
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
}

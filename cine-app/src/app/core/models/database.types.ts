export type RolUsuario = 'cliente' | 'empleado' | 'admin';
export type FormatoPelicula = '2D' | '3D' | '4D' | '5D';
export type TipoButaca = 'normal' | 'accesible' | 'vip';
export type EstadoCompra = 'pendiente' | 'confirmada' | 'cancelada';
export type EstadoEntrada = 'vigente' | 'validada' | 'cancelada';

export interface Configuracion {
  clave: string;
  valor: unknown;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  rol: RolUsuario;
  puntos_acumulados: number;
  credito_disponible: number;
  cupon_bienvenida_usado: boolean;
  created_at: string;
}

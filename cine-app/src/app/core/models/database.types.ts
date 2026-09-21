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

export interface Genero {
  id: number;
  nombre: string;
}

export interface Pelicula {
  id: string;
  nombre: string;
  imagen_url: string | null;
  sinopsis: string | null;
  duracion_minutos: number;
  formato: FormatoPelicula;
  idioma: string;
  restriccion_edad: number;
  estreno_fecha: string | null;
  preventa_apertura: string | null;
  preventa_precio: number | null;
  activa: boolean;
  created_at: string;
}

export interface PeliculaConGeneros extends Pelicula {
  generos: Genero[];
}

export interface Sala {
  id: string;
  nombre: string;
  activa: boolean;
}

export interface Butaca {
  id: string;
  sala_id: string;
  fila: string;
  columna: number;
  tipo: TipoButaca;
}

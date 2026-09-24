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

export interface Funcion {
  id: string;
  pelicula_id: string;
  sala_id: string;
  inicio: string;
  fin: string;
  precio_base: number;
  publicada: boolean;
  created_at: string;
}

export interface Compra {
  id: string;
  usuario_id: string | null;
  estado: EstadoCompra;
  cupon_id: string | null;
  credito_usado: number;
  total: number;
  qr_codigo: string | null;
  created_at: string;
}

export interface Entrada {
  id: string;
  compra_id: string;
  funcion_id: string;
  butaca_id: string;
  precio: number;
  estado: EstadoEntrada;
}

export interface ButacaReservadaTemp {
  funcion_id: string;
  butaca_id: string;
  session_id: string;
  expires_at: string;
}

export interface CategoriaProducto {
  id: number;
  nombre: string;
}

export interface Producto {
  id: string;
  categoria_id: number;
  nombre: string;
  precio: number;
  imagen_url: string | null;
  activo: boolean;
}

export interface Combo {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
}

export interface ComboConProductos extends Combo {
  productos: { producto: Producto; cantidad: number }[];
}

export interface CompraProducto {
  id: string;
  compra_id: string;
  producto_id: string | null;
  combo_id: string | null;
  cantidad: number;
  precio_unitario: number;
}

export interface Cupon {
  id: string;
  codigo: string;
  porcentaje: number;
  edad_minima: number | null;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  activo: boolean;
}

export interface Recompensa {
  id: string;
  nombre: string;
  costo_puntos: number;
  activa: boolean;
}

export interface Canje {
  id: string;
  usuario_id: string;
  recompensa_id: string;
  puntos_usados: number;
  created_at: string;
}

export interface Resena {
  id: string;
  usuario_id: string;
  pelicula_id: string;
  estrellas: number;
  comentario: string | null;
  created_at: string;
}

export interface ResenaPromedio {
  pelicula_id: string;
  promedio: number;
  cantidad: number;
}

export interface VentaPelicula {
  pelicula_id: string;
  entradas_vendidas: number;
}

export interface LogActividad {
  id: string;
  usuario_id: string | null;
  accion: string;
  detalle: unknown;
  created_at: string;
}

export interface FacturacionDiaria {
  dia: string;
  total_facturado: number;
  entradas_vendidas: number;
}

export interface PeliculaMasVista {
  pelicula_id: string;
  entradas: number;
}

export interface CandyMasVendido {
  producto_id: string | null;
  combo_id: string | null;
  cantidad: number;
}

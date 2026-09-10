create extension if not exists "pgcrypto";

create type public.rol_usuario as enum ('cliente', 'empleado', 'admin');
create type public.formato_pelicula as enum ('2D', '3D', '4D', '5D');
create type public.tipo_butaca as enum ('normal', 'accesible', 'vip');
create type public.estado_compra as enum ('pendiente', 'confirmada', 'cancelada');
create type public.estado_entrada as enum ('vigente', 'validada', 'cancelada');
create type public.tipo_movimiento_puntos as enum ('acumulacion', 'canje');
create type public.tipo_movimiento_credito as enum ('generado', 'usado');

create table public.configuracion (
  clave text primary key,
  valor jsonb not null
);

insert into public.configuracion (clave, valor) values
  ('cupon_bienvenida_porcentaje', '20'),
  ('buffer_minutos_entre_funciones', '30'),
  ('cancelacion_horas_limite', '2');

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date not null,
  rol public.rol_usuario not null default 'cliente',
  puntos_acumulados integer not null default 0,
  credito_disponible numeric(10, 2) not null default 0,
  cupon_bienvenida_usado boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.generos (
  id serial primary key,
  nombre text not null unique
);

create table public.peliculas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  imagen_url text,
  sinopsis text,
  duracion_minutos integer not null,
  formato public.formato_pelicula not null default '2D',
  idioma text not null,
  restriccion_edad integer not null default 0,
  estreno_fecha date,
  preventa_apertura timestamptz,
  preventa_precio numeric(10, 2),
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.peliculas_generos (
  pelicula_id uuid not null references public.peliculas (id) on delete cascade,
  genero_id integer not null references public.generos (id) on delete cascade,
  primary key (pelicula_id, genero_id)
);

create table public.alertas_estreno (
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  pelicula_id uuid not null references public.peliculas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuario_id, pelicula_id)
);

create table public.salas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activa boolean not null default true
);

create table public.butacas (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references public.salas (id) on delete cascade,
  fila text not null,
  columna integer not null,
  tipo public.tipo_butaca not null default 'normal',
  unique (sala_id, fila, columna)
);

create table public.funciones (
  id uuid primary key default gen_random_uuid(),
  pelicula_id uuid not null references public.peliculas (id) on delete cascade,
  sala_id uuid not null references public.salas (id) on delete restrict,
  inicio timestamptz not null,
  fin timestamptz not null,
  precio_base numeric(10, 2) not null,
  publicada boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.butacas_reservadas_temp (
  funcion_id uuid not null references public.funciones (id) on delete cascade,
  butaca_id uuid not null references public.butacas (id) on delete cascade,
  session_id text not null,
  expires_at timestamptz not null,
  primary key (funcion_id, butaca_id)
);

create table public.categorias_productos (
  id serial primary key,
  nombre text not null unique
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  categoria_id integer not null references public.categorias_productos (id) on delete restrict,
  nombre text not null,
  precio numeric(10, 2) not null,
  imagen_url text,
  activo boolean not null default true
);

create table public.combos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio numeric(10, 2) not null,
  activo boolean not null default true
);

create table public.combos_productos (
  combo_id uuid not null references public.combos (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete cascade,
  cantidad integer not null default 1,
  primary key (combo_id, producto_id)
);

create table public.cupones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  porcentaje integer not null check (porcentaje between 1 and 100),
  edad_minima integer,
  vigencia_desde timestamptz not null default now(),
  vigencia_hasta timestamptz,
  activo boolean not null default true
);

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios (id) on delete set null,
  estado public.estado_compra not null default 'pendiente',
  cupon_id uuid references public.cupones (id),
  credito_usado numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  qr_codigo text unique,
  created_at timestamptz not null default now()
);

create table public.entradas (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras (id) on delete cascade,
  funcion_id uuid not null references public.funciones (id) on delete restrict,
  butaca_id uuid not null references public.butacas (id) on delete restrict,
  precio numeric(10, 2) not null,
  estado public.estado_entrada not null default 'vigente',
  unique (funcion_id, butaca_id)
);

create table public.compra_productos (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras (id) on delete cascade,
  producto_id uuid references public.productos (id),
  combo_id uuid references public.combos (id),
  cantidad integer not null default 1,
  precio_unitario numeric(10, 2) not null,
  check (
    (producto_id is not null and combo_id is null)
    or (producto_id is null and combo_id is not null)
  )
);

create table public.recompensas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  costo_puntos integer not null,
  activa boolean not null default true
);

create table public.canjes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  recompensa_id uuid not null references public.recompensas (id),
  puntos_usados integer not null,
  created_at timestamptz not null default now()
);

create table public.movimientos_puntos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo public.tipo_movimiento_puntos not null,
  puntos integer not null,
  compra_id uuid references public.compras (id),
  canje_id uuid references public.canjes (id),
  created_at timestamptz not null default now()
);

create table public.movimientos_credito (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo public.tipo_movimiento_credito not null,
  monto numeric(10, 2) not null,
  compra_origen_id uuid references public.compras (id),
  compra_uso_id uuid references public.compras (id),
  created_at timestamptz not null default now()
);

create table public.resenas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  pelicula_id uuid not null references public.peliculas (id) on delete cascade,
  estrellas integer not null check (estrellas between 1 and 5),
  comentario text,
  created_at timestamptz not null default now(),
  unique (usuario_id, pelicula_id)
);

create table public.logs_actividad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios (id) on delete set null,
  accion text not null,
  detalle jsonb,
  created_at timestamptz not null default now()
);

create index on public.funciones (sala_id, inicio);
create index on public.funciones (pelicula_id);
create index on public.entradas (funcion_id);
create index on public.compras (usuario_id);
create index on public.resenas (pelicula_id);
create index on public.butacas_reservadas_temp (expires_at);
create index on public.movimientos_puntos (usuario_id);
create index on public.movimientos_credito (usuario_id);

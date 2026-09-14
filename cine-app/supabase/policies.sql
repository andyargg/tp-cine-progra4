create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.usuarios where id = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean language sql stable as $$ select public.rol_actual() = 'admin' $$;

create or replace function public.es_staff()
returns boolean language sql stable as $$ select public.rol_actual() in ('admin', 'empleado') $$;

create or replace function public.usuarios_bloquear_campos_sensibles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    new.rol := old.rol;
    new.puntos_acumulados := old.puntos_acumulados;
    new.credito_disponible := old.credito_disponible;
    new.cupon_bienvenida_usado := old.cupon_bienvenida_usado;
  end if;
  return new;
end;
$$;

create trigger trg_usuarios_bloquear_campos_sensibles
before update on public.usuarios
for each row execute function public.usuarios_bloquear_campos_sensibles();

create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, email, nombre, apellido, fecha_nacimiento)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'nombre',
    new.raw_user_meta_data ->> 'apellido',
    (new.raw_user_meta_data ->> 'fecha_nacimiento')::date
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.manejar_nuevo_usuario();

alter table public.configuracion enable row level security;
alter table public.usuarios enable row level security;
alter table public.generos enable row level security;
alter table public.peliculas enable row level security;
alter table public.peliculas_generos enable row level security;
alter table public.alertas_estreno enable row level security;
alter table public.salas enable row level security;
alter table public.butacas enable row level security;
alter table public.funciones enable row level security;
alter table public.butacas_reservadas_temp enable row level security;
alter table public.categorias_productos enable row level security;
alter table public.productos enable row level security;
alter table public.combos enable row level security;
alter table public.combos_productos enable row level security;
alter table public.cupones enable row level security;
alter table public.compras enable row level security;
alter table public.entradas enable row level security;
alter table public.compra_productos enable row level security;
alter table public.resenas enable row level security;
alter table public.recompensas enable row level security;
alter table public.canjes enable row level security;
alter table public.movimientos_puntos enable row level security;
alter table public.movimientos_credito enable row level security;
alter table public.logs_actividad enable row level security;

create policy "configuracion_select" on public.configuracion for select using (true);
create policy "configuracion_write" on public.configuracion for all using (public.es_admin()) with check (public.es_admin());

create policy "generos_select" on public.generos for select using (true);
create policy "generos_write" on public.generos for all using (public.es_staff()) with check (public.es_staff());

create policy "peliculas_select" on public.peliculas for select using (true);
create policy "peliculas_write" on public.peliculas for all using (public.es_staff()) with check (public.es_staff());

create policy "peliculas_generos_select" on public.peliculas_generos for select using (true);
create policy "peliculas_generos_write" on public.peliculas_generos for all using (public.es_staff()) with check (public.es_staff());

create policy "salas_select" on public.salas for select using (true);
create policy "salas_write" on public.salas for all using (public.es_staff()) with check (public.es_staff());

create policy "butacas_select" on public.butacas for select using (true);
create policy "butacas_write" on public.butacas for all using (public.es_staff()) with check (public.es_staff());

create policy "funciones_select" on public.funciones for select using (true);
create policy "funciones_write" on public.funciones for all using (public.es_staff()) with check (public.es_staff());

create policy "categorias_productos_select" on public.categorias_productos for select using (true);
create policy "categorias_productos_write" on public.categorias_productos for all using (public.es_staff()) with check (public.es_staff());

create policy "productos_select" on public.productos for select using (true);
create policy "productos_write" on public.productos for all using (public.es_staff()) with check (public.es_staff());

create policy "combos_select" on public.combos for select using (true);
create policy "combos_write" on public.combos for all using (public.es_staff()) with check (public.es_staff());

create policy "combos_productos_select" on public.combos_productos for select using (true);
create policy "combos_productos_write" on public.combos_productos for all using (public.es_staff()) with check (public.es_staff());

create policy "recompensas_select" on public.recompensas for select using (true);
create policy "recompensas_write" on public.recompensas for all using (public.es_staff()) with check (public.es_staff());

create policy "cupones_all_staff" on public.cupones for all using (public.es_staff()) with check (public.es_staff());

create policy "usuarios_select_staff" on public.usuarios for select using (public.es_staff());
create policy "usuarios_select_propio" on public.usuarios for select using (id = auth.uid());
create policy "usuarios_update_propio" on public.usuarios for update using (id = auth.uid());
create policy "usuarios_update_admin" on public.usuarios for update using (public.es_admin());

create policy "alertas_estreno_select_propio" on public.alertas_estreno for select using (usuario_id = auth.uid());
create policy "alertas_estreno_insert_propio" on public.alertas_estreno for insert with check (usuario_id = auth.uid());
create policy "alertas_estreno_delete_propio" on public.alertas_estreno for delete using (usuario_id = auth.uid());
create policy "alertas_estreno_select_staff" on public.alertas_estreno for select using (public.es_staff());

create policy "butacas_reservadas_temp_select" on public.butacas_reservadas_temp for select using (true);
create policy "butacas_reservadas_temp_insert" on public.butacas_reservadas_temp for insert with check (true);
create policy "butacas_reservadas_temp_delete" on public.butacas_reservadas_temp for delete using (true);

create policy "compras_select_propio" on public.compras for select using (usuario_id = auth.uid());
create policy "compras_select_staff" on public.compras for select using (public.es_staff());
create policy "compras_insert" on public.compras for insert with check (usuario_id = auth.uid() or usuario_id is null);
create policy "compras_update_propio" on public.compras for update using (usuario_id = auth.uid());
create policy "compras_update_staff" on public.compras for update using (public.es_staff());

create policy "entradas_select_propio" on public.entradas for select
  using (exists (select 1 from public.compras c where c.id = compra_id and (c.usuario_id = auth.uid() or c.usuario_id is null)));
create policy "entradas_all_staff" on public.entradas for all using (public.es_staff()) with check (public.es_staff());
create policy "entradas_insert_propio" on public.entradas for insert
  with check (exists (select 1 from public.compras c where c.id = compra_id and (c.usuario_id = auth.uid() or c.usuario_id is null)));

create policy "compra_productos_select_propio" on public.compra_productos for select
  using (exists (select 1 from public.compras c where c.id = compra_id and (c.usuario_id = auth.uid() or c.usuario_id is null)));
create policy "compra_productos_select_staff" on public.compra_productos for select using (public.es_staff());
create policy "compra_productos_insert_propio" on public.compra_productos for insert
  with check (exists (select 1 from public.compras c where c.id = compra_id and (c.usuario_id = auth.uid() or c.usuario_id is null)));

create policy "resenas_select" on public.resenas for select using (true);
create policy "resenas_insert_propio" on public.resenas for insert with check (usuario_id = auth.uid());
create policy "resenas_update_propio" on public.resenas for update using (usuario_id = auth.uid());
create policy "resenas_delete_propio" on public.resenas for delete using (usuario_id = auth.uid());

create policy "canjes_select_propio" on public.canjes for select using (usuario_id = auth.uid());
create policy "canjes_select_staff" on public.canjes for select using (public.es_staff());

create policy "movimientos_puntos_select_propio" on public.movimientos_puntos for select using (usuario_id = auth.uid());
create policy "movimientos_puntos_select_staff" on public.movimientos_puntos for select using (public.es_staff());

create policy "movimientos_credito_select_propio" on public.movimientos_credito for select using (usuario_id = auth.uid());
create policy "movimientos_credito_select_staff" on public.movimientos_credito for select using (public.es_staff());

create policy "logs_actividad_select_staff" on public.logs_actividad for select using (public.es_staff());

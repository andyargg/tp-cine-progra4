alter type public.tipo_movimiento_puntos add value if not exists 'anulacion';

insert into public.configuracion (clave, valor) values ('recargo_vip_porcentaje', '50')
on conflict (clave) do nothing;

alter table public.entradas drop constraint if exists entradas_funcion_id_butaca_id_key;
create unique index if not exists entradas_butaca_vendida_unica
  on public.entradas (funcion_id, butaca_id)
  where estado <> 'cancelada';

alter table public.canjes add column if not exists retirado boolean not null default false;

insert into public.recompensas (nombre, costo_puntos)
select v.nombre, v.costo
from (values ('Entrada gratis', 500), ('Pochoclo grande', 150), ('Gaseosa grande', 100)) as v(nombre, costo)
where not exists (select 1 from public.recompensas);

drop policy if exists "compras_insert" on public.compras;
drop policy if exists "compras_update_propio" on public.compras;
drop policy if exists "entradas_insert_propio" on public.entradas;
drop policy if exists "compra_productos_insert_propio" on public.compra_productos;
drop policy if exists "butacas_reservadas_temp_insert" on public.butacas_reservadas_temp;
drop policy if exists "butacas_reservadas_temp_delete" on public.butacas_reservadas_temp;

drop policy if exists "entradas_select_propio" on public.entradas;
create policy "entradas_select_propio" on public.entradas for select
  using (exists (select 1 from public.compras c where c.id = compra_id and c.usuario_id = auth.uid()));

drop policy if exists "compra_productos_select_propio" on public.compra_productos;
create policy "compra_productos_select_propio" on public.compra_productos for select
  using (exists (select 1 from public.compras c where c.id = compra_id and c.usuario_id = auth.uid()));

create or replace function public.butacas_vendidas(p_funcion_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select butaca_id from public.entradas
  where funcion_id = p_funcion_id and estado <> 'cancelada';
$$;

grant execute on function public.butacas_vendidas(uuid) to anon, authenticated;

create or replace function public.reservar_butaca(p_funcion_id uuid, p_butaca_id uuid, p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_id is null or length(p_session_id) < 10 then
    raise exception 'Sesión de compra inválida.';
  end if;

  if not exists (
    select 1 from public.funciones f
    join public.butacas b on b.sala_id = f.sala_id
    where f.id = p_funcion_id and b.id = p_butaca_id and f.publicada and f.inicio > now()
  ) then
    raise exception 'La función ya no está disponible para la venta.';
  end if;

  if exists (
    select 1 from public.entradas
    where funcion_id = p_funcion_id and butaca_id = p_butaca_id and estado <> 'cancelada'
  ) then
    raise exception 'Esta butaca ya fue vendida.';
  end if;

  delete from public.butacas_reservadas_temp
  where funcion_id = p_funcion_id and butaca_id = p_butaca_id and expires_at <= now();

  insert into public.butacas_reservadas_temp (funcion_id, butaca_id, session_id, expires_at)
  values (p_funcion_id, p_butaca_id, p_session_id, now() + interval '5 minutes')
  on conflict (funcion_id, butaca_id) do update
    set expires_at = excluded.expires_at
    where public.butacas_reservadas_temp.session_id = excluded.session_id;

  if not found then
    raise exception 'Otra persona está eligiendo esta butaca en este momento.';
  end if;
end;
$$;

grant execute on function public.reservar_butaca(uuid, uuid, text) to anon, authenticated;

create or replace function public.liberar_butaca(p_funcion_id uuid, p_butaca_id uuid, p_session_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.butacas_reservadas_temp
  where funcion_id = p_funcion_id and butaca_id = p_butaca_id and session_id = p_session_id;
$$;

grant execute on function public.liberar_butaca(uuid, uuid, text) to anon, authenticated;

drop function if exists public.confirmar_compra(uuid, uuid[], boolean, jsonb, text);

create or replace function public.confirmar_compra(
  p_funcion_id uuid,
  p_butaca_ids uuid[],
  p_session_id text,
  p_usar_cupon_bienvenida boolean default false,
  p_items_candy jsonb default '[]'::jsonb,
  p_codigo_cupon text default null,
  p_usar_credito boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_funcion record;
  v_precio_entrada numeric(10, 2);
  v_recargo_vip integer;
  v_fecha_nacimiento date;
  v_cupon_usado boolean := true;
  v_credito_disponible numeric(10, 2) := 0;
  v_credito_usado numeric(10, 2) := 0;
  v_descuento_pct integer;
  v_subtotal_entradas numeric(10, 2) := 0;
  v_total numeric(10, 2);
  v_compra_id uuid;
  v_butaca record;
  v_precio_butaca numeric(10, 2);
  v_item jsonb;
  v_producto_id uuid;
  v_combo_id uuid;
  v_cantidad integer;
  v_precio_unitario numeric(10, 2);
  v_cupon_id uuid;
  v_cupon_edad_minima integer;
  v_puntos_ganados integer;
begin
  if p_butaca_ids is null or coalesce(array_length(p_butaca_ids, 1), 0) = 0 then
    raise exception 'Seleccioná al menos una butaca.';
  end if;

  if array_length(p_butaca_ids, 1) <> (select count(distinct x) from unnest(p_butaca_ids) as x) then
    raise exception 'Hay butacas repetidas en la selección.';
  end if;

  if p_usar_cupon_bienvenida and p_codigo_cupon is not null then
    raise exception 'No se pueden combinar el cupón de bienvenida con otro cupón.';
  end if;

  select f.id, f.sala_id, f.inicio, f.publicada, f.precio_base,
         p.restriccion_edad, p.preventa_apertura, p.preventa_precio, p.estreno_fecha
    into v_funcion
  from public.funciones f
  join public.peliculas p on p.id = f.pelicula_id
  where f.id = p_funcion_id;

  if v_funcion.id is null then
    raise exception 'Función no encontrada.';
  end if;

  if not v_funcion.publicada or v_funcion.inicio <= now() then
    raise exception 'Esta función ya no está disponible para la venta.';
  end if;

  if v_funcion.restriccion_edad > 0 and v_usuario_id is null then
    raise exception 'Esta función tiene restricción de edad: iniciá sesión para comprar.';
  end if;

  if v_usuario_id is not null then
    select fecha_nacimiento, cupon_bienvenida_usado, credito_disponible
      into v_fecha_nacimiento, v_cupon_usado, v_credito_disponible
    from public.usuarios
    where id = v_usuario_id
    for update;

    if v_funcion.restriccion_edad > 0
       and extract(year from age(v_fecha_nacimiento)) < v_funcion.restriccion_edad then
      raise exception 'No cumplís la edad mínima para esta función.';
    end if;
  end if;

  if p_usar_cupon_bienvenida and (v_usuario_id is null or v_cupon_usado) then
    raise exception 'El cupón de bienvenida ya fue usado o requiere iniciar sesión.';
  end if;

  if p_usar_credito and v_usuario_id is null then
    raise exception 'Iniciá sesión para usar tu crédito.';
  end if;

  v_precio_entrada := v_funcion.precio_base;
  if v_funcion.preventa_apertura is not null
     and v_funcion.preventa_precio is not null
     and v_funcion.estreno_fecha is not null
     and now() >= v_funcion.preventa_apertura
     and now() < v_funcion.estreno_fecha::timestamptz then
    v_precio_entrada := v_funcion.preventa_precio;
  end if;

  select coalesce((valor::text)::integer, 0) into v_recargo_vip
  from public.configuracion where clave = 'recargo_vip_porcentaje';
  v_recargo_vip := coalesce(v_recargo_vip, 0);

  for v_butaca in
    select b.id, b.fila, b.columna, b.tipo, b.sala_id
    from public.butacas b
    where b.id = any(p_butaca_ids)
  loop
    if v_butaca.sala_id <> v_funcion.sala_id then
      raise exception 'La butaca % no pertenece a la sala de esta función.', v_butaca.fila || v_butaca.columna;
    end if;

    if exists (
      select 1 from public.entradas
      where funcion_id = p_funcion_id and butaca_id = v_butaca.id and estado <> 'cancelada'
    ) then
      raise exception 'La butaca % ya fue vendida. Elegí otra.', v_butaca.fila || v_butaca.columna;
    end if;

    if exists (
      select 1 from public.butacas_reservadas_temp
      where funcion_id = p_funcion_id and butaca_id = v_butaca.id
        and expires_at > now() and session_id is distinct from p_session_id
    ) then
      raise exception 'La butaca % la está eligiendo otra persona.', v_butaca.fila || v_butaca.columna;
    end if;
  end loop;

  if (select count(*) from public.butacas where id = any(p_butaca_ids)) <> array_length(p_butaca_ids, 1) then
    raise exception 'Alguna de las butacas seleccionadas no existe.';
  end if;

  insert into public.compras (usuario_id, estado, total, qr_codigo, cupon_id)
  values (v_usuario_id, 'confirmada', 0, gen_random_uuid()::text, null)
  returning id into v_compra_id;

  for v_butaca in
    select b.id, b.tipo from public.butacas b where b.id = any(p_butaca_ids)
  loop
    v_precio_butaca := v_precio_entrada;
    if v_butaca.tipo = 'vip' then
      v_precio_butaca := round(v_precio_entrada * (100 + v_recargo_vip) / 100.0, 2);
    end if;

    begin
      insert into public.entradas (compra_id, funcion_id, butaca_id, precio, estado)
      values (v_compra_id, p_funcion_id, v_butaca.id, v_precio_butaca, 'vigente');
    exception when unique_violation then
      raise exception 'Una de las butacas se acaba de vender. Elegí otra.';
    end;

    v_subtotal_entradas := v_subtotal_entradas + v_precio_butaca;
  end loop;

  v_total := v_subtotal_entradas;

  if p_usar_cupon_bienvenida then
    select (valor::text)::integer into v_descuento_pct
    from public.configuracion
    where clave = 'cupon_bienvenida_porcentaje';

    v_total := round(v_total - (v_total * v_descuento_pct / 100.0), 2);
    update public.usuarios set cupon_bienvenida_usado = true where id = v_usuario_id;
  end if;

  if p_codigo_cupon is not null then
    if v_usuario_id is null then
      raise exception 'Iniciá sesión para usar un cupón.';
    end if;

    select id, porcentaje, edad_minima
      into v_cupon_id, v_descuento_pct, v_cupon_edad_minima
    from public.cupones
    where upper(codigo) = upper(trim(p_codigo_cupon))
      and activo = true
      and vigencia_desde <= now()
      and (vigencia_hasta is null or vigencia_hasta >= now());

    if v_cupon_id is null then
      raise exception 'Cupón inválido o vencido.';
    end if;

    if v_cupon_edad_minima is not null
       and (v_fecha_nacimiento is null or extract(year from age(v_fecha_nacimiento)) < v_cupon_edad_minima) then
      raise exception 'No cumplís la edad mínima para este cupón.';
    end if;

    if exists (
      select 1 from public.compras
      where usuario_id = v_usuario_id and cupon_id = v_cupon_id and estado <> 'cancelada'
    ) then
      raise exception 'Ya usaste este cupón.';
    end if;

    v_total := round(v_total - (v_total * v_descuento_pct / 100.0), 2);
    update public.compras set cupon_id = v_cupon_id where id = v_compra_id;
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items_candy, '[]'::jsonb)) loop
    v_producto_id := nullif(v_item ->> 'producto_id', '')::uuid;
    v_combo_id := nullif(v_item ->> 'combo_id', '')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;

    if v_cantidad is null or v_cantidad < 1 or v_cantidad > 20 then
      raise exception 'Cantidad inválida en un ítem de candy bar.';
    end if;

    v_precio_unitario := null;

    if v_producto_id is not null and v_combo_id is null then
      select precio into v_precio_unitario from public.productos where id = v_producto_id and activo = true;
    elsif v_combo_id is not null and v_producto_id is null then
      select precio into v_precio_unitario from public.combos where id = v_combo_id and activo = true;
    else
      raise exception 'Ítem de candy bar inválido.';
    end if;

    if v_precio_unitario is null then
      raise exception 'Producto o combo no disponible.';
    end if;

    insert into public.compra_productos (compra_id, producto_id, combo_id, cantidad, precio_unitario)
    values (v_compra_id, v_producto_id, v_combo_id, v_cantidad, v_precio_unitario);

    v_total := v_total + (v_precio_unitario * v_cantidad);
  end loop;

  if p_usar_credito and v_credito_disponible > 0 then
    v_credito_usado := least(v_credito_disponible, v_total);

    update public.usuarios
    set credito_disponible = credito_disponible - v_credito_usado
    where id = v_usuario_id;

    insert into public.movimientos_credito (usuario_id, tipo, monto, compra_uso_id)
    values (v_usuario_id, 'usado', v_credito_usado, v_compra_id);
  end if;

  update public.compras
  set total = v_total, credito_usado = v_credito_usado
  where id = v_compra_id;

  delete from public.butacas_reservadas_temp
  where funcion_id = p_funcion_id and butaca_id = any(p_butaca_ids);

  if v_usuario_id is not null then
    v_puntos_ganados := floor(v_total - v_credito_usado);

    if v_puntos_ganados > 0 then
      update public.usuarios
      set puntos_acumulados = puntos_acumulados + v_puntos_ganados
      where id = v_usuario_id;

      insert into public.movimientos_puntos (usuario_id, tipo, puntos, compra_id)
      values (v_usuario_id, 'acumulacion', v_puntos_ganados, v_compra_id);
    end if;
  end if;

  return jsonb_build_object(
    'compra_id', v_compra_id,
    'total', v_total,
    'credito_usado', v_credito_usado
  );
end;
$$;

grant execute on function public.confirmar_compra(uuid, uuid[], text, boolean, jsonb, text, boolean) to anon, authenticated;

create or replace function public.cancelar_compra(p_compra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_compra public.compras%rowtype;
  v_inicio_mas_temprano timestamptz;
  v_horas_limite integer;
  v_puntos_a_anular integer;
begin
  select * into v_compra from public.compras where id = p_compra_id for update;

  if v_compra.id is null then
    raise exception 'Compra no encontrada.';
  end if;

  if v_compra.usuario_id is null or v_compra.usuario_id is distinct from v_usuario_id then
    raise exception 'No podés cancelar esta compra.';
  end if;

  if v_compra.estado = 'cancelada' then
    raise exception 'Esta compra ya está cancelada.';
  end if;

  if exists (select 1 from public.entradas where compra_id = p_compra_id and estado = 'validada')
     or exists (select 1 from public.compra_productos where compra_id = p_compra_id and retirado) then
    raise exception 'No se puede cancelar: ya se usaron entradas o se retiró el candy bar.';
  end if;

  select coalesce((valor::text)::integer, 2) into v_horas_limite
  from public.configuracion where clave = 'cancelacion_horas_limite';
  v_horas_limite := coalesce(v_horas_limite, 2);

  select min(f.inicio) into v_inicio_mas_temprano
  from public.entradas e
  join public.funciones f on f.id = e.funcion_id
  where e.compra_id = p_compra_id;

  if v_inicio_mas_temprano is null
     or v_inicio_mas_temprano - now() < make_interval(hours => v_horas_limite) then
    raise exception 'Ya no se puede cancelar: faltan menos de % horas para la función.', v_horas_limite;
  end if;

  update public.compras set estado = 'cancelada' where id = p_compra_id;
  update public.entradas set estado = 'cancelada' where compra_id = p_compra_id;

  update public.usuarios
  set credito_disponible = credito_disponible + v_compra.total
  where id = v_usuario_id;

  insert into public.movimientos_credito (usuario_id, tipo, monto, compra_origen_id)
  values (v_usuario_id, 'generado', v_compra.total, p_compra_id);

  select coalesce(sum(puntos), 0) into v_puntos_a_anular
  from public.movimientos_puntos
  where compra_id = p_compra_id and tipo = 'acumulacion';

  if v_puntos_a_anular > 0 then
    update public.usuarios
    set puntos_acumulados = greatest(puntos_acumulados - v_puntos_a_anular, 0)
    where id = v_usuario_id;

    insert into public.movimientos_puntos (usuario_id, tipo, puntos, compra_id)
    values (v_usuario_id, 'anulacion', -v_puntos_a_anular, p_compra_id);
  end if;
end;
$$;

grant execute on function public.cancelar_compra(uuid) to authenticated;

create or replace function public.canjear_recompensa(p_recompensa_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_costo integer;
  v_puntos_actuales integer;
  v_canje_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'Iniciá sesión para canjear puntos.';
  end if;

  select costo_puntos into v_costo
  from public.recompensas
  where id = p_recompensa_id and activa = true;

  if v_costo is null then
    raise exception 'Recompensa no encontrada.';
  end if;

  select puntos_acumulados into v_puntos_actuales
  from public.usuarios
  where id = v_usuario_id
  for update;

  if v_puntos_actuales < v_costo then
    raise exception 'No tenés puntos suficientes para este canje.';
  end if;

  insert into public.canjes (usuario_id, recompensa_id, puntos_usados)
  values (v_usuario_id, p_recompensa_id, v_costo)
  returning id into v_canje_id;

  update public.usuarios
  set puntos_acumulados = puntos_acumulados - v_costo
  where id = v_usuario_id;

  insert into public.movimientos_puntos (usuario_id, tipo, puntos, canje_id)
  values (v_usuario_id, 'canje', -v_costo, v_canje_id);

  return v_canje_id;
end;
$$;

grant execute on function public.canjear_recompensa(uuid) to authenticated;

create or replace function public.validar_entradas(p_compra_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_estado public.estado_compra;
  v_actualizadas integer;
begin
  if not public.es_staff() then
    raise exception 'No autorizado.';
  end if;

  select estado into v_estado from public.compras where id = p_compra_id for update;

  if v_estado is null then
    raise exception 'No existe ninguna compra con ese código.';
  end if;

  if v_estado = 'cancelada' then
    raise exception 'Esta compra fue cancelada: el QR no es válido.';
  end if;

  update public.entradas
  set estado = 'validada'
  where compra_id = p_compra_id and estado = 'vigente';

  get diagnostics v_actualizadas = row_count;

  if v_actualizadas = 0 then
    raise exception 'No hay entradas pendientes de validar para este código.';
  end if;

  insert into public.logs_actividad (usuario_id, accion, detalle)
  values (v_usuario_id, 'entradas_validadas', jsonb_build_object('compra_id', p_compra_id, 'cantidad', v_actualizadas));

  return v_actualizadas;
end;
$$;

grant execute on function public.validar_entradas(uuid) to authenticated;

create or replace function public.validar_candy(p_compra_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_estado public.estado_compra;
  v_actualizadas integer;
begin
  if not public.es_staff() then
    raise exception 'No autorizado.';
  end if;

  select estado into v_estado from public.compras where id = p_compra_id for update;

  if v_estado is null then
    raise exception 'No existe ninguna compra con ese código.';
  end if;

  if v_estado = 'cancelada' then
    raise exception 'Esta compra fue cancelada: el QR no es válido.';
  end if;

  update public.compra_productos
  set retirado = true
  where compra_id = p_compra_id and retirado = false;

  get diagnostics v_actualizadas = row_count;

  if v_actualizadas = 0 then
    raise exception 'No hay productos de candy bar pendientes de retirar para este código.';
  end if;

  insert into public.logs_actividad (usuario_id, accion, detalle)
  values (v_usuario_id, 'candy_entregado', jsonb_build_object('compra_id', p_compra_id, 'cantidad', v_actualizadas));

  return v_actualizadas;
end;
$$;

grant execute on function public.validar_candy(uuid) to authenticated;

create or replace function public.validar_canje(p_canje_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_canje public.canjes%rowtype;
  v_nombre text;
begin
  if not public.es_staff() then
    raise exception 'No autorizado.';
  end if;

  select * into v_canje from public.canjes where id = p_canje_id for update;

  if v_canje.id is null then
    raise exception 'No existe ningún canje con ese código.';
  end if;

  if v_canje.retirado then
    raise exception 'Este canje ya fue entregado.';
  end if;

  update public.canjes set retirado = true where id = p_canje_id;

  select nombre into v_nombre from public.recompensas where id = v_canje.recompensa_id;

  insert into public.logs_actividad (usuario_id, accion, detalle)
  values (v_usuario_id, 'canje_entregado', jsonb_build_object('canje_id', p_canje_id, 'recompensa', v_nombre));

  return v_nombre;
end;
$$;

grant execute on function public.validar_canje(uuid) to authenticated;

create or replace function public.reporte_facturacion_diaria()
returns table (dia date, total_facturado numeric, entradas_vendidas bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select
    date(c.created_at) as dia,
    sum(c.total) as total_facturado,
    sum((select count(*) from public.entradas e where e.compra_id = c.id and e.estado <> 'cancelada'))::bigint as entradas_vendidas
  from public.compras c
  where c.estado = 'confirmada'
  group by date(c.created_at)
  order by date(c.created_at);
end;
$$;

grant execute on function public.reporte_facturacion_diaria() to authenticated;

create or replace function public.usuarios_bloquear_campos_sensibles()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and not coalesce(public.es_admin(), false) then
    new.rol := old.rol;
    new.puntos_acumulados := old.puntos_acumulados;
    new.credito_disponible := old.credito_disponible;
    new.cupon_bienvenida_usado := old.cupon_bienvenida_usado;
  end if;
  return new;
end;
$$;

update public.usuarios u
set puntos_acumulados = greatest(coalesce((
      select sum(m.puntos) from public.movimientos_puntos m where m.usuario_id = u.id
    ), 0), 0),
    credito_disponible = greatest(coalesce((
      select sum(case when m.tipo = 'generado' then m.monto else -m.monto end)
      from public.movimientos_credito m where m.usuario_id = u.id
    ), 0), 0);

create or replace function public.es_admin()
returns boolean language sql stable as $$ select coalesce(public.rol_actual() = 'admin', false) $$;

create or replace function public.es_staff()
returns boolean language sql stable as $$ select coalesce(public.rol_actual() in ('admin', 'empleado'), false) $$;

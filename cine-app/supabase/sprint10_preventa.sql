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
    select 1 from public.funciones f
    join public.peliculas p on p.id = f.pelicula_id
    where f.id = p_funcion_id
      and p.estreno_fecha is not null
      and now() < p.estreno_fecha::timestamptz
      and (p.preventa_apertura is null or now() < p.preventa_apertura)
  ) then
    raise exception 'La venta de esta película todavía no está habilitada.';
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

  if v_funcion.estreno_fecha is not null
     and now() < v_funcion.estreno_fecha::timestamptz
     and (v_funcion.preventa_apertura is null or now() < v_funcion.preventa_apertura) then
    raise exception 'La venta de esta película todavía no está habilitada.';
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

create or replace function public.es_admin()
returns boolean language sql stable as $$ select coalesce(public.rol_actual() = 'admin', false) $$;

create or replace function public.es_staff()
returns boolean language sql stable as $$ select coalesce(public.rol_actual() in ('admin', 'empleado'), false) $$;

drop function if exists public.confirmar_compra(uuid, uuid[], boolean);

create or replace function public.confirmar_compra(
  p_funcion_id uuid,
  p_butaca_ids uuid[],
  p_usar_cupon_bienvenida boolean,
  p_items_candy jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_precio_base numeric(10, 2);
  v_restriccion_edad integer;
  v_fecha_nacimiento date;
  v_edad integer;
  v_cupon_usado boolean := true;
  v_descuento_pct integer;
  v_total numeric(10, 2);
  v_compra_id uuid;
  v_butaca_id uuid;
  v_item jsonb;
  v_producto_id uuid;
  v_combo_id uuid;
  v_cantidad integer;
  v_precio_unitario numeric(10, 2);
begin
  select f.precio_base, p.restriccion_edad
    into v_precio_base, v_restriccion_edad
  from public.funciones f
  join public.peliculas p on p.id = f.pelicula_id
  where f.id = p_funcion_id;

  if v_precio_base is null then
    raise exception 'Función no encontrada.';
  end if;

  if v_restriccion_edad > 0 and v_usuario_id is null then
    raise exception 'Esta función tiene restricción de edad: iniciá sesión para comprar.';
  end if;

  if v_usuario_id is not null then
    select fecha_nacimiento, cupon_bienvenida_usado
      into v_fecha_nacimiento, v_cupon_usado
    from public.usuarios
    where id = v_usuario_id;

    if v_restriccion_edad > 0 then
      v_edad := extract(year from age(v_fecha_nacimiento));

      if v_edad < v_restriccion_edad then
        raise exception 'No cumplís la edad mínima para esta función.';
      end if;
    end if;
  end if;

  v_total := v_precio_base * array_length(p_butaca_ids, 1);

  if p_usar_cupon_bienvenida and v_usuario_id is not null and not v_cupon_usado then
    select (valor::text)::integer into v_descuento_pct
    from public.configuracion
    where clave = 'cupon_bienvenida_porcentaje';

    v_total := round(v_total - (v_total * v_descuento_pct / 100.0), 2);
  end if;

  insert into public.compras (usuario_id, estado, total, qr_codigo)
  values (v_usuario_id, 'confirmada', 0, gen_random_uuid()::text)
  returning id into v_compra_id;

  foreach v_butaca_id in array p_butaca_ids loop
    insert into public.entradas (compra_id, funcion_id, butaca_id, precio, estado)
    values (v_compra_id, p_funcion_id, v_butaca_id, v_precio_base, 'vigente');
  end loop;

  for v_item in select * from jsonb_array_elements(p_items_candy) loop
    v_producto_id := nullif(v_item ->> 'producto_id', '')::uuid;
    v_combo_id := nullif(v_item ->> 'combo_id', '')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;

    if v_cantidad is null or v_cantidad < 1 then
      raise exception 'Cantidad inválida en un ítem de candy bar.';
    end if;

    v_precio_unitario := null;

    if v_producto_id is not null then
      select precio into v_precio_unitario
      from public.productos
      where id = v_producto_id and activo = true;
    elsif v_combo_id is not null then
      select precio into v_precio_unitario
      from public.combos
      where id = v_combo_id and activo = true;
    else
      raise exception 'Ítem de candy bar inválido.';
    end if;

    if v_precio_unitario is null then
      raise exception 'Producto o combo no encontrado.';
    end if;

    insert into public.compra_productos (compra_id, producto_id, combo_id, cantidad, precio_unitario)
    values (v_compra_id, v_producto_id, v_combo_id, v_cantidad, v_precio_unitario);

    v_total := v_total + (v_precio_unitario * v_cantidad);
  end loop;

  update public.compras set total = v_total where id = v_compra_id;

  delete from public.butacas_reservadas_temp
  where funcion_id = p_funcion_id and butaca_id = any(p_butaca_ids);

  if p_usar_cupon_bienvenida and v_usuario_id is not null and not v_cupon_usado then
    update public.usuarios set cupon_bienvenida_usado = true where id = v_usuario_id;
  end if;

  return v_compra_id;
end;
$$;

grant execute on function public.confirmar_compra(uuid, uuid[], boolean, jsonb) to anon, authenticated;

alter publication supabase_realtime add table public.butacas_reservadas_temp;

create or replace function public.confirmar_compra(
  p_funcion_id uuid,
  p_butaca_ids uuid[],
  p_usar_cupon_bienvenida boolean
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
  values (v_usuario_id, 'confirmada', v_total, gen_random_uuid()::text)
  returning id into v_compra_id;

  foreach v_butaca_id in array p_butaca_ids loop
    insert into public.entradas (compra_id, funcion_id, butaca_id, precio, estado)
    values (v_compra_id, p_funcion_id, v_butaca_id, v_precio_base, 'vigente');
  end loop;

  delete from public.butacas_reservadas_temp
  where funcion_id = p_funcion_id and butaca_id = any(p_butaca_ids);

  if p_usar_cupon_bienvenida and v_usuario_id is not null and not v_cupon_usado then
    update public.usuarios set cupon_bienvenida_usado = true where id = v_usuario_id;
  end if;

  return v_compra_id;
end;
$$;

grant execute on function public.confirmar_compra(uuid, uuid[], boolean) to anon, authenticated;

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
begin
  select * into v_compra from public.compras where id = p_compra_id;

  if v_compra.id is null then
    raise exception 'Compra no encontrada.';
  end if;

  if v_compra.usuario_id is null or v_compra.usuario_id is distinct from v_usuario_id then
    raise exception 'No podés cancelar esta compra.';
  end if;

  if v_compra.estado = 'cancelada' then
    raise exception 'Esta compra ya está cancelada.';
  end if;

  select min(f.inicio) into v_inicio_mas_temprano
  from public.entradas e
  join public.funciones f on f.id = e.funcion_id
  where e.compra_id = p_compra_id;

  if v_inicio_mas_temprano is null or v_inicio_mas_temprano - now() < interval '2 hours' then
    raise exception 'Ya no se puede cancelar: faltan menos de 2 horas para la función.';
  end if;

  update public.compras set estado = 'cancelada' where id = p_compra_id;
  update public.entradas set estado = 'cancelada' where compra_id = p_compra_id;

  update public.usuarios
  set credito_disponible = credito_disponible + v_compra.total
  where id = v_usuario_id;

  insert into public.movimientos_credito (usuario_id, tipo, monto, compra_origen_id)
  values (v_usuario_id, 'generado', v_compra.total, p_compra_id);
end;
$$;

grant execute on function public.cancelar_compra(uuid) to authenticated;

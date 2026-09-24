create policy "logs_actividad_insert_staff" on public.logs_actividad for insert
  with check (public.es_staff() and usuario_id = auth.uid());

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
    count(e.id) as entradas_vendidas
  from public.compras c
  left join public.entradas e on e.compra_id = c.id and e.estado <> 'cancelada'
  where c.estado = 'confirmada'
  group by date(c.created_at)
  order by date(c.created_at);
end;
$$;

grant execute on function public.reporte_facturacion_diaria() to authenticated;

create or replace function public.reporte_peliculas_mas_vistas(p_desde timestamptz)
returns table (pelicula_id uuid, entradas bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select f.pelicula_id, count(*) as entradas
  from public.entradas e
  join public.funciones f on f.id = e.funcion_id
  where e.estado <> 'cancelada' and f.inicio >= p_desde
  group by f.pelicula_id
  order by count(*) desc
  limit 10;
end;
$$;

grant execute on function public.reporte_peliculas_mas_vistas(timestamptz) to authenticated;

create or replace function public.reporte_candy_mas_vendido(p_desde timestamptz)
returns table (producto_id uuid, combo_id uuid, cantidad bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select cp.producto_id, cp.combo_id, sum(cp.cantidad) as cantidad
  from public.compra_productos cp
  join public.compras c on c.id = cp.compra_id
  where c.estado = 'confirmada' and c.created_at >= p_desde
  group by cp.producto_id, cp.combo_id
  order by sum(cp.cantidad) desc
  limit 10;
end;
$$;

grant execute on function public.reporte_candy_mas_vendido(timestamptz) to authenticated;

drop policy if exists "resenas_insert_propio" on public.resenas;

create policy "resenas_insert_propio" on public.resenas for insert
  with check (
    usuario_id = auth.uid()
    and exists (
      select 1
      from public.entradas e
      join public.funciones f on f.id = e.funcion_id
      join public.compras c on c.id = e.compra_id
      where c.usuario_id = auth.uid()
        and f.pelicula_id = resenas.pelicula_id
        and f.inicio < now()
        and e.estado <> 'cancelada'
    )
  );

create or replace view public.vista_resenas_promedio as
select pelicula_id, avg(estrellas)::numeric(3, 2) as promedio, count(*) as cantidad
from public.resenas
group by pelicula_id;

grant select on public.vista_resenas_promedio to anon, authenticated;

create or replace view public.vista_ventas_por_pelicula as
select p.id as pelicula_id, count(e.id) as entradas_vendidas
from public.peliculas p
left join public.funciones f on f.pelicula_id = p.id
left join public.entradas e on e.funcion_id = f.id and e.estado <> 'cancelada'
group by p.id;

grant select on public.vista_ventas_por_pelicula to anon, authenticated;

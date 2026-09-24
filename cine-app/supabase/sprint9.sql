alter table public.compra_productos
  add column retirado boolean not null default false;

create or replace function public.validar_entradas(p_compra_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_actualizadas integer;
begin
  if not public.es_staff() then
    raise exception 'No autorizado.';
  end if;

  update public.entradas
  set estado = 'validada'
  where compra_id = p_compra_id and estado = 'vigente';

  get diagnostics v_actualizadas = row_count;

  if v_actualizadas = 0 then
    raise exception 'No hay entradas pendientes de validar para este código.';
  end if;

  insert into public.logs_actividad (usuario_id, accion, detalle)
  values (
    v_usuario_id,
    'entradas_validadas',
    jsonb_build_object('compra_id', p_compra_id, 'cantidad', v_actualizadas)
  );

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
  v_actualizadas integer;
begin
  if not public.es_staff() then
    raise exception 'No autorizado.';
  end if;

  update public.compra_productos
  set retirado = true
  where compra_id = p_compra_id and retirado = false;

  get diagnostics v_actualizadas = row_count;

  if v_actualizadas = 0 then
    raise exception 'No hay productos de candy bar pendientes de retirar para este código.';
  end if;

  insert into public.logs_actividad (usuario_id, accion, detalle)
  values (
    v_usuario_id,
    'candy_entregado',
    jsonb_build_object('compra_id', p_compra_id, 'cantidad', v_actualizadas)
  );

  return v_actualizadas;
end;
$$;

grant execute on function public.validar_candy(uuid) to authenticated;

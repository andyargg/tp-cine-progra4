create extension if not exists btree_gist;

alter table public.funciones
  add constraint funciones_sin_solapamiento
  exclude using gist (sala_id with =, tstzrange(inicio, fin, '[)') with &&);

alter table public.alertas_estreno
  add column notificado boolean not null default false;

create policy "alertas_estreno_update_propio" on public.alertas_estreno for update using (usuario_id = auth.uid());

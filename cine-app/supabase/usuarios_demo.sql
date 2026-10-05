do $$
declare
  v_demo record;
  v_id uuid;
begin
  for v_demo in
    select * from (values
      ('cliente@cineapp.com',  'Cliente',  'Demo', '1995-05-10', 'cliente'),
      ('empleado@cineapp.com', 'Empleado', 'Demo', '1990-03-20', 'empleado'),
      ('admin@cineapp.com',    'Admin',    'Demo', '1985-01-15', 'admin')
    ) as t(email, nombre, apellido, fecha_nacimiento, rol)
  loop
    if exists (select 1 from auth.users where email = v_demo.email) then
      continue;
    end if;

    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_demo.email, extensions.crypt('Cine2026!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('nombre', v_demo.nombre, 'apellido', v_demo.apellido, 'fecha_nacimiento', v_demo.fecha_nacimiento),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_demo.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

alter table public.usuarios disable trigger trg_usuarios_bloquear_campos_sensibles;

update public.usuarios set rol = 'empleado' where email = 'empleado@cineapp.com';
update public.usuarios set rol = 'admin' where email = 'admin@cineapp.com';

alter table public.usuarios enable trigger trg_usuarios_bloquear_campos_sensibles;

select u.email, u.rol, a.email_confirmed_at
from public.usuarios u
join auth.users a on a.id = u.id
where u.email like '%@cineapp.com'
order by u.email;

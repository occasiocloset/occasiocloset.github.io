-- =====================================================================
-- OCCASIO · Panel de administración y permiso de novedades
-- ---------------------------------------------------------------------
-- Pégalo entero en Supabase › SQL Editor y pulsa «Run». Una sola vez.
-- Si entras en Occasio con otro correo, cámbialo en la última línea.
-- =====================================================================

-- Quién es administradora (solo se puede añadir desde aquí, nunca desde la app)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;   -- sin reglas: la app no puede leerla

create or replace function public.soy_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Permiso para recibir novedades por correo (casilla opcional del registro)
alter table public.perfiles add column if not exists acepta_novedades boolean not null default false;
grant update (nombre, foto_path, acepta_novedades) on public.perfiles to authenticated;

create or replace function public.nuevo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, acepta_novedades)
  values (new.id,
          coalesce(left(new.raw_user_meta_data->>'nombre', 40), ''),
          coalesce((new.raw_user_meta_data->>'acepta_novedades')::boolean, false))
  on conflict (id) do nothing;
  return new;
end $$;

-- Lista de usuarias con su actividad (solo administración). No incluye fotos ni calendario.
drop function if exists public.admin_usuarias();
create or replace function public.admin_usuarias()
returns table (
  id uuid, correo text, nombre text, alta timestamptz, ultimo_acceso timestamptz,
  ultima_actividad timestamptz, acepta_novedades boolean,
  prendas int, looks int, amigas int, publicaciones int,
  prestamos_pedidos int, prestamos_hechos int, dias_planificados int
)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.soy_admin() then raise exception 'Solo para administración'; end if;
  return query
  select u.id, u.email::text, coalesce(p.nombre, ''), u.created_at, u.last_sign_in_at,
         greatest(u.last_sign_in_at,
                  (select max(x.creado) from public.prendas x where x.duena = u.id),
                  (select max(x.creado) from public.looks x where x.duena = u.id),
                  (select max(x.creado) from public.publicaciones x where x.autora = u.id),
                  (select max(x.actualizado) from public.prestamos x where x.a = u.id or x.de = u.id)),
         coalesce(p.acepta_novedades, false),
         (select count(*) from public.prendas x where x.duena = u.id)::int,
         (select count(*) from public.looks x where x.duena = u.id)::int,
         (select count(*) from public.amistades x where x.a = u.id or x.b = u.id)::int,
         (select count(*) from public.publicaciones x where x.autora = u.id)::int,
         (select count(*) from public.prestamos x where x.a = u.id)::int,
         (select count(*) from public.prestamos x where x.de = u.id and x.estado in ('aceptada','devuelta'))::int,
         (select count(*) from public.calendario x where x.duena = u.id and x.look is not null)::int
    from auth.users u
    left join public.perfiles p on p.id = u.id
   order by u.created_at desc;
end $$;

revoke execute on function public.admin_usuarias(), public.soy_admin() from anon, public;
grant execute on function public.admin_usuarias(), public.soy_admin() to authenticated;

-- Tú eres la administradora
insert into public.admins (user_id)
select id from auth.users where email = 'vicente.menarguess@gmail.com'
on conflict do nothing;

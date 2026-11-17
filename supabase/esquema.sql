-- =====================================================================
-- OCCASIO · Base de datos (Supabase)
-- ---------------------------------------------------------------------
-- Cómo usarlo: en tu proyecto de Supabase, abre «SQL Editor», pega TODO
-- este archivo y pulsa «Run». Solo hay que hacerlo una vez.
--
-- Quién ve qué (lo hacen cumplir las reglas RLS de abajo):
--   · Tus prendas, tus looks y tus publicaciones: tú y tus amigas.
--   · Tu calendario: solo tú.
--   · Préstamos: solo las dos personas implicadas.
--   · Fotos: tú y tus amigas.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Perfiles ----------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null default '' check (char_length(nombre) <= 40),
  foto_path  text,
  codigo     text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  creado     timestamptz not null default now()
);

-- Al registrarse una usuaria se crea su perfil
create or replace function public.nuevo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(left(new.raw_user_meta_data->>'nombre', 40), ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists al_crear_usuaria on auth.users;
create trigger al_crear_usuaria after insert on auth.users
  for each row execute function public.nuevo_perfil();

-- ---------- Amistades ----------
create table if not exists public.amistades (
  a       uuid not null references public.perfiles(id) on delete cascade,
  b       uuid not null references public.perfiles(id) on delete cascade,
  creado  timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

create or replace function public.es_amiga(otra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.amistades
    where (a = auth.uid() and b = otra) or (b = auth.uid() and a = otra)
  );
$$;

-- ---------- Prendas ----------
create table if not exists public.prendas (
  id          uuid primary key default gen_random_uuid(),
  duena       uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 1 and 60),
  tipo        text not null check (tipo in ('arriba','abajo','vestido','abrigo','calzado','accesorio')),
  color       text not null check (char_length(color) <= 20),
  temporada   text not null default 'todo' check (temporada in ('invierno','verano','entretiempo','todo')),
  foto_path   text,
  usos        int not null default 0 check (usos >= 0),
  ultimo_uso  date,
  precio      numeric(10,2) check (precio is null or precio >= 0),
  creado      timestamptz not null default now()
);
create index if not exists prendas_duena on public.prendas(duena);

-- ---------- Looks ----------
create table if not exists public.looks (
  id       uuid primary key default gen_random_uuid(),
  duena    uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  nombre   text not null check (char_length(nombre) between 1 and 60),
  prendas  uuid[] not null default '{}',
  creado   timestamptz not null default now()
);
create index if not exists looks_duena on public.looks(duena);

-- ---------- Calendario (privado) ----------
create table if not exists public.calendario (
  duena    uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  fecha    date not null,
  look     uuid references public.looks(id) on delete set null,
  plan     text not null default '' check (char_length(plan) <= 80),
  amigas   uuid[] not null default '{}',
  contado  boolean not null default false,
  primary key (duena, fecha)
);

-- ---------- Publicaciones y reacciones ----------
create table if not exists public.publicaciones (
  id      uuid primary key default gen_random_uuid(),
  autora  uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  look    uuid not null references public.looks(id) on delete cascade,
  texto   text not null default '' check (char_length(texto) <= 200),
  creado  timestamptz not null default now()
);
create index if not exists publicaciones_creado on public.publicaciones(creado desc);

create table if not exists public.reacciones (
  publicacion  uuid not null references public.publicaciones(id) on delete cascade,
  usuaria      uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  emoji        text not null check (emoji in ('❤️','🔥','✨')),
  primary key (publicacion, usuaria, emoji)
);

-- ---------- Préstamos ----------
create table if not exists public.prestamos (
  id           uuid primary key default gen_random_uuid(),
  prenda       uuid not null references public.prendas(id) on delete cascade,
  de           uuid not null references public.perfiles(id) on delete cascade,   -- quien presta
  a            uuid not null default auth.uid() references public.perfiles(id) on delete cascade, -- quien pide
  desde        date not null,
  hasta        date not null,
  mensaje      text not null default '' check (char_length(mensaje) <= 300),
  estado       text not null default 'pendiente'
               check (estado in ('pendiente','aceptada','rechazada','devuelta','cancelada')),
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now(),
  check (hasta >= desde)
);
create index if not exists prestamos_de on public.prestamos(de);
create index if not exists prestamos_a on public.prestamos(a);

-- =====================================================================
-- Reglas de acceso (Row Level Security)
-- =====================================================================
alter table public.perfiles      enable row level security;
alter table public.amistades     enable row level security;
alter table public.prendas       enable row level security;
alter table public.looks         enable row level security;
alter table public.calendario    enable row level security;
alter table public.publicaciones enable row level security;
alter table public.reacciones    enable row level security;
alter table public.prestamos     enable row level security;

-- Perfiles: el tuyo y los de tus amigas. Solo puedes cambiar tu nombre y tu foto.
drop policy if exists perfiles_ver on public.perfiles;
create policy perfiles_ver on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_amiga(id));
drop policy if exists perfiles_editar on public.perfiles;
create policy perfiles_editar on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.perfiles from authenticated, anon;
grant update (nombre, foto_path) on public.perfiles to authenticated;

-- Amistades: se crean con un enlace de invitación (función aceptar_invitacion)
drop policy if exists amistades_ver on public.amistades;
create policy amistades_ver on public.amistades for select to authenticated
  using (a = auth.uid() or b = auth.uid());
drop policy if exists amistades_borrar on public.amistades;
create policy amistades_borrar on public.amistades for delete to authenticated
  using (a = auth.uid() or b = auth.uid());

-- Prendas y looks: los ves tú y tus amigas; solo tú los cambias
drop policy if exists prendas_ver on public.prendas;
create policy prendas_ver on public.prendas for select to authenticated
  using (duena = auth.uid() or public.es_amiga(duena));
drop policy if exists prendas_crear on public.prendas;
create policy prendas_crear on public.prendas for insert to authenticated with check (duena = auth.uid());
drop policy if exists prendas_editar on public.prendas;
create policy prendas_editar on public.prendas for update to authenticated
  using (duena = auth.uid()) with check (duena = auth.uid());
drop policy if exists prendas_borrar on public.prendas;
create policy prendas_borrar on public.prendas for delete to authenticated using (duena = auth.uid());

drop policy if exists looks_ver on public.looks;
create policy looks_ver on public.looks for select to authenticated
  using (duena = auth.uid() or public.es_amiga(duena));
drop policy if exists looks_crear on public.looks;
create policy looks_crear on public.looks for insert to authenticated with check (duena = auth.uid());
drop policy if exists looks_editar on public.looks;
create policy looks_editar on public.looks for update to authenticated
  using (duena = auth.uid()) with check (duena = auth.uid());
drop policy if exists looks_borrar on public.looks;
create policy looks_borrar on public.looks for delete to authenticated using (duena = auth.uid());

-- Calendario: solo tú
drop policy if exists calendario_mio on public.calendario;
create policy calendario_mio on public.calendario for all to authenticated
  using (duena = auth.uid()) with check (duena = auth.uid());

-- Publicaciones: las ves tú y tus amigas
drop policy if exists publicaciones_ver on public.publicaciones;
create policy publicaciones_ver on public.publicaciones for select to authenticated
  using (autora = auth.uid() or public.es_amiga(autora));
drop policy if exists publicaciones_crear on public.publicaciones;
create policy publicaciones_crear on public.publicaciones for insert to authenticated
  with check (autora = auth.uid() and exists (select 1 from public.looks l where l.id = look and l.duena = auth.uid()));
drop policy if exists publicaciones_borrar on public.publicaciones;
create policy publicaciones_borrar on public.publicaciones for delete to authenticated using (autora = auth.uid());

drop policy if exists reacciones_ver on public.reacciones;
create policy reacciones_ver on public.reacciones for select to authenticated
  using (exists (select 1 from public.publicaciones p where p.id = publicacion and (p.autora = auth.uid() or public.es_amiga(p.autora))));
drop policy if exists reacciones_crear on public.reacciones;
create policy reacciones_crear on public.reacciones for insert to authenticated
  with check (usuaria = auth.uid() and exists (select 1 from public.publicaciones p where p.id = publicacion and (p.autora = auth.uid() or public.es_amiga(p.autora))));
drop policy if exists reacciones_borrar on public.reacciones;
create policy reacciones_borrar on public.reacciones for delete to authenticated using (usuaria = auth.uid());

-- Préstamos: solo las dos implicadas. Se piden con insert; se responden con funciones.
drop policy if exists prestamos_ver on public.prestamos;
create policy prestamos_ver on public.prestamos for select to authenticated
  using (de = auth.uid() or a = auth.uid());
drop policy if exists prestamos_pedir on public.prestamos;
create policy prestamos_pedir on public.prestamos for insert to authenticated
  with check (
    a = auth.uid() and estado = 'pendiente' and de <> auth.uid() and public.es_amiga(de)
    and exists (select 1 from public.prendas p where p.id = prenda and p.duena = de)
  );

-- =====================================================================
-- Funciones que llama la app
-- =====================================================================

-- Responder a una petición (solo quien presta)
create or replace function public.responder_prestamo(p_id uuid, p_acepta boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.prestamos
     set estado = case when p_acepta then 'aceptada' else 'rechazada' end, actualizado = now()
   where id = p_id and de = auth.uid() and estado = 'pendiente';
  if not found then raise exception 'No se puede responder a esta petición'; end if;
end $$;

-- Marcar como devuelta (cualquiera de las dos)
create or replace function public.devolver_prestamo(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.prestamos set estado = 'devuelta', actualizado = now()
   where id = p_id and (de = auth.uid() or a = auth.uid()) and estado = 'aceptada';
  if not found then raise exception 'Este préstamo no está activo'; end if;
end $$;

-- Cancelar una petición propia que aún no han respondido
create or replace function public.cancelar_prestamo(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.prestamos set estado = 'cancelada', actualizado = now()
   where id = p_id and a = auth.uid() and estado = 'pendiente';
  if not found then raise exception 'Esta petición ya no se puede cancelar'; end if;
end $$;

-- Nombre de quien invita (para enseñarlo antes de aceptar)
create or replace function public.perfil_por_codigo(p_codigo text)
returns table (id uuid, nombre text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nombre from public.perfiles p where p.codigo = p_codigo and auth.uid() is not null;
$$;

-- Aceptar una invitación: os hace amigas a las dos
create or replace function public.aceptar_invitacion(p_codigo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare otra uuid;
begin
  if auth.uid() is null then raise exception 'Tienes que entrar en tu cuenta'; end if;
  select id into otra from public.perfiles where codigo = p_codigo;
  if otra is null then raise exception 'Esta invitación no es válida'; end if;
  if otra = auth.uid() then raise exception 'Es tu propio enlace de invitación'; end if;
  insert into public.amistades (a, b) values (least(otra, auth.uid()), greatest(otra, auth.uid()))
  on conflict do nothing;
  return otra;
end $$;

-- Al pasar el día, las prendas del look suman una puesta
create or replace function public.procesar_dias(p_hoy date) returns void
language plpgsql security definer set search_path = public as $$
begin
  with pendientes as (
    select c.fecha, c.look from public.calendario c
     where c.duena = auth.uid() and c.fecha < p_hoy and not c.contado and c.look is not null
  ), piezas as (
    select unnest(l.prendas) as prenda, p.fecha
      from pendientes p join public.looks l on l.id = p.look
  ), total as (
    select prenda, count(*) as n, max(fecha) as ultima from piezas group by prenda
  )
  update public.prendas pr
     set usos = pr.usos + total.n,
         ultimo_uso = greatest(coalesce(pr.ultimo_uso, total.ultima), total.ultima)
    from total
   where pr.id = total.prenda and pr.duena = auth.uid();

  update public.calendario set contado = true
   where duena = auth.uid() and fecha < p_hoy and not contado;
end $$;

-- Borrar la cuenta y todos sus datos
create or replace function public.borrar_cuenta() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Tienes que entrar en tu cuenta'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.responder_prestamo(uuid, boolean), public.devolver_prestamo(uuid),
  public.cancelar_prestamo(uuid), public.perfil_por_codigo(text), public.aceptar_invitacion(text),
  public.procesar_dias(date), public.borrar_cuenta() from anon, public;
grant execute on function public.responder_prestamo(uuid, boolean), public.devolver_prestamo(uuid),
  public.cancelar_prestamo(uuid), public.perfil_por_codigo(text), public.aceptar_invitacion(text),
  public.procesar_dias(date), public.borrar_cuenta(), public.es_amiga(uuid) to authenticated;

-- =====================================================================
-- Fotos (Storage): carpeta privada «fotos», una subcarpeta por usuaria
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fotos_subir on storage.objects;
create policy fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists fotos_ver on storage.objects;
create policy fotos_ver on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.es_amiga(((storage.foldername(name))[1])::uuid)
  ));
drop policy if exists fotos_borrar on storage.objects;
create policy fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- Avisos en tiempo real
-- =====================================================================
do $$
begin
  begin alter publication supabase_realtime add table public.prestamos;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.amistades;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.publicaciones; exception when duplicate_object then null; end;
end $$;

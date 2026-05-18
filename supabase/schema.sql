-- =============================================
-- PORTO CAR WASH - Schema de base de datos
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- -----------------------------------------------
-- TABLA: clientes
-- -----------------------------------------------
create table clientes (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  placa text not null unique,
  whatsapp text not null,
  lavadas_total integer not null default 0,
  lavadas_ciclo integer not null default 0, -- 0-9, al llegar a 10 se resetea
  gratis_disponibles integer not null default 0,
  created_at timestamptz default now()
);

-- Índice para búsqueda rápida por placa
create index idx_clientes_placa on clientes(placa);

-- -----------------------------------------------
-- TABLA: empleados (manejada por Supabase Auth)
-- Los empleados se crean desde el panel admin de Supabase
-- Esta tabla extiende auth.users con el rol
-- -----------------------------------------------
create table empleados (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('empleado', 'admin')),
  activo boolean not null default true,
  created_at timestamptz default now()
);

-- -----------------------------------------------
-- TABLA: codigos
-- Códigos de un solo uso para registrar lavadas
-- -----------------------------------------------
create table codigos (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null,           -- 4 dígitos
  cliente_id uuid not null references clientes(id),
  empleado_id uuid not null references empleados(id),
  placa text not null,
  usado boolean not null default false,
  expira_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz default now()
);

-- Índice normal por placa para búsquedas rápidas
create index idx_codigos_placa on codigos(placa);
-- Nota: la unicidad de código activo por placa se maneja en la API
-- (anulamos códigos anteriores antes de crear uno nuevo)

-- -----------------------------------------------
-- TABLA: lavadas
-- Historial completo de cada lavada registrada
-- -----------------------------------------------
create table lavadas (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references clientes(id),
  empleado_id uuid not null references empleados(id),
  codigo_id uuid not null references codigos(id),
  placa text not null,
  fue_gratis boolean not null default false,
  created_at timestamptz default now()
);

-- -----------------------------------------------
-- FUNCIÓN: registrar_lavada
-- Atómica: valida código, registra lavada, actualiza puntos
-- -----------------------------------------------
create or replace function registrar_lavada(
  p_codigo text,
  p_cliente_id uuid
)
returns json
language plpgsql
security definer
as $$
declare
  v_codigo record;
  v_cliente record;
  v_fue_gratis boolean := false;
begin
  -- Buscar código válido
  select * into v_codigo
  from codigos
  where codigo = p_codigo
    and cliente_id = p_cliente_id
    and usado = false
    and expira_at > now()
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'Código inválido, expirado o ya usado');
  end if;

  -- Obtener cliente
  select * into v_cliente from clientes where id = p_cliente_id for update;

  -- Marcar código como usado
  update codigos set usado = true where id = v_codigo.id;

  -- Registrar la lavada
  insert into lavadas (cliente_id, empleado_id, codigo_id, placa, fue_gratis)
  values (p_cliente_id, v_codigo.empleado_id, v_codigo.id, v_cliente.placa, v_fue_gratis);

  -- Actualizar puntos del cliente
  if v_cliente.lavadas_ciclo >= 9 then
    -- Completó las 10, da lavada gratis y resetea
    update clientes set
      lavadas_total = lavadas_total + 1,
      lavadas_ciclo = 0,
      gratis_disponibles = gratis_disponibles + 1
    where id = p_cliente_id;
  else
    update clientes set
      lavadas_total = lavadas_total + 1,
      lavadas_ciclo = lavadas_ciclo + 1
    where id = p_cliente_id;
  end if;

  return json_build_object('ok', true, 'lavadas_ciclo', v_cliente.lavadas_ciclo + 1);
end;
$$;

-- -----------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------

alter table clientes enable row level security;
alter table empleados enable row level security;
alter table codigos enable row level security;
alter table lavadas enable row level security;

-- Clientes: lectura pública (el cliente ve su info con su ID)
create policy "clientes_select" on clientes for select using (true);
create policy "clientes_insert" on clientes for insert with check (true);

-- Empleados: solo autenticados
create policy "empleados_select" on empleados for select
  using (auth.uid() is not null);

-- Códigos: solo empleados autenticados crean/leen
create policy "codigos_select" on codigos for select
  using (auth.uid() is not null);
create policy "codigos_insert" on codigos for insert
  with check (auth.uid() is not null);
create policy "codigos_update" on codigos for update
  using (auth.uid() is not null);

-- Lavadas: empleados autenticados leen, función las inserta
create policy "lavadas_select" on lavadas for select
  using (auth.uid() is not null);

-- =====================================================================
-- JJ Casa Limpa — banco de dados, segurança e fotos (Supabase)
-- Como usar: Supabase → SQL Editor → New query → cole TODO este arquivo → Run.
-- Pode ser executado mais de uma vez sem apagar dados.
-- =====================================================================

-- ---------- Tabelas ----------

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (char_length(btrim(title)) between 1 and 80),
  description       text not null default '' check (char_length(description) <= 1000),
  category          text not null default '' check (char_length(category) <= 40),
  price_cents       integer not null check (price_cents > 0),
  promo_price_cents integer check (promo_price_cents is null or (promo_price_cents > 0 and promo_price_cents < price_cents)),
  promo_start       date,
  promo_end         date,
  active            boolean not null default true,
  sort_order        integer not null default 0,
  images            text[] not null default '{}' check (coalesce(array_length(images, 1), 0) <= 5),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint promo_dates_ok check (promo_start is null or promo_end is null or promo_end >= promo_start)
);

create index if not exists products_active_order_idx on public.products (active, sort_order, title);

-- Configurações da loja: sempre uma única linha (id = 1).
create table if not exists public.settings (
  id              smallint primary key default 1 check (id = 1),
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^55[0-9]{10,11}$'),
  welcome_message text not null default '',
  contact_info    text not null default '',
  business_hours  text not null default '',
  updated_at      timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Quem é administrador (usuários criados manualmente no painel do Supabase).
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Atualiza updated_at automaticamente.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------- Segurança (RLS) ----------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.admins   enable row level security; -- sem políticas: ninguém lê pela API

-- Produtos: qualquer pessoa vê os ativos; admin vê e altera tudo.
drop policy if exists "produtos ativos são públicos" on public.products;
create policy "produtos ativos são públicos" on public.products
  for select to anon, authenticated using (active);

drop policy if exists "admin lê todos os produtos" on public.products;
create policy "admin lê todos os produtos" on public.products
  for select to authenticated using (public.is_admin());

drop policy if exists "admin cria produtos" on public.products;
create policy "admin cria produtos" on public.products
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admin altera produtos" on public.products;
create policy "admin altera produtos" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin exclui produtos" on public.products;
create policy "admin exclui produtos" on public.products
  for delete to authenticated using (public.is_admin());

-- Configurações: leitura pública; só admin altera.
drop policy if exists "configurações são públicas" on public.settings;
create policy "configurações são públicas" on public.settings
  for select to anon, authenticated using (true);

drop policy if exists "admin altera configurações" on public.settings;
create policy "admin altera configurações" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Fotos (Storage) ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Bucket público: as fotos abrem pela URL pública sem política de leitura.
-- Envio, troca e exclusão: só admin. (Excluir também exige "select".)
drop policy if exists "admin lê fotos" on storage.objects;
create policy "admin lê fotos" on storage.objects
  for select to authenticated using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin envia fotos" on storage.objects;
create policy "admin envia fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin altera fotos" on storage.objects;
create policy "admin altera fotos" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin exclui fotos" on storage.objects;
create policy "admin exclui fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- ---------- Produtos de exemplo ----------
-- Aparecem sem foto (com a imagem padrão). Apague pelo painel ou rodando:
--   delete from public.products where id::text like '00000000-0000-4000-8000-%';

insert into public.products (id, title, description, category, price_cents, promo_price_cents, sort_order)
values
  ('00000000-0000-4000-8000-000000000001', 'Detergente Neutro 500ml', 'Remove gordura com facilidade e é suave para as mãos.', 'Cozinha', 349, null, 10),
  ('00000000-0000-4000-8000-000000000002', 'Água Sanitária 2L', 'Alvejante e desinfetante para limpeza pesada de pisos, banheiros e roupas brancas.', 'Multiuso', 890, 790, 20),
  ('00000000-0000-4000-8000-000000000003', 'Desinfetante Lavanda 2L', 'Perfuma e desinfeta pisos e banheiros. Rende muito.', 'Banheiro', 1290, null, 30),
  ('00000000-0000-4000-8000-000000000004', 'Sabão Líquido para Roupas 3L', 'Limpa profundamente sem desbotar as cores.', 'Roupas', 2990, null, 40)
on conflict (id) do nothing;

-- ---------- Depois de criar o seu usuário (Authentication → Users → Add user) ----------
-- Troque o e-mail abaixo e rode estas linhas para torná-lo administrador:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'seu-email@exemplo.com'
--   on conflict do nothing;

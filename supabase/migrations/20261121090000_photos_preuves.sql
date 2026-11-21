-- Photos de preuve : le cadre peut joindre jusqu'à trois photos du travail réussi à une validation.
-- Décision du 21 novembre 2026, qui assouplit la règle « jamais de photo » de la conception :
-- la photo montre le travail (nœud, construction, carte, dessin…), l'application rappelle d'éviter
-- les visages, et le consentement des parents couvre ces photos.
--
-- • Mêmes droits que la validation : l'unité ajoute, l'encadrement et les parents (avec consentement) voient.
-- • Rien ne se modifie ni ne s'efface, comme la validation elle-même.
-- • Le fichier vit dans le bucket privé « preuves », au chemin <jeune>/<photo>.jpg fixé par la base ;
--   il est réduit sur le téléphone (1280 px, sans métadonnées EXIF ni position GPS) avant l'envoi.
-- • La ligne d'abord, le fichier ensuite : un fichier ne se dépose que pour une photo enregistrée par
--   la même personne, et ne se lit qu'avec sa ligne. Les règles de la table (trois au plus, validation
--   active) valent donc aussi pour les fichiers, et un fichier orphelin n'est lisible de personne.

-- ─── Table ───────────────────────────────────────────────────────────────────

create table public.photos_preuves (
  -- Identifiant créé sur le téléphone : renvoyer la même photo ne la double pas.
  id uuid primary key,
  validation_id uuid not null references public.validations (id),
  jeune_id uuid not null references public.jeunes (id),
  chemin text generated always as (jeune_id::text || '/' || id::text || '.jpg') stored unique,
  taille integer not null check (taille between 1 and 1048576),
  ajoute_par uuid not null default auth.uid() references public.utilisateurs (id),
  created_at timestamptz not null default now()
);
create index on public.photos_preuves (validation_id);
create index on public.photos_preuves (jeune_id);

-- security definer : lit la validation sans filtre ; mais pour qui ne gère pas ce jeune, ne dit rien
-- (ni annulée ni complète) et laisse la RLS refuser la ligne.
create function app.photo_valide() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v public.validations;
begin
  if auth.uid() is not null and not app.gere_jeune(new.jeune_id) then
    return new;
  end if;
  -- Verrou sur la validation : deux envois simultanés ne dépassent pas trois photos.
  select * into v from public.validations where id = new.validation_id for update;
  if v.jeune_id is distinct from new.jeune_id then
    raise exception 'La photo doit être jointe à une validation de ce jeune.';
  end if;
  if v.annulee_le is not null then
    raise exception 'Cette validation est annulée : aucune photo ne s''y ajoute.';
  end if;
  if (select count(*) from public.photos_preuves p where p.validation_id = new.validation_id) >= 3 then
    raise exception 'Trois photos au plus par preuve validée.';
  end if;
  if auth.uid() is not null then
    new.created_at := now();
  end if;
  return new;
end
$$;
create trigger controle before insert on public.photos_preuves for each row execute function app.photo_valide();

grant select, insert on public.photos_preuves to authenticated;
grant select, insert, update, delete on public.photos_preuves to service_role;

alter table public.photos_preuves enable row level security;

create policy photos_lecture on public.photos_preuves for select to authenticated
  using (app.lit_jeune(jeune_id));
create policy photos_ajout on public.photos_preuves for insert to authenticated
  with check (ajoute_par = (select auth.uid()) and app.gere_jeune(jeune_id));

-- ─── Fichiers ────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('preuves', 'preuves', false, 1048576, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

-- Un nom de dossier qui n'est pas un uuid donne null (aucun droit) au lieu d'une erreur.
create function app.uuid_ou_null(p text) returns uuid
language sql immutable set search_path = ''
as $$ select case when p ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end $$;
revoke all on function app.uuid_ou_null(text) from public;
grant execute on function app.uuid_ou_null(text) to authenticated;

create policy preuves_lecture on storage.objects for select to authenticated
  using (
    bucket_id = 'preuves'
    and exists (select 1 from public.photos_preuves p where p.chemin = name and app.lit_jeune(p.jeune_id))
  );

create policy preuves_depot on storage.objects for insert to authenticated
  with check (
    bucket_id = 'preuves'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
    and app.gere_jeune(app.uuid_ou_null((storage.foldername(name))[1]))
    and exists (select 1 from public.photos_preuves p where p.chemin = name and p.ajoute_par = (select auth.uid()))
  );
-- Ni modification ni suppression : aucune règle ne les autorise.

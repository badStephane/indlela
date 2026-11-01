-- Schéma V1 du carnet de progression (conception, « Modèle de données » et « Droits d'accès »).
--
-- Choix faits ici, par rapport aux 17 tables de la conception :
-- • Un référentiel publié est une ligne versionnée dont les étapes, domaines et preuves sont un
--   document jsonb (le format que l'application manipule déjà). Une version publiée ne change plus ;
--   les validations gardent l'identifiant de la preuve et le numéro de version.
-- • La décision de la cour d'honneur (table cours_honneur) tient aussi lieu d'etapes_jeunes :
--   une décision « reconnue » est la remise de l'étape, à sa date.
-- • Le catalogue des spécialités (reconnaissances, reconnaissances_jeunes) attend la V2.
--
-- Les droits sont appliqués par la base : chaque table a la RLS, et les fonctions du schéma app
-- disent qui est connecté. Un compte admin, chef de groupe ou responsable progression
-- sans second facteur (aal2) n'a aucun droit.

create schema if not exists app;
grant usage on schema app to authenticated;

-- ─── Organisation ────────────────────────────────────────────────────────────

create table public.groupes (
  id uuid primary key default gen_random_uuid(),
  nom text not null default '' check (char_length(nom) <= 60),
  paroisse text not null default '' check (char_length(paroisse) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.utilisateurs (
  id uuid primary key references auth.users (id) on delete cascade,
  groupe_id uuid not null references public.groupes (id),
  nom text not null check (char_length(nom) between 1 and 80),
  identifiant text not null unique check (identifiant ~ '^[a-z0-9.-]{2,60}$'),
  role text not null check (role in ('admin', 'groupe', 'progression', 'cadre', 'parent')),
  actif boolean not null default true,
  derniere_connexion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.utilisateurs (groupe_id);

create table public.unites (
  id uuid primary key default gen_random_uuid(),
  groupe_id uuid not null references public.groupes (id),
  branche text not null check (branche in ('meute', 'troupe', 'route')),
  nom text not null check (char_length(nom) between 1 and 80),
  annee text not null check (annee ~ '^\d{4}-\d{4}$'),
  responsable_id uuid references public.utilisateurs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (groupe_id, branche, annee)
);

create table public.affectations_cadres (
  utilisateur_id uuid not null references public.utilisateurs (id) on delete cascade,
  unite_id uuid not null references public.unites (id) on delete cascade,
  primary key (utilisateur_id, unite_id)
);
create index on public.affectations_cadres (unite_id);

create table public.jeunes (
  id uuid primary key default gen_random_uuid(),
  groupe_id uuid not null references public.groupes (id),
  unite_id uuid not null references public.unites (id),
  prenom text not null check (char_length(prenom) between 1 and 60),
  nom text not null check (char_length(nom) between 1 and 60),
  date_naissance date,
  date_entree date not null default current_date,
  -- Étape en cours : identifiant d'étape du référentiel de la branche.
  etape_id text not null,
  -- Domaines au choix et brevets retenus pour ce jeune.
  choix text[] not null default '{}',
  -- Spécialités affichées sur la fiche ({ name, meta }), en attendant le catalogue de la V2.
  specs jsonb not null default '[]' check (jsonb_typeof(specs) = 'array'),
  statut text not null default 'actif' check (statut in ('actif', 'sorti')),
  -- Aucune fiche visible des parents sans le consentement enregistré.
  consentement_le date,
  importe boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.jeunes (unite_id);
create index on public.jeunes (groupe_id);

create table public.historique_unite (
  id uuid primary key default gen_random_uuid(),
  jeune_id uuid not null references public.jeunes (id) on delete cascade,
  unite_id uuid not null references public.unites (id),
  debut date not null,
  fin date,
  check (fin is null or fin >= debut)
);
create index on public.historique_unite (jeune_id);

create table public.liens_parent (
  utilisateur_id uuid not null references public.utilisateurs (id) on delete cascade,
  jeune_id uuid not null references public.jeunes (id) on delete cascade,
  primary key (utilisateur_id, jeune_id)
);
create index on public.liens_parent (jeune_id);

-- ─── Configuration ───────────────────────────────────────────────────────────

create table public.referentiels (
  id uuid primary key default gen_random_uuid(),
  groupe_id uuid not null references public.groupes (id),
  branche text not null check (branche in ('meute', 'troupe', 'route')),
  version integer not null check (version > 0),
  -- Étapes, domaines et preuves, au format Etape[] de l'application.
  etapes jsonb not null check (jsonb_typeof(etapes) = 'array'),
  -- Vide : brouillon, invisible des cadres. Renseigné : version publiée, qui ne change plus.
  publie_le timestamptz,
  publie_par uuid references public.utilisateurs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (groupe_id, branche, version)
);
-- Un seul brouillon par branche.
create unique index referentiels_un_brouillon on public.referentiels (groupe_id, branche) where publie_le is null;

create table public.adaptations_unite (
  unite_id uuid primary key references public.unites (id) on delete cascade,
  -- Domaines au choix retirés pour l'unité.
  retirees text[] not null default '{}',
  -- Preuves propres à l'unité, par identifiant de domaine : { "<domaine>": [{ id, label }] }.
  ajoutees jsonb not null default '{}' check (jsonb_typeof(ajoutees) = 'object'),
  updated_at timestamptz not null default now()
);

-- ─── Progression ─────────────────────────────────────────────────────────────

create table public.validations (
  -- Identifiant créé sur le téléphone : renvoyer la même saisie ne la double pas.
  id uuid primary key default gen_random_uuid(),
  jeune_id uuid not null references public.jeunes (id),
  etape_id text not null,
  domaine_id text not null,
  preuve_id text not null,
  date date not null,
  valide_par uuid not null default auth.uid() references public.utilisateurs (id),
  valide_par_nom text not null check (char_length(valide_par_nom) between 1 and 80),
  commentaire text check (char_length(commentaire) <= 500),
  ref_version integer,
  -- Une validation ne s'efface jamais : on renseigne annulee_le.
  annulee_le timestamptz,
  annulee_par text check (char_length(annulee_par) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.validations (jeune_id);
-- Une preuve n'a qu'une validation active par jeune.
create unique index validations_une_active on public.validations (jeune_id, preuve_id) where annulee_le is null;

create table public.cours_honneur (
  id uuid primary key default gen_random_uuid(),
  jeune_id uuid not null references public.jeunes (id),
  etape_id text not null,
  -- Date de la cour d'honneur ; date de remise quand l'étape est reconnue.
  date date not null,
  decision text not null check (decision in ('reconnue', 'ajournee')),
  observations text not null default '' check (char_length(observations) <= 1000),
  -- Chef de troupe qui signe les observations.
  ct text not null check (char_length(ct) between 1 and 80),
  -- Vote secret : les totaux seulement, jamais qui a voté quoi.
  presents integer check (presents between 1 and 99),
  voix_pour integer check (voix_pour >= 0 and voix_pour <= presents),
  saisi_par uuid not null default auth.uid() references public.utilisateurs (id),
  created_at timestamptz not null default now()
);
create index on public.cours_honneur (jeune_id);

-- ─── Journal ─────────────────────────────────────────────────────────────────

create table public.journal (
  id uuid primary key default gen_random_uuid(),
  groupe_id uuid not null references public.groupes (id),
  utilisateur_id uuid not null default auth.uid() references public.utilisateurs (id),
  utilisateur_nom text not null check (char_length(utilisateur_nom) <= 80),
  at timestamptz not null default now(),
  action text not null check (action in ('validation', 'annulation', 'publication', 'creation', 'modification', 'consentement', 'import', 'export', 'sauvegarde')),
  table_name text not null,
  ligne text not null,
  resume text not null check (char_length(resume) <= 500),
  avant jsonb,
  apres jsonb
);
create index on public.journal (groupe_id, at desc);

-- ─── Qui est connecté ────────────────────────────────────────────────────────
-- security definer : ces fonctions lisent les comptes sans repasser par la RLS (pas de récursion).
-- Un compte désactivé, ou un compte à double authentification connecté sans second facteur,
-- n'a ni rôle ni groupe.

create function app.mon_compte() returns public.utilisateurs
language sql stable security definer set search_path = ''
as $$
  select u.* from public.utilisateurs u
  where u.id = auth.uid()
    and u.actif
    and (u.role not in ('admin', 'groupe', 'progression') or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
$$;

create function app.mon_role() returns text
language sql stable security definer set search_path = ''
as $$ select (app.mon_compte()).role $$;

create function app.mon_groupe() returns uuid
language sql stable security definer set search_path = ''
as $$ select (app.mon_compte()).groupe_id $$;

-- Le chef de groupe et le responsable progression gèrent toutes les unités du groupe ;
-- un cadre, celles auxquelles il est affecté ou dont il est responsable.
create function app.gere_unite(p_unite uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.unites un
    where un.id = p_unite
      and un.groupe_id = app.mon_groupe()
      and (
        app.mon_role() in ('groupe', 'progression')
        or (app.mon_role() = 'cadre' and (
          un.responsable_id = auth.uid()
          or exists (select 1 from public.affectations_cadres a where a.unite_id = un.id and a.utilisateur_id = auth.uid())
        ))
      )
  )
$$;

-- L'administrateur lit (et corrige les fiches de) toutes les unités, sans valider.
create function app.lit_unite(p_unite uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.gere_unite(p_unite)
    or (app.mon_role() = 'admin' and exists (select 1 from public.unites un where un.id = p_unite and un.groupe_id = app.mon_groupe()))
$$;

create function app.parent_de(p_jeune uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.mon_role() = 'parent' and exists (
    select 1 from public.liens_parent l
    join public.jeunes j on j.id = l.jeune_id
    where l.utilisateur_id = auth.uid() and l.jeune_id = p_jeune
      and j.groupe_id = app.mon_groupe()
      and j.consentement_le is not null and j.statut = 'actif'
  )
$$;

create function app.lit_jeune(p_jeune uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.jeunes j where j.id = p_jeune and app.lit_unite(j.unite_id))
    or app.parent_de(p_jeune)
$$;

create function app.gere_jeune(p_jeune uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.jeunes j where j.id = p_jeune and app.gere_unite(j.unite_id)) $$;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;

-- ─── Déclencheurs ────────────────────────────────────────────────────────────

create function app.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger touch before update on public.groupes for each row execute function app.touch_updated_at();
create trigger touch before update on public.utilisateurs for each row execute function app.touch_updated_at();
create trigger touch before update on public.unites for each row execute function app.touch_updated_at();
create trigger touch before update on public.jeunes for each row execute function app.touch_updated_at();
create trigger touch before update on public.referentiels for each row execute function app.touch_updated_at();
create trigger touch before update on public.adaptations_unite for each row execute function app.touch_updated_at();
create trigger touch before update on public.validations for each row execute function app.touch_updated_at();

create function app.referentiel_publie_fige() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.publie_le is not null then
    raise exception 'Une version publiée ne se modifie pas : créez une nouvelle version.';
  end if;
  return new;
end
$$;
create trigger fige before update on public.referentiels for each row execute function app.referentiel_publie_fige();

-- Signataire et heures fixés par le serveur : un téléphone ne peut ni antidater une saisie ni la signer
-- au nom d'un autre. La date de réussite (validations.date, cours_honneur.date) reste celle saisie.
-- Les écritures sans compte connecté (clé secrète, maintenance) gardent leurs valeurs.

create function app.validation_signee() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (old.annulee_le is not null or new.annulee_le is null) then
    raise exception 'Une validation annulée le reste : validez de nouveau la preuve.';
  end if;
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.valide_par_nom := coalesce((app.mon_compte()).nom, new.valide_par_nom);
    new.created_at := now();
    new.annulee_le := null;
    new.annulee_par := null;
  else
    new.annulee_le := now();
    new.annulee_par := (app.mon_compte()).nom;
  end if;
  return new;
end
$$;
create trigger signature before insert or update on public.validations for each row execute function app.validation_signee();

create function app.cour_horodatee() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.created_at := now();
  end if;
  return new;
end
$$;
create trigger horodatage before insert on public.cours_honneur for each row execute function app.cour_horodatee();

create function app.journal_signe() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.utilisateur_id := auth.uid();
    new.utilisateur_nom := coalesce((app.mon_compte()).nom, '');
    new.at := now();
  end if;
  return new;
end
$$;
create trigger signature before insert on public.journal for each row execute function app.journal_signe();

create function app.referentiel_publication() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null and new.publie_le is not null then
    new.publie_le := now();
    new.publie_par := auth.uid();
  end if;
  return new;
end
$$;
create trigger publication before insert or update on public.referentiels for each row execute function app.referentiel_publication();

-- ─── Privilèges ──────────────────────────────────────────────────────────────
-- Le visiteur non connecté n'a aucun accès. L'historique (validations, cours d'honneur,
-- journal) ne se supprime ni ne se vide ; une validation ne se modifie que pour être annulée.

revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

revoke all on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke delete on public.validations, public.cours_honneur, public.journal from authenticated;
revoke update on public.validations, public.cours_honneur, public.journal, public.utilisateurs from authenticated;
grant update (annulee_le, annulee_par) on public.validations to authenticated;
grant update (nom, role, actif) on public.utilisateurs to authenticated;

-- ─── Règles d'accès ──────────────────────────────────────────────────────────

alter table public.groupes enable row level security;
alter table public.utilisateurs enable row level security;
alter table public.unites enable row level security;
alter table public.affectations_cadres enable row level security;
alter table public.jeunes enable row level security;
alter table public.historique_unite enable row level security;
alter table public.liens_parent enable row level security;
alter table public.referentiels enable row level security;
alter table public.adaptations_unite enable row level security;
alter table public.validations enable row level security;
alter table public.cours_honneur enable row level security;
alter table public.journal enable row level security;

-- Groupe : visible de ses membres ; nom et paroisse modifiés par l'admin, le CG ou le responsable progression.
create policy groupes_lecture on public.groupes for select to authenticated
  using (id = (select app.mon_groupe()));
create policy groupes_modif on public.groupes for update to authenticated
  using (id = (select app.mon_groupe()) and (select app.mon_role()) in ('admin', 'groupe', 'progression'))
  with check (id = (select app.mon_groupe()));

-- Comptes : chacun lit le sien ; l'encadrement du groupe lit tous ceux du groupe ; seul l'admin écrit,
-- jamais sur son propre compte (pas d'auto-promotion).
create policy utilisateurs_lecture on public.utilisateurs for select to authenticated
  using (id = (select auth.uid())
    or (groupe_id = (select app.mon_groupe()) and (select app.mon_role()) in ('admin', 'groupe', 'progression')));
create policy utilisateurs_creation on public.utilisateurs for insert to authenticated
  with check (groupe_id = (select app.mon_groupe()) and (select app.mon_role()) = 'admin');
create policy utilisateurs_modif on public.utilisateurs for update to authenticated
  using (groupe_id = (select app.mon_groupe()) and (select app.mon_role()) = 'admin' and id <> (select auth.uid()))
  with check (groupe_id = (select app.mon_groupe()));

-- Unités : visibles de tout le groupe ; créées et confiées par l'admin, le CG ou le responsable progression.
create policy unites_lecture on public.unites for select to authenticated
  using (groupe_id = (select app.mon_groupe()));
create policy unites_creation on public.unites for insert to authenticated
  with check (groupe_id = (select app.mon_groupe()) and (select app.mon_role()) in ('admin', 'groupe', 'progression')
    and (responsable_id is null or exists (select 1 from public.utilisateurs u where u.id = responsable_id and u.groupe_id = (select app.mon_groupe()))));
create policy unites_modif on public.unites for update to authenticated
  using (groupe_id = (select app.mon_groupe()) and (select app.mon_role()) in ('admin', 'groupe', 'progression'))
  with check (groupe_id = (select app.mon_groupe())
    and (responsable_id is null or exists (select 1 from public.utilisateurs u where u.id = responsable_id and u.groupe_id = (select app.mon_groupe()))));

-- Équipes d'unité.
create policy affectations_lecture on public.affectations_cadres for select to authenticated
  using (utilisateur_id = (select auth.uid())
    or ((select app.mon_role()) in ('admin', 'groupe', 'progression')
        and exists (select 1 from public.unites un where un.id = unite_id and un.groupe_id = (select app.mon_groupe()))));
create policy affectations_ajout on public.affectations_cadres for insert to authenticated
  with check ((select app.mon_role()) in ('admin', 'groupe', 'progression')
    and exists (select 1 from public.unites un where un.id = unite_id and un.groupe_id = (select app.mon_groupe()))
    and exists (select 1 from public.utilisateurs u where u.id = utilisateur_id and u.groupe_id = (select app.mon_groupe())));
create policy affectations_retrait on public.affectations_cadres for delete to authenticated
  using ((select app.mon_role()) in ('admin', 'groupe', 'progression')
    and exists (select 1 from public.unites un where un.id = unite_id and un.groupe_id = (select app.mon_groupe())));

-- Fiches des jeunes : l'unité les tient, l'admin les corrige, le parent voit ses enfants.
create policy jeunes_lecture on public.jeunes for select to authenticated
  using (app.lit_unite(unite_id) or app.parent_de(id));
create policy jeunes_creation on public.jeunes for insert to authenticated
  with check (groupe_id = (select app.mon_groupe()) and app.lit_unite(unite_id));
create policy jeunes_modif on public.jeunes for update to authenticated
  using (app.lit_unite(unite_id))
  with check (groupe_id = (select app.mon_groupe()) and app.lit_unite(unite_id));

create policy historique_lecture on public.historique_unite for select to authenticated
  using (app.lit_jeune(jeune_id));
create policy historique_ajout on public.historique_unite for insert to authenticated
  with check (app.lit_unite(unite_id) and app.lit_jeune(jeune_id));
create policy historique_modif on public.historique_unite for update to authenticated
  using (app.lit_jeune(jeune_id) and (select app.mon_role()) <> 'parent')
  with check (app.lit_unite(unite_id) and app.lit_jeune(jeune_id) and (select app.mon_role()) <> 'parent');

-- Liens parent : l'admin les tient, le CG les lit, le parent voit les siens.
create policy liens_lecture on public.liens_parent for select to authenticated
  using (utilisateur_id = (select auth.uid())
    or ((select app.mon_role()) in ('admin', 'groupe')
        and exists (select 1 from public.jeunes j where j.id = jeune_id and j.groupe_id = (select app.mon_groupe()))));
create policy liens_ajout on public.liens_parent for insert to authenticated
  with check ((select app.mon_role()) = 'admin'
    and exists (select 1 from public.jeunes j where j.id = jeune_id and j.groupe_id = (select app.mon_groupe()))
    and exists (select 1 from public.utilisateurs u where u.id = utilisateur_id and u.groupe_id = (select app.mon_groupe()) and u.role = 'parent'));
create policy liens_retrait on public.liens_parent for delete to authenticated
  using ((select app.mon_role()) = 'admin'
    and exists (select 1 from public.jeunes j where j.id = jeune_id and j.groupe_id = (select app.mon_groupe())));

-- Référentiels : l'encadrement lit les versions publiées ; l'admin et le responsable progression
-- tiennent le brouillon et publient.
create policy referentiels_lecture on public.referentiels for select to authenticated
  using (groupe_id = (select app.mon_groupe())
    and (select app.mon_role()) in ('admin', 'groupe', 'progression', 'cadre')
    and (publie_le is not null or (select app.mon_role()) in ('admin', 'progression')));
create policy referentiels_creation on public.referentiels for insert to authenticated
  with check (groupe_id = (select app.mon_groupe()) and (select app.mon_role()) in ('admin', 'progression'));
create policy referentiels_modif on public.referentiels for update to authenticated
  using (groupe_id = (select app.mon_groupe()) and (select app.mon_role()) in ('admin', 'progression'))
  with check (groupe_id = (select app.mon_groupe()));
create policy referentiels_abandon on public.referentiels for delete to authenticated
  using (groupe_id = (select app.mon_groupe()) and (select app.mon_role()) in ('admin', 'progression') and publie_le is null);

-- Adaptations des épreuves par unité.
create policy adaptations_lecture on public.adaptations_unite for select to authenticated
  using (app.lit_unite(unite_id));
create policy adaptations_creation on public.adaptations_unite for insert to authenticated
  with check (app.gere_unite(unite_id));
create policy adaptations_modif on public.adaptations_unite for update to authenticated
  using (app.gere_unite(unite_id))
  with check (app.gere_unite(unite_id));

-- Validations : lues comme la fiche ; saisies et annulées par l'unité, au nom de celui qui signe.
create policy validations_lecture on public.validations for select to authenticated
  using (app.lit_jeune(jeune_id));
create policy validations_saisie on public.validations for insert to authenticated
  with check (valide_par = (select auth.uid()) and app.gere_jeune(jeune_id));
create policy validations_annulation on public.validations for update to authenticated
  using (app.gere_jeune(jeune_id))
  with check (app.gere_jeune(jeune_id));

-- Cours d'honneur : décision saisie par l'unité, jamais modifiée.
create policy cours_lecture on public.cours_honneur for select to authenticated
  using (app.lit_jeune(jeune_id));
create policy cours_saisie on public.cours_honneur for insert to authenticated
  with check (saisi_par = (select auth.uid()) and app.gere_jeune(jeune_id));

-- Journal : en ajout seul, signé et horodaté par le serveur ; lu par l'admin et le chef de groupe.
create policy journal_lecture on public.journal for select to authenticated
  using (groupe_id = (select app.mon_groupe()) and (select app.mon_role()) in ('admin', 'groupe'));
create policy journal_ajout on public.journal for insert to authenticated
  with check (groupe_id = (select app.mon_groupe()) and utilisateur_id = (select auth.uid())
    and (select app.mon_role()) in ('admin', 'groupe', 'progression', 'cadre'));

-- Un compte peut cumuler les rôles d'encadrement : admin, chef de groupe, responsable progression, cadre
-- (par exemple admin et responsable progression). Le compte parent reste à part : l'accès famille
-- ne se mêle jamais aux droits d'encadrement.
-- Les droits d'un compte sont la réunion de ceux de ses rôles.

-- ─── Colonne roles ───────────────────────────────────────────────────────────

create function app.roles_valides(p_roles text[]) returns boolean
language sql immutable set search_path = ''
as $$
  select p_roles is not null
    and cardinality(p_roles) >= 1
    and p_roles <@ array['admin', 'groupe', 'progression', 'cadre', 'parent']::text[]
    and cardinality(p_roles) = (select count(distinct r) from unnest(p_roles) r)
    and (not ('parent' = any(p_roles)) or cardinality(p_roles) = 1)
$$;

alter table public.utilisateurs add column roles text[];
update public.utilisateurs set roles = array[role];
alter table public.utilisateurs
  alter column roles set not null,
  add constraint utilisateurs_roles_valides check (app.roles_valides(roles));

-- ─── Qui est connecté ────────────────────────────────────────────────────────

create or replace function app.mon_compte() returns public.utilisateurs
language sql stable security definer set search_path = ''
as $$
  select u.* from public.utilisateurs u
  where u.id = auth.uid()
    and u.actif
    and (not (u.roles && array['admin', 'groupe', 'progression']::text[]) or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
$$;

-- Vrai si le compte connecté a au moins un des rôles donnés.
create function app.a_role(variadic p_roles text[]) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((app.mon_compte()).roles && p_roles, false) $$;

create or replace function app.gere_unite(p_unite uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.unites un
    where un.id = p_unite
      and un.groupe_id = app.mon_groupe()
      and (
        app.a_role('groupe', 'progression')
        or (app.a_role('cadre') and (
          un.responsable_id = auth.uid()
          or exists (select 1 from public.affectations_cadres a where a.unite_id = un.id and a.utilisateur_id = auth.uid())
        ))
      )
  )
$$;

create or replace function app.lit_unite(p_unite uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.gere_unite(p_unite)
    or (app.a_role('admin') and exists (select 1 from public.unites un where un.id = p_unite and un.groupe_id = app.mon_groupe()))
$$;

create or replace function app.parent_de(p_jeune uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.a_role('parent') and exists (
    select 1 from public.liens_parent l
    join public.jeunes j on j.id = l.jeune_id
    where l.utilisateur_id = auth.uid() and l.jeune_id = p_jeune
      and j.groupe_id = app.mon_groupe()
      and j.consentement_le is not null and j.statut = 'actif'
  )
$$;

-- ─── Règles d'accès réécrites avec app.a_role ────────────────────────────────

drop policy groupes_modif on public.groupes;
create policy groupes_modif on public.groupes for update to authenticated
  using (id = (select app.mon_groupe()) and (select app.a_role('admin', 'groupe', 'progression')))
  with check (id = (select app.mon_groupe()));

drop policy utilisateurs_lecture on public.utilisateurs;
create policy utilisateurs_lecture on public.utilisateurs for select to authenticated
  using (id = (select auth.uid())
    or (groupe_id = (select app.mon_groupe()) and (select app.a_role('admin', 'groupe', 'progression'))));
drop policy utilisateurs_creation on public.utilisateurs;
create policy utilisateurs_creation on public.utilisateurs for insert to authenticated
  with check (groupe_id = (select app.mon_groupe()) and (select app.a_role('admin')));
drop policy utilisateurs_modif on public.utilisateurs;
create policy utilisateurs_modif on public.utilisateurs for update to authenticated
  using (groupe_id = (select app.mon_groupe()) and (select app.a_role('admin')) and id <> (select auth.uid()))
  with check (groupe_id = (select app.mon_groupe()));

drop policy unites_creation on public.unites;
create policy unites_creation on public.unites for insert to authenticated
  with check (groupe_id = (select app.mon_groupe()) and (select app.a_role('admin', 'groupe', 'progression'))
    and (responsable_id is null or exists (select 1 from public.utilisateurs u where u.id = responsable_id and u.groupe_id = (select app.mon_groupe()))));
drop policy unites_modif on public.unites;
create policy unites_modif on public.unites for update to authenticated
  using (groupe_id = (select app.mon_groupe()) and (select app.a_role('admin', 'groupe', 'progression')))
  with check (groupe_id = (select app.mon_groupe())
    and (responsable_id is null or exists (select 1 from public.utilisateurs u where u.id = responsable_id and u.groupe_id = (select app.mon_groupe()))));

drop policy affectations_lecture on public.affectations_cadres;
create policy affectations_lecture on public.affectations_cadres for select to authenticated
  using (utilisateur_id = (select auth.uid())
    or ((select app.a_role('admin', 'groupe', 'progression'))
        and exists (select 1 from public.unites un where un.id = unite_id and un.groupe_id = (select app.mon_groupe()))));
drop policy affectations_ajout on public.affectations_cadres;
create policy affectations_ajout on public.affectations_cadres for insert to authenticated
  with check ((select app.a_role('admin', 'groupe', 'progression'))
    and exists (select 1 from public.unites un where un.id = unite_id and un.groupe_id = (select app.mon_groupe()))
    and exists (select 1 from public.utilisateurs u where u.id = utilisateur_id and u.groupe_id = (select app.mon_groupe())));
drop policy affectations_retrait on public.affectations_cadres;
create policy affectations_retrait on public.affectations_cadres for delete to authenticated
  using ((select app.a_role('admin', 'groupe', 'progression'))
    and exists (select 1 from public.unites un where un.id = unite_id and un.groupe_id = (select app.mon_groupe())));

drop policy historique_modif on public.historique_unite;
create policy historique_modif on public.historique_unite for update to authenticated
  using (app.lit_jeune(jeune_id) and not (select app.a_role('parent')))
  with check (app.lit_unite(unite_id) and app.lit_jeune(jeune_id) and not (select app.a_role('parent')));

drop policy liens_lecture on public.liens_parent;
create policy liens_lecture on public.liens_parent for select to authenticated
  using (utilisateur_id = (select auth.uid())
    or ((select app.a_role('admin', 'groupe'))
        and exists (select 1 from public.jeunes j where j.id = jeune_id and j.groupe_id = (select app.mon_groupe()))));
drop policy liens_ajout on public.liens_parent;
create policy liens_ajout on public.liens_parent for insert to authenticated
  with check ((select app.a_role('admin'))
    and exists (select 1 from public.jeunes j where j.id = jeune_id and j.groupe_id = (select app.mon_groupe()))
    and exists (select 1 from public.utilisateurs u where u.id = utilisateur_id and u.groupe_id = (select app.mon_groupe()) and u.roles = array['parent']::text[]));
drop policy liens_retrait on public.liens_parent;
create policy liens_retrait on public.liens_parent for delete to authenticated
  using ((select app.a_role('admin'))
    and exists (select 1 from public.jeunes j where j.id = jeune_id and j.groupe_id = (select app.mon_groupe())));

drop policy referentiels_lecture on public.referentiels;
create policy referentiels_lecture on public.referentiels for select to authenticated
  using (groupe_id = (select app.mon_groupe())
    and (select app.a_role('admin', 'groupe', 'progression', 'cadre'))
    and (publie_le is not null or (select app.a_role('admin', 'progression'))));
drop policy referentiels_creation on public.referentiels;
create policy referentiels_creation on public.referentiels for insert to authenticated
  with check (groupe_id = (select app.mon_groupe()) and (select app.a_role('admin', 'progression')));
drop policy referentiels_modif on public.referentiels;
create policy referentiels_modif on public.referentiels for update to authenticated
  using (groupe_id = (select app.mon_groupe()) and (select app.a_role('admin', 'progression')))
  with check (groupe_id = (select app.mon_groupe()));
drop policy referentiels_abandon on public.referentiels;
create policy referentiels_abandon on public.referentiels for delete to authenticated
  using (groupe_id = (select app.mon_groupe()) and (select app.a_role('admin', 'progression')) and publie_le is null);

drop policy journal_lecture on public.journal;
create policy journal_lecture on public.journal for select to authenticated
  using (groupe_id = (select app.mon_groupe()) and (select app.a_role('admin', 'groupe')));
drop policy journal_ajout on public.journal;
create policy journal_ajout on public.journal for insert to authenticated
  with check (groupe_id = (select app.mon_groupe()) and utilisateur_id = (select auth.uid())
    and (select app.a_role('admin', 'groupe', 'progression', 'cadre')));

-- ─── Fin du rôle unique ──────────────────────────────────────────────────────

drop function app.mon_role();
alter table public.utilisateurs drop column role;
grant update (roles) on public.utilisateurs to authenticated;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;
-- La contrainte utilisateurs_roles_valides s'évalue avec les droits de qui écrit : la clé secrète
-- (fonction « comptes », script du premier admin) doit pouvoir l'appeler.
grant usage on schema app to service_role;
grant execute on function app.roles_valides(text[]) to service_role;

-- Règles d'accès (RLS) : les trois tests obligatoires de la conception, plus les règles
-- qui protègent l'historique (validations, cours d'honneur, journal) et la séparation des groupes.
-- Lancer : supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(52);

-- ─── Données de test (en superutilisateur) ───────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@a.test'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cg@a.test'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prog@a.test'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cadre.troupe@a.test'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cadre.meute@a.test'),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parent@a.test'),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inactif@a.test'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sansrole@a.test'),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cg@b.test'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.prog@a.test');

insert into public.groupes (id, nom, paroisse) values
  ('a0000000-0000-0000-0000-000000000001', 'Troisième Dakar', 'Saint-Pierre'),
  ('a0000000-0000-0000-0000-000000000002', 'Thiès', 'Sainte-Anne');

insert into public.utilisateurs (id, groupe_id, nom, identifiant, roles, actif) values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Admin A', 'admin.a', array['admin'], true),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'CG A', 'cg.a', array['groupe'], true),
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Prog A', 'prog.a', array['progression'], true),
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Cadre troupe', 'cadre.troupe', array['cadre'], true),
  ('10000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Cadre meute', 'cadre.meute', array['cadre'], true),
  ('10000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Famille Ndiaye', 'famille.ndiaye', array['parent'], true),
  ('10000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Cadre parti', 'cadre.parti', array['cadre'], false),
  ('10000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'CG B', 'cg.b', array['groupe'], true),
  ('10000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Admin et progression', 'admin.prog', array['admin', 'progression'], true);

insert into public.unites (id, groupe_id, branche, nom, annee, responsable_id) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'troupe', 'Troupe Troisième Dakar', '2026-2027', '10000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'meute', 'Meute Troisième Dakar', '2026-2027', '10000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'troupe', 'Troupe Thiès', '2026-2027', null);

insert into public.affectations_cadres (utilisateur_id, unite_id) values
  ('10000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001');

insert into public.jeunes (id, groupe_id, unite_id, prenom, nom, date_entree, etape_id, consentement_le) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Awa', 'Ndiaye', '2025-10-01', 't.vol', '2025-09-20'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Moussa', 'Diop', '2025-10-01', 't.vol', '2025-09-20'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Ibou', 'Ndiaye', '2026-10-01', 't.vol', null),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Seynabou', 'Ba', '2025-10-01', 'm.patte', '2025-09-20'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'Jeune', 'Thiès', '2025-10-01', 't.vol', '2025-09-20');

-- Awa (consentement reçu) et Ibou (sans consentement) sont les enfants de la famille Ndiaye.
insert into public.liens_parent (utilisateur_id, jeune_id) values
  ('10000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003');

insert into public.historique_unite (jeune_id, unite_id, debut) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2025-10-01');

insert into public.validations (id, jeune_id, etape_id, domaine_id, preuve_id, date, valide_par, valide_par_nom, ref_version) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 't.vol', 't.vol.esprit', 't.vol.esprit.1', '2026-10-10', '10000000-0000-0000-0000-000000000004', 'Cadre troupe', 2),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 't.vol', 't.vol.esprit', 't.vol.esprit.1', '2026-10-10', '10000000-0000-0000-0000-000000000004', 'Cadre troupe', 2),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'm.patte', 'm.patte.1', 'm.patte.1.1', '2026-10-10', '10000000-0000-0000-0000-000000000005', 'Cadre meute', 1),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 't.vol', 't.vol.esprit', 't.vol.esprit.1', '2026-10-10', '10000000-0000-0000-0000-000000000009', 'CG B', 1);

insert into public.journal (id, groupe_id, utilisateur_id, utilisateur_nom, action, table_name, ligne, resume) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Cadre troupe', 'validation', 'validations', 'd0000000-0000-0000-0000-000000000001', 'Awa : esprit scout');

insert into public.referentiels (groupe_id, branche, version, etapes, publie_le) values
  ('a0000000-0000-0000-0000-000000000001', 'troupe', 3, '[]', now()),
  ('a0000000-0000-0000-0000-000000000001', 'troupe', 4, '[]', null);

-- ─── 1. Un cadre de la troupe ne lit rien de la meute ────────────────────────

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);

select results_eq($$ select prenom from public.jeunes order by prenom $$, array['Awa', 'Ibou', 'Moussa'], 'cadre troupe : voit les jeunes de sa troupe, consentement en attente compris');
select is_empty($$ select 1 from public.jeunes where unite_id = 'b0000000-0000-0000-0000-000000000002' $$, 'cadre troupe : aucun jeune de la meute');
select is_empty($$ select 1 from public.validations where jeune_id = 'c0000000-0000-0000-0000-000000000004' $$, 'cadre troupe : aucune validation de la meute');
select is((select count(*) from public.validations), 2::bigint, 'cadre troupe : seulement les validations de sa troupe');
select throws_ok(
  $$ insert into public.jeunes (groupe_id, unite_id, prenom, nom, date_entree, etape_id) values ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Intrus', 'Meute', '2026-11-01', 'm.patte') $$,
  '42501', null, 'cadre troupe : ne peut pas ajouter un jeune à la meute');
select throws_ok(
  $$ insert into public.validations (jeune_id, etape_id, domaine_id, preuve_id, date, valide_par, valide_par_nom) values ('c0000000-0000-0000-0000-000000000004', 'm.patte', 'm.patte.1', 'm.patte.1.2', '2026-11-01', '10000000-0000-0000-0000-000000000004', 'Cadre troupe') $$,
  '42501', null, 'cadre troupe : ne peut pas valider pour un jeune de la meute');
select lives_ok(
  $$ insert into public.validations (jeune_id, etape_id, domaine_id, preuve_id, date, valide_par, valide_par_nom) values ('c0000000-0000-0000-0000-000000000001', 't.vol', 't.vol.sport', 't.vol.sport.1', '2026-11-01', '10000000-0000-0000-0000-000000000004', 'Cadre troupe') $$,
  'cadre troupe : valide une preuve pour un jeune de sa troupe');
select throws_ok(
  $$ insert into public.validations (jeune_id, etape_id, domaine_id, preuve_id, date, valide_par, valide_par_nom) values ('c0000000-0000-0000-0000-000000000001', 't.vol', 't.vol.sport', 't.vol.sport.2', '2026-11-01', '10000000-0000-0000-0000-000000000005', 'Cadre meute') $$,
  '42501', null, 'cadre troupe : ne peut pas signer une validation au nom d''un autre');
select throws_ok(
  $$ update public.jeunes set unite_id = 'b0000000-0000-0000-0000-000000000002' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'cadre troupe : ne peut pas faire passer un jeune dans une unité qu''il ne gère pas');
select is_empty($$ select 1 from public.journal $$, 'cadre : ne lit pas le journal');
select is_empty($$ select 1 from public.referentiels where publie_le is null $$, 'cadre : ne voit pas les brouillons de référentiel');
select is((select count(*) from public.utilisateurs), 1::bigint, 'cadre : ne lit que son propre compte');
select throws_ok(
  $$ insert into public.utilisateurs (id, groupe_id, nom, identifiant, roles) values ('10000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Moi', 'moi', array['admin']) $$,
  '42501', null, 'cadre : ne peut pas créer de compte');
update public.utilisateurs set roles = array['admin', 'cadre'] where id = '10000000-0000-0000-0000-000000000004';
reset role;
select is((select roles from public.utilisateurs where id = '10000000-0000-0000-0000-000000000004'), array['cadre'], 'cadre : ne peut pas se donner un rôle');

-- ─── 2. Un parent ne voit aucun autre enfant que les siens ───────────────────

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000006","role":"authenticated","aal":"aal1"}', true);

select results_eq($$ select prenom from public.jeunes $$, array['Awa'], 'parent : voit son enfant, et seulement s''il y a consentement');
select results_eq($$ select distinct jeune_id::text from public.validations $$, array['c0000000-0000-0000-0000-000000000001'], 'parent : ne voit que les validations de son enfant');
select throws_ok(
  $$ insert into public.validations (jeune_id, etape_id, domaine_id, preuve_id, date, valide_par, valide_par_nom) values ('c0000000-0000-0000-0000-000000000001', 't.vol', 't.vol.nature', 't.vol.nature.1', '2026-11-01', '10000000-0000-0000-0000-000000000006', 'Famille Ndiaye') $$,
  '42501', null, 'parent : ne peut pas valider');
select is_empty($$ select 1 from public.referentiels $$, 'parent : ne lit pas les référentiels');
reset role;

-- ─── 3. Un compte sans rôle, ou désactivé, ne lit rien ───────────────────────

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000008","role":"authenticated","aal":"aal1"}', true);
select is_empty($$ select 1 from public.jeunes $$, 'sans rôle : aucun jeune');
select is_empty($$ select 1 from public.validations $$, 'sans rôle : aucune validation');
select is_empty($$ select 1 from public.unites $$, 'sans rôle : aucune unité');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000007","role":"authenticated","aal":"aal1"}', true);
select is_empty($$ select 1 from public.jeunes $$, 'compte désactivé : aucun jeune, même affecté à la troupe');
reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select 1 from public.jeunes $$, '42501', null, 'visiteur non connecté : aucun accès aux jeunes');
reset role;

-- ─── 4. Double authentification et séparation des groupes ────────────────────

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select is_empty($$ select 1 from public.jeunes $$, 'chef de groupe sans second facteur : ne lit rien');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.jeunes), 4::bigint, 'chef de groupe : voit tous les jeunes de son groupe');
select is_empty($$ select 1 from public.jeunes where groupe_id = 'a0000000-0000-0000-0000-000000000002' $$, 'chef de groupe : rien d''un autre groupe');
select is((select count(*) from public.journal), 1::bigint, 'chef de groupe : lit le journal de son groupe');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000009","role":"authenticated","aal":"aal2"}', true);
select results_eq($$ select prenom from public.jeunes $$, array['Jeune'], 'chef de groupe B : ne voit que son groupe');
select is_empty($$ select 1 from public.journal $$, 'chef de groupe B : rien du journal du groupe A');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
select throws_ok(
  $$ insert into public.validations (jeune_id, etape_id, domaine_id, preuve_id, date, valide_par, valide_par_nom) values ('c0000000-0000-0000-0000-000000000001', 't.vol', 't.vol.nature', 't.vol.nature.1', '2026-11-01', '10000000-0000-0000-0000-000000000001', 'Admin A') $$,
  '42501', null, 'administrateur : lit la progression mais ne valide pas');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.referentiels), 2::bigint, 'responsable progression : voit le brouillon de référentiel');
select throws_ok(
  $$ update public.referentiels set etapes = '[{"id":"x"}]' where version = 3 $$,
  'P0001', 'Une version publiée ne se modifie pas : créez une nouvelle version.', 'responsable progression : une version publiée ne change plus');

-- ─── 5. L'historique ne s'efface pas ─────────────────────────────────────────

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ delete from public.validations where id = 'd0000000-0000-0000-0000-000000000001' $$, '42501', null, 'une validation ne se supprime pas');
select throws_ok($$ update public.validations set preuve_id = 't.vol.autre' where id = 'd0000000-0000-0000-0000-000000000001' $$, '42501', null, 'une validation ne se modifie pas');
select lives_ok($$ update public.validations set annulee_le = now(), annulee_par = 'Cadre troupe' where id = 'd0000000-0000-0000-0000-000000000001' $$, 'une validation s''annule');
select throws_ok(
  $$ update public.validations set annulee_le = null where id = 'd0000000-0000-0000-0000-000000000001' $$,
  'P0001', 'Une validation annulée le reste : validez de nouveau la preuve.', 'une annulation ne se défait pas');
select throws_ok(
  $$ insert into public.validations (jeune_id, etape_id, domaine_id, preuve_id, date, valide_par, valide_par_nom) values ('c0000000-0000-0000-0000-000000000002', 't.vol', 't.vol.esprit', 't.vol.esprit.1', '2026-11-01', '10000000-0000-0000-0000-000000000004', 'Cadre troupe') $$,
  '23505', null, 'une preuve déjà validée ne se valide pas deux fois');
reset role;

-- ─── 6. Aucune trace falsifiée, aucun lien entre groupes ─────────────────────

select ok(not has_table_privilege('authenticated', 'public.journal', 'truncate')
  and not has_table_privilege('authenticated', 'public.validations', 'truncate')
  and not has_table_privilege('authenticated', 'public.cours_honneur', 'truncate'), 'personne ne vide l''historique (truncate)');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000006","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $$ insert into public.journal (groupe_id, utilisateur_nom, action, table_name, ligne, resume) values ('a0000000-0000-0000-0000-000000000001', 'Chef de groupe', 'validation', 'validations', 'x', 'fausse trace') $$,
  '42501', null, 'parent : n''écrit pas au journal');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
insert into public.journal (id, groupe_id, utilisateur_nom, action, table_name, ligne, resume, at) values
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Chef de groupe', 'modification', 'jeunes', 'x', 'antidatée', '2020-01-01');
insert into public.validations (id, jeune_id, etape_id, domaine_id, preuve_id, date, valide_par, valide_par_nom, created_at) values
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 't.vol', 't.vol.nature', 't.vol.nature.1', '2026-11-01', '10000000-0000-0000-0000-000000000004', 'Chef de groupe', '2020-01-01');
update public.validations set annulee_le = '2001-01-01', annulee_par = 'Quelqu''un d''autre' where id = 'd0000000-0000-0000-0000-000000000005';
select throws_ok(
  $$ update public.historique_unite set unite_id = 'b0000000-0000-0000-0000-000000000003' where jeune_id = 'c0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'cadre : ne déplace pas l''historique vers l''unité d''un autre groupe');
reset role;
select results_eq(
  $$ select utilisateur_nom, at = now() from public.journal where id = 'e0000000-0000-0000-0000-000000000002' $$,
  $$ values ('Cadre troupe'::text, true) $$, 'journal : nom et heure fixés par le serveur');
select results_eq(
  $$ select valide_par_nom, created_at = now(), annulee_par, annulee_le = now() from public.validations where id = 'd0000000-0000-0000-0000-000000000005' $$,
  $$ values ('Cadre troupe'::text, true, 'Cadre troupe'::text, true) $$, 'validation : signataire et heures fixés par le serveur');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
select throws_ok(
  $$ insert into public.liens_parent (utilisateur_id, jeune_id) values ('10000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'admin : aucun lien parent vers un compte d''un autre groupe');
update public.utilisateurs set roles = array['admin', 'groupe'] where id = '10000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}', true);
select throws_ok(
  $$ update public.unites set responsable_id = '10000000-0000-0000-0000-000000000009' where id = 'b0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'chef de groupe : aucun responsable venu d''un autre groupe');
reset role;
select is((select roles from public.utilisateurs where id = '10000000-0000-0000-0000-000000000001'), array['admin'], 'admin : ne change pas ses propres rôles');

-- ─── 7. Rôles cumulés : les droits de chaque rôle s'additionnent ──────────────

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000010","role":"authenticated","aal":"aal1"}', true);
select is_empty($$ select 1 from public.jeunes $$, 'admin et progression sans second facteur : ne lit rien');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000010","role":"authenticated","aal":"aal2"}', true);
select lives_ok(
  $$ insert into public.validations (jeune_id, etape_id, domaine_id, preuve_id, date, valide_par, valide_par_nom) values ('c0000000-0000-0000-0000-000000000004', 'm.patte', 'm.patte.1', 'm.patte.1.3', '2026-11-01', '10000000-0000-0000-0000-000000000010', 'Admin et progression') $$,
  'admin et progression : valide comme responsable progression');
select ok((select count(*) from public.journal) >= 1, 'admin et progression : lit le journal comme admin');
select lives_ok(
  $$ update public.utilisateurs set roles = array['cadre', 'groupe'] where id = '10000000-0000-0000-0000-000000000005' $$,
  'admin et progression : donne plusieurs rôles à un autre compte');
reset role;
select is((select roles from public.utilisateurs where id = '10000000-0000-0000-0000-000000000005'), array['cadre', 'groupe'], 'les rôles cumulés sont enregistrés');

select throws_ok(
  $$ update public.utilisateurs set roles = array['cadre', 'parent'] where id = '10000000-0000-0000-0000-000000000005' $$,
  '23514', null, 'un compte parent ne cumule aucun autre rôle');
select throws_ok(
  $$ update public.utilisateurs set roles = '{}' where id = '10000000-0000-0000-0000-000000000005' $$,
  '23514', null, 'un compte a au moins un rôle');

select * from finish();
rollback;

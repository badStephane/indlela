-- Photos de preuve : une photo du travail réussi, jointe à une validation.
-- Mêmes droits que la validation (l'unité ajoute, l'encadrement et les parents voient), trois au plus,
-- et rien ne se modifie ni ne s'efface. Le fichier lui-même vit dans le bucket privé « preuves ».
-- Lancer : supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- ─── Données de test ─────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cadre.troupe@p.test'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cadre.meute@p.test'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parent@p.test');

insert into public.groupes (id, nom, paroisse) values ('a1000000-0000-0000-0000-000000000001', 'Photos', 'Test');

insert into public.utilisateurs (id, groupe_id, nom, identifiant, roles) values
  ('20000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Cadre troupe', 'p.cadre.troupe', '{cadre}'),
  ('20000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Cadre meute', 'p.cadre.meute', '{cadre}'),
  ('20000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Famille Ndiaye', 'p.famille.ndiaye', '{parent}');

insert into public.unites (id, groupe_id, branche, nom, annee, responsable_id) values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'troupe', 'Troupe Photos', '2026-2027', '20000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'meute', 'Meute Photos', '2026-2027', '20000000-0000-0000-0000-000000000002');

insert into public.jeunes (id, groupe_id, unite_id, prenom, nom, date_entree, etape_id, consentement_le) values
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Awa', 'Ndiaye', '2025-10-01', 't.vol', '2025-09-20'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Moussa', 'Diop', '2025-10-01', 't.vol', '2025-09-20');

insert into public.liens_parent (utilisateur_id, jeune_id) values ('20000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001');

insert into public.validations (id, jeune_id, etape_id, domaine_id, preuve_id, date, valide_par, valide_par_nom, annulee_le) values
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 't.vol', 't.vol.nature', 't.vol.nature.1', '2026-11-20', '20000000-0000-0000-0000-000000000001', 'Cadre troupe', null),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 't.vol', 't.vol.sport', 't.vol.sport.1', '2026-11-20', '20000000-0000-0000-0000-000000000001', 'Cadre troupe', now()),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 't.vol', 't.vol.civisme', 't.vol.civisme.1', '2026-11-20', '20000000-0000-0000-0000-000000000001', 'Cadre troupe', null);

-- ─── Table photos_preuves ────────────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);

select lives_ok(
  $$ insert into public.photos_preuves (id, validation_id, jeune_id, taille) values ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 180000) $$,
  'cadre de la troupe : joint une photo à une validation de sa troupe');
select is((select chemin from public.photos_preuves where id = 'e1000000-0000-0000-0000-000000000001'),
  'c1000000-0000-0000-0000-000000000001/e1000000-0000-0000-0000-000000000001.jpg', 'le chemin du fichier est fixé par la base');
select lives_ok(
  $$ insert into public.photos_preuves (id, validation_id, jeune_id, taille) values
     ('e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 1000),
     ('e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 1000) $$,
  'trois photos par validation');
select throws_ok(
  $$ insert into public.photos_preuves (id, validation_id, jeune_id, taille) values ('e1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 1000) $$,
  'P0001', 'Trois photos au plus par preuve validée.', 'pas de quatrième photo');
select throws_ok(
  $$ insert into public.photos_preuves (id, validation_id, jeune_id, taille) values ('e1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 1000) $$,
  'P0001', 'La photo doit être jointe à une validation de ce jeune.', 'la photo et la validation désignent le même jeune');
select throws_ok(
  $$ insert into public.photos_preuves (id, validation_id, jeune_id, taille) values ('e1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 1000) $$,
  'P0001', 'Cette validation est annulée : aucune photo ne s''y ajoute.', 'aucune photo sur une validation annulée');
select throws_ok(
  $$ insert into public.photos_preuves (id, validation_id, jeune_id, taille) values ('e1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 5000000) $$,
  '23514', null, 'une photo dépasse 1 Mo : refusée');
select throws_ok($$ delete from public.photos_preuves where id = 'e1000000-0000-0000-0000-000000000001' $$, '42501', null, 'une photo ne se supprime pas');
select throws_ok($$ update public.photos_preuves set taille = 1 where id = 'e1000000-0000-0000-0000-000000000001' $$, '42501', null, 'une photo ne se modifie pas');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select is_empty($$ select 1 from public.photos_preuves $$, 'cadre de la meute : aucune photo de la troupe');
select throws_ok(
  $$ insert into public.photos_preuves (id, validation_id, jeune_id, taille) values ('e1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 1000) $$,
  '42501', null, 'cadre de la meute : ne joint pas de photo à la troupe');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
select is((select count(*) from public.photos_preuves), 3::bigint, 'parent : voit les photos de son enfant');
select throws_ok(
  $$ insert into public.photos_preuves (id, validation_id, jeune_id, taille) values ('e1000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 1000) $$,
  '42501', null, 'parent : n''ajoute pas de photo');
reset role;

-- ─── Fichiers du bucket « preuves » ──────────────────────────────────────────

select is((select public from storage.buckets where id = 'preuves'), false, 'le bucket des preuves est privé');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('preuves', 'c1000000-0000-0000-0000-000000000001/e1000000-0000-0000-0000-000000000001.jpg', '20000000-0000-0000-0000-000000000001') $$,
  'cadre de la troupe : dépose le fichier de la photo');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('preuves', 'c1000000-0000-0000-0000-000000000001/nimporte-quoi.png', '20000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'un fichier mal nommé est refusé');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('preuves', 'c1000000-0000-0000-0000-000000000001/f1000000-0000-0000-0000-000000000001.jpg', '20000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'aucun fichier sans sa photo enregistrée (trois au plus, validation active)');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select is_empty($$ select 1 from storage.objects where bucket_id = 'preuves' $$, 'cadre de la meute : ne lit aucun fichier de la troupe');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('preuves', 'c1000000-0000-0000-0000-000000000001/e1000000-0000-0000-0000-000000000002.jpg', '20000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'cadre de la meute : ne dépose rien pour la troupe');

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
select is((select count(*) from storage.objects where bucket_id = 'preuves'), 1::bigint, 'parent : lit le fichier de son enfant');
reset role;

-- Un fichier déposé sans sa ligne (par la clé de service, ou avant la correction) n'est lisible de personne.
insert into storage.objects (bucket_id, name) values ('preuves', 'c1000000-0000-0000-0000-000000000001/f1000000-0000-0000-0000-000000000002.jpg');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
select is((select count(*) from storage.objects where bucket_id = 'preuves'), 1::bigint, 'parent : un fichier orphelin reste invisible');
reset role;
select ok(not has_function_privilege('anon', 'app.uuid_ou_null(text)', 'execute'), 'les fonctions d''accès ne sont pas ouvertes aux visiteurs');

select * from finish();
rollback;

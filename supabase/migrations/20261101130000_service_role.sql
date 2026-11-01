-- La clé secrète (service_role) sert uniquement côté serveur : fonction « comptes », script du premier admin.
-- Les projets Supabase récents ne lui donnent plus de droits par défaut sur les tables.
-- Elle contourne la RLS par conception ; les déclencheurs (annulation définitive, version publiée figée) s'appliquent toujours.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;

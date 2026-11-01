# Indlela · Carnet de progression numérique

Application web, pensée d'abord pour le téléphone, où les cadres des Scouts du Sénégal valident la progression des jeunes, et où les familles la suivent en lecture seule. Les règles de progression sont des données : l'admin les modifie sans développeur.

## Contenu du dépôt

| Dossier | Contenu |
| --- | --- |
| [`web/`](web/) | L'application (Next.js 15, Tailwind 4, PWA). Voir [`web/README.md`](web/README.md) pour la lancer et la liste des écrans. |
| [`supabase/`](supabase/) | Schéma de la base (tables, règles d'accès RLS) et tests des droits. |
| [`docs/`](docs/) | Audit du prototype et suivi des corrections. |
| [`project/`](project/) | Maquettes Claude Design, document de conception et fichiers d'origine (logos). |
| [`chats/`](chats/) | Échanges de conception avec Claude Design. |

## Démarrer

```bash
cd web
nvm use          # Node 22
npm install
npm run dev      # http://localhost:3000
npm test         # tests de la logique de progression
```

Le prototype tourne en **mode démo** (données fictives, entrées « Démo · entrer comme »). `NEXT_PUBLIC_DEMO=0` donne le comportement prévu en production : téléphone vide au départ, et tout est effacé du téléphone à la déconnexion. Le schéma Supabase est prêt ; la connexion des comptes et la synchronisation de l'application restent à brancher.

## Base de données (Supabase)

Le schéma vit dans [`supabase/migrations/`](supabase/migrations/) : 12 tables, la RLS sur chacune, et des fonctions qui disent qui est connecté. Un compte admin, chef de groupe ou responsable progression n'a aucun droit sans second facteur (TOTP). Les validations, cours d'honneur et journal ne se suppriment pas ; une validation ne se modifie que pour être annulée.

```bash
supabase db start            # Postgres local (Docker), ports 573xx
supabase test db             # 45 tests des droits, dont les trois obligatoires de la conception
```

Envoyer le schéma au projet hébergé :

```bash
supabase login               # avec le compte qui possède le projet
supabase link --project-ref <ref>
supabase db push
```

Puis copier [`web/.env.example`](web/.env.example) en `web/.env.local` avec l'URL du projet et la clé publique (`sb_publishable_…`). La clé secrète ne va jamais dans l'application.

À régler dans le tableau de bord du projet hébergé (le fichier `supabase/config.toml` ne vaut que pour la base locale) : inscriptions fermées (les comptes sont créés par l'admin), mots de passe de 10 caractères avec lettres et chiffres, MFA TOTP activé.

## Intégration continue

Chaque pull request passe le typecheck, les tests, le build, l'audit des dépendances, et les tests des droits sur une base Supabase locale ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

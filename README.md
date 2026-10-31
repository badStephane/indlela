# Indlela · Carnet de progression numérique

Application web, pensée d'abord pour le téléphone, où les cadres des Scouts du Sénégal valident la progression des jeunes, et où les familles la suivent en lecture seule. Les règles de progression sont des données : l'admin les modifie sans développeur.

## Contenu du dépôt

| Dossier | Contenu |
| --- | --- |
| [`web/`](web/) | L'application (Next.js 15, Tailwind 4, PWA). Voir [`web/README.md`](web/README.md) pour la lancer et la liste des écrans. |
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

Le prototype tourne en **mode démo** (données fictives, entrées « Démo · entrer comme »). `NEXT_PUBLIC_DEMO=0` donne le comportement prévu en production : téléphone vide au départ, et tout est effacé du téléphone à la déconnexion. Le branchement à Supabase (comptes, droits RLS, synchronisation) reste à faire.

## Intégration continue

Chaque pull request passe le typecheck, les tests, le build et l'audit des dépendances ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

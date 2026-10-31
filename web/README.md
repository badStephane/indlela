# Indlela · Carnet de progression (front)

Implémentation de la maquette `project/Carnet Prototype.dc.html`, direction **2a Sentier**.
Stack de la conception : Next.js 15 (App Router), Tailwind 4, PWA. Les données sont
simulées (`lib/mock.ts`) et gardées sur le téléphone dans IndexedDB ; Supabase se branchera
à la place de `lib/store.tsx` (validations, synchronisation) et de `lib/mock.ts`.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # logique de progression et lecture des listes (Vitest)
npm run build && npm start
```

## Hors connexion

Le service worker (`public/sw.js`, généré à chaque `npm run build` depuis `scripts/sw.template.js`) met en cache toutes les pages à l'installation. Les écrans d'un jeune sont des pages fixes (`/jeune?id=…`) : ils s'ouvrent sans réseau pour n'importe quel jeune, même ajouté sur le téléphone. Chaque build porte son numéro de version : la nouvelle version s'installe et remplace l'ancien cache.

## Écrans

| Route | Écran | Rôle |
| --- | --- | --- |
| `/connexion` | 1 · Connexion (+ entrées de démo par rôle) | tous |
| `/unite` | 2 · Accueil de l'unité | cadre, chef de groupe |
| `/unite/ajouter` | Ajouter des jeunes (un par un ou liste collée), avec leur étape | cadre, chef de groupe |
| `/unite/epreuves` | Épreuves de l'unité : retirer une épreuve au choix, ajouter les siennes | cadre |
| `/jeune?id=…` | 3 · Fiche du jeune (lecture seule pour les parents) | cadre, chef de groupe, parent |
| `/jeune/valider?id=…` | 4 · Validation | cadre, chef de groupe |
| `/jeune/cour?id=…` | Cour d'honneur : décision, observations, nom du CT ; vote aux 3/4 pour Animateur | cadre, chef de groupe |
| `/unite/tableau-de-bord` | 5 · Tableau de bord | cadre |
| `/groupe` | 6 · Vue groupe | chef de groupe |
| `/jeune/carnet?id=…` | 7 · Carnet PDF | cadre, chef de groupe, parent |
| `/famille` | 8 · Espace famille | parent |
| `/admin/referentiels` | 9 · Référentiels | admin |

## États de démo

- **Hors connexion** : touchez la pastille « En ligne ». Les validations attendent sur le
  téléphone (point orange). Retouchez-la pour synchroniser. La coupure réelle du réseau est
  aussi détectée, et la file part seule au retour du réseau.
- **Échec de synchronisation** : interrupteur « 1re synchro en échec » sur l'écran de connexion
  (actif par défaut).
- **Unité vide** : interrupteur « Unité vide » sur l'écran de connexion. Il retire les jeunes de la troupe
  pour tester la mise en place de l'unité ; le désactiver remet les jeunes de démo.
- **Annulation** : dans une fiche, touchez un critère validé. La validation reste dans le
  journal (`annuleeLe`), elle n'est jamais effacée.

## Écarts assumés avec la maquette

- La barre d'état du téléphone (9:41, 4G) n'est pas reproduite : l'application occupe l'écran.
- « Télécharger le PDF » ouvre l'impression du navigateur (Enregistrer en PDF) en attendant
  la génération côté serveur.
- « Exporter les listes du groupe » télécharge un vrai CSV de la troupe.

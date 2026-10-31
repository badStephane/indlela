# Indlela · Carnet de progression (front)

Implémentation de la maquette `project/Carnet Prototype.dc.html`, direction **2a Sentier**.
Stack de la conception : Next.js 15 (App Router), Tailwind 4, PWA. Les données sont
simulées (`lib/mock.ts`) et gardées sur le téléphone dans IndexedDB ; Supabase se branchera
à la place de `lib/store.tsx` (validations, synchronisation) et de `lib/mock.ts`.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Écrans

| Route | Écran | Rôle |
| --- | --- | --- |
| `/connexion` | 1 · Connexion (+ entrées de démo par rôle) | tous |
| `/unite` | 2 · Accueil de l'unité | cadre, chef de groupe |
| `/jeunes/[id]` | 3 · Fiche du jeune (lecture seule pour les parents) | cadre, chef de groupe, parent |
| `/jeunes/[id]/valider` | 4 · Validation | cadre, chef de groupe |
| `/unite/tableau-de-bord` | 5 · Tableau de bord | cadre |
| `/groupe` | 6 · Vue groupe | chef de groupe |
| `/jeunes/[id]/carnet` | 7 · Carnet PDF | cadre, chef de groupe, parent |
| `/famille` | 8 · Espace famille | parent |
| `/admin/referentiels` | 9 · Référentiels | admin |
| `/admin/comptes` | 10 · Comptes et unités (consentements, liens parent, affectations) | admin |
| `/admin/journal` | 11 · Journal, en ajout seul, avec avant / après | admin |
| `/admin/donnees` | 12 · Import CSV des jeunes, exports, sauvegardes | admin, chef de groupe |

## États de démo

- **Hors connexion** : touchez la pastille « En ligne ». Les validations attendent sur le
  téléphone (point orange). Retouchez-la pour synchroniser. La coupure réelle du réseau est
  aussi détectée, et la file part seule au retour du réseau.
- **Échec de synchronisation** : interrupteur « 1re synchro en échec » sur l'écran de connexion
  (actif par défaut).
- **Unité vide** : interrupteur « Unité vide » sur l'écran de connexion.
- **Annulation** : dans une fiche, touchez un critère validé. La validation reste dans le
  journal (`annuleeLe`), elle n'est jamais effacée. Le « Annuler » du toast efface seulement
  une saisie restée sur le téléphone ; une saisie déjà reçue est annulée et journalisée.
- **Import** : Données → « Essayer un exemple » charge un CSV avec des lignes en erreur.
  Les fiches importées restent inactives jusqu'au consentement (Comptes → « Consentement reçu »),
  puis apparaissent dans l'unité.
- **Journal** : chaque écriture (validation, annulation, publication, compte, consentement,
  import, export, sauvegarde) y entre. Une validation hors connexion y entre à la synchronisation.

## Écarts assumés avec la maquette

- La barre d'état du téléphone (9:41, 4G) n'est pas reproduite : l'application occupe l'écran.
- « Télécharger le PDF » ouvre l'impression du navigateur (Enregistrer en PDF) en attendant
  la génération côté serveur.
- « Exporter les listes du groupe » télécharge un vrai CSV de la troupe.

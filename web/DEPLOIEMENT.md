# Mise en ligne (Cloudflare)

Le site est un **export statique** de Next.js (`output: "export"`) : toute l'application tourne dans le
navigateur et parle directement à Supabase. Cloudflare Workers sert les fichiers du dossier `out/`,
sans aucun code serveur.

## Déployer depuis un poste

1. `web/.env.local` contient l'URL du projet Supabase et la clé **publishable** (jamais la clé secrète) :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
   ```
   `NEXT_PUBLIC_DEMO=0` vient de `.env.production` : le site en ligne n'a pas de données de démo.
2. Une fois par poste : `npx wrangler login` (dans un vrai terminal, il ouvre le navigateur).
3. `npm run deploy` : construit le site puis l'envoie. L'adresse s'affiche à la fin.

Ne pas lancer le build dans `web/` pendant que `npm run dev` tourne : les deux écrivent dans `.next/`.

## Fichiers utiles

- `wrangler.jsonc` : nom du Worker (`indlela`) et service des fichiers de `out/` (`/jeune` sert `jeune.html`,
  une adresse inconnue sert la page 404 de l'application).
- `public/_redirects` : anciennes adresses `/jeunes/:id…` vers `/jeune?id=…`.
- `public/_headers` : en-têtes de sécurité, cache long des fichiers versionnés, `sw.js` toujours relu.

## Après un déploiement

Le service worker installe la nouvelle version au prochain chargement de l'application ; un téléphone
hors connexion garde l'ancienne jusqu'à son retour en ligne.

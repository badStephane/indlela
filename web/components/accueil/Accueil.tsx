import Link from "next/link";
import type { ReactNode } from "react";

// Page publique d'Indlela : ce qu'est le carnet, qui y fait quoi, puis la connexion.
// Le seul geste visuel est le sentier du haut, celui de l'application.

const ETAPES_TROUPE = ["Volontaire", "Engagé", "Technicien", "Animateur"];
/** Où s'arrête le soleil : un jeune engagé, à mi-chemin du Technicien. */
const AVANCEMENT = 0.5;

const PROGRESSION: { titre: string; texte: string }[] = [
  {
    titre: "Une étape à la fois",
    texte: "Volontaire, Engagé, Technicien, Animateur pour la troupe ; Patte tendre, étoiles et brevets pour la meute. Chaque étape a ses domaines et ses preuves, tirés du carnet officiel.",
  },
  {
    titre: "Des preuves validées en réunion",
    texte: "Le cadre coche les preuves réussies sur son téléphone, avec la date et la façon dont le jeune les a réussies.",
  },
  {
    titre: "La cour d'honneur reconnaît l'étape",
    texte: "La décision est enregistrée, avec le vote secret quand le carnet le demande. Le jeune passe à l'étape suivante.",
  },
  {
    titre: "Le carnet est à jour pour tous",
    texte: "Les cadres de l'unité, le chef de groupe, le responsable progression et les parents voient la même progression.",
  },
];

const ROLES: { role: string; texte: string }[] = [
  { role: "Cadres d'unité", texte: "Valident les preuves et préparent les cours d'honneur de leur unité, même sans réseau." },
  { role: "Chef de groupe", texte: "Voit toutes les unités du groupe, les jeunes à relancer et les étapes à reconnaître." },
  { role: "Responsable progression", texte: "Tient le carnet de chaque branche et suit la progression de tout le groupe, rapports compris." },
  { role: "Parents", texte: "Suivent la progression de leur enfant, une fois leur consentement enregistré par le groupe." },
  { role: "Administrateur", texte: "Crée les comptes, enregistre les consentements et gère les unités du groupe." },
];

const PRATIQUE: { titre: string; texte: string }[] = [
  { titre: "Fonctionne sans réseau", texte: "Les saisies restent sur le téléphone et partent dès que le réseau revient. L'application s'installe sur l'écran d'accueil." },
  { titre: "Pas d'inscription", texte: "Chaque compte est créé par l'administrateur du groupe, qui remet l'identifiant et le mot de passe en main propre." },
  { titre: "Les fiches des jeunes sont protégées", texte: "Chacun ne voit que ce qui le concerne. Les responsables se connectent avec un second facteur." },
];

function Connexion({ children, clair = false }: { children: ReactNode; clair?: boolean }) {
  return (
    <Link
      href="/connexion"
      className={
        clair
          ? "inline-flex h-12 items-center rounded-ui bg-sun px-6 text-[16px] font-bold text-forest focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
          : "inline-flex h-11 items-center rounded-ui border border-line-strong px-4 text-[15px] font-bold text-ink hover:bg-surface focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-green"
      }
    >
      {children}
    </Link>
  );
}

/** Le sentier de la troupe, parcouru par le soleil au chargement. */
function Sentier() {
  const position = (k: number) => `${(k / (ETAPES_TROUPE.length - 1)) * 100}%`;
  const soleil = `${((1 + AVANCEMENT) / (ETAPES_TROUPE.length - 1)) * 100}%`;
  return (
    <figure className="mt-14 sm:mt-20">
      <div className="relative mx-3 h-6 sm:mx-6" role="img" aria-label="Les étapes de la troupe : Volontaire, Engagé, Technicien, Animateur. Exemple d'un jeune engagé, à mi-chemin du Technicien.">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full [background:repeating-linear-gradient(90deg,rgba(255,255,255,.35)_0_6px,transparent_6px_12px)]" />
        <span aria-hidden className="absolute left-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-forest-muted motion-safe:animate-[sentier_1.6s_cubic-bezier(.3,.7,.3,1)_.2s_both]" style={{ width: soleil }}>
          <span className="absolute right-0 top-1/2 h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full bg-sun ring-[6px] ring-sun/25" />
        </span>
        {ETAPES_TROUPE.map((nom, k) => (
          <span
            key={nom}
            aria-hidden
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${k <= 1 ? "bg-forest-muted" : "border-2 border-white/45 bg-forest"}`}
            style={{ left: position(k) }}
          />
        ))}
      </div>
      {/* Chaque nom sous son point : le premier et le dernier s'alignent sur les bords. */}
      <ol aria-hidden className="relative mx-3 mt-3 h-5 text-[13px] font-semibold text-forest-muted sm:mx-6 sm:text-[15px]">
        {ETAPES_TROUPE.map((nom, k) => (
          <li
            key={nom}
            className={`absolute whitespace-nowrap ${k === 0 ? "-translate-x-[7px]" : k === ETAPES_TROUPE.length - 1 ? "-translate-x-[calc(100%-7px)]" : "-translate-x-1/2"}`}
            style={{ left: position(k) }}
          >
            {nom}
          </li>
        ))}
      </ol>
      <figcaption className="mt-5 text-[14px] text-forest-muted/80">Exemple : un jeune engagé, à mi-chemin du Technicien.</figcaption>
    </figure>
  );
}

export function Accueil() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="mx-auto flex max-w-[1080px] items-center justify-between px-5 py-4 sm:px-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Indlela" className="h-7 w-auto" />
        <Connexion>Se connecter</Connexion>
      </header>

      <main>
        <section className="bg-forest text-white">
          <div className="mx-auto max-w-[1080px] px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-24">
            <h1 className="max-w-[16ch] text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] text-balance sm:text-[68px]">Le chemin de chaque jeune, étape par étape.</h1>
            <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.55] text-forest-muted sm:text-[19px]">
              Indlela est le carnet de progression de votre groupe scout. Les cadres y valident les preuves pendant la réunion, la cour d&apos;honneur y reconnaît les
              étapes, et les parents suivent la progression de leur enfant.
            </p>
            <div className="mt-9">
              <Connexion clair>Se connecter</Connexion>
            </div>
            <Sentier />
          </div>
        </section>

        <section className="mx-auto max-w-[1080px] px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="text-[28px] font-extrabold tracking-[-0.02em] sm:text-[36px]">Comment se fait la progression</h2>
          <ol className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {PROGRESSION.map((p, k) => (
              <li key={p.titre} className="flex flex-col gap-2 border-t-[3px] border-green pt-4">
                <span className="num text-[15px] font-bold text-green">{k + 1}</span>
                <h3 className="text-[19px] font-bold leading-tight">{p.titre}</h3>
                <p className="text-[15px] leading-[1.55] text-muted">{p.texte}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-[1080px] gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div>
              <h2 className="text-[28px] font-extrabold tracking-[-0.02em] sm:text-[36px]">Qui fait quoi</h2>
              <p className="mt-3 max-w-[36ch] text-[15px] leading-[1.55] text-muted">Chaque compte a ses rôles. Une même personne peut en cumuler plusieurs, sauf un compte parent.</p>
            </div>
            <dl className="divide-y divide-line">
              {ROLES.map((r) => (
                <div key={r.role} className="grid gap-1 py-5 first:pt-0 sm:grid-cols-[220px_1fr] sm:gap-6">
                  <dt className="text-[17px] font-bold">{r.role}</dt>
                  <dd className="text-[15px] leading-[1.55] text-muted">{r.texte}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-[1080px] px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="text-[28px] font-extrabold tracking-[-0.02em] sm:text-[36px]">Pensé pour le terrain</h2>
          <div className="mt-10 grid gap-9 sm:grid-cols-3">
            {PRATIQUE.map((p) => (
              <div key={p.titre} className="flex flex-col gap-2">
                <h3 className="text-[19px] font-bold leading-tight">{p.titre}</h3>
                <p className="text-[15px] leading-[1.55] text-muted">{p.texte}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-forest text-white">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-[22px] font-extrabold tracking-[-0.01em]">Vous avez reçu un identifiant de votre groupe ?</p>
            <p className="mt-2 text-[15px] text-forest-muted">Pas encore de compte : demandez-le à l&apos;administrateur de votre groupe.</p>
          </div>
          <Connexion clair>Se connecter</Connexion>
        </div>
      </footer>
    </div>
  );
}

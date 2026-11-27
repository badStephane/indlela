import Link from "next/link";

export type Onglet = { libelle: string; href: string };

const MAX_ONGLETS = 4;

export function ongletsVisibles(onglets: Onglet[]): Onglet[] {
  return onglets.slice(0, MAX_ONGLETS);
}

/** Chemin sans requête, ancre ni barre oblique finale : `/jeune?id=12` et `/jeune/` valent `/jeune`. */
function chemin(href: string): string {
  const sansRequete = href.split(/[?#]/)[0];
  return sansRequete.length > 1 ? sansRequete.replace(/\/+$/, "") : sansRequete;
}

export function estOngletActif(href: string, actif: string): boolean {
  return chemin(href) === chemin(actif);
}

/** Onglets en bas sur téléphone (4 au plus). Libellés sur deux lignes autorisés, jamais hors de la barre. */
export function NavBas({ onglets, actif }: { onglets: Onglet[]; actif: string }) {
  const visibles = ongletsVisibles(onglets);
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 grid min-h-[70px] border-t-4 border-double border-encre bg-fond pb-[env(safe-area-inset-bottom)] lg:hidden" style={{ gridTemplateColumns: `repeat(${visibles.length}, minmax(0, 1fr))` }}>
      {visibles.map((o) => {
        const courant = estOngletActif(o.href, actif);
        return (
          <Link key={o.href} href={o.href} aria-current={courant ? "page" : undefined} className={`flex items-center justify-center px-1 py-2 text-center text-[13px] leading-tight no-underline ${courant ? "bg-encre font-bold text-fond" : "text-encre"}`}>
            {o.libelle}
          </Link>
        );
      })}
    </nav>
  );
}

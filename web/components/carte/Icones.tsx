/** Les trois signes du sentier (légende de la carte). Décoratifs : le libellé est donné à côté. */
export function RondPointe({ taille = 24 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="var(--color-fond)" stroke="var(--color-sentier)" strokeWidth="3" />
      <circle cx="12" cy="12" r="3.5" fill="var(--color-sentier)" />
    </svg>
  );
}

export function Soleil({ taille = 32 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 34 34" aria-hidden="true">
      <g stroke="var(--color-encre)" strokeWidth="2" strokeLinecap="round">
        <path d="M17 2v4M17 28v4M2 17h4M28 17h4M6.4 6.4l2.8 2.8M24.8 24.8l2.8 2.8M6.4 27.6l2.8-2.8M24.8 9.2l2.8-2.8" />
      </g>
      <circle cx="17" cy="17" r="8" fill="var(--color-soleil)" stroke="var(--color-encre)" strokeWidth="2" />
    </svg>
  );
}

export function CarrePointille({ taille = 22 }: { taille?: number }) {
  return <span aria-hidden="true" className="block border-2 border-dashed border-pointille bg-fond" style={{ width: taille, height: taille }} />;
}

/** Étoile de la meute (étape obtenue = remplie de soleil). */
export function Etoile({ pleine = true, taille = 22 }: { pleine?: boolean; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill={pleine ? "var(--color-soleil)" : "var(--color-fond)"} stroke="var(--color-encre)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

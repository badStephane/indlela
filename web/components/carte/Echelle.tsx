const SEGMENT_MAX = 14;
const SEGMENT_MIN = 4;
/** Largeur que l'échelle ne dépasse pas, pour tenir à côté d'un nom sur un téléphone de 360 px. */
const ECHELLE_MAX = 180;

/** Largeur d'un segment : 14 px, moins quand les preuves sont nombreuses, jamais sous 4 px. */
export function largeurSegment(total: number): number {
  return Math.max(SEGMENT_MIN, Math.min(SEGMENT_MAX, Math.floor(ECHELLE_MAX / Math.max(total, 1))));
}

/** Échelle graphique : un segment par preuve, comme l'échelle d'une carte. */
export function Echelle({ faites, total, segment, avecCompte = true }: { faites: number; total: number; segment?: number; avecCompte?: boolean }) {
  const largeur = segment ?? largeurSegment(total);
  return (
    <span className="inline-flex items-center gap-2">
      <span role="img" aria-label={`${faites} preuves sur ${total}`} className="inline-flex border-[1.5px] border-encre">
        {Array.from({ length: total }, (_, k) => (
          <span
            key={k}
            className={`h-2 ${k ? "border-l border-encre" : ""} ${k < faites ? (k % 2 ? "bg-sentier-fonce" : "bg-sentier") : "bg-fond"}`}
            style={{ width: largeur }}
          />
        ))}
      </span>
      {avecCompte && <span aria-hidden="true" className="font-mono text-xs text-crayon">{faites}/{total}</span>}
    </span>
  );
}

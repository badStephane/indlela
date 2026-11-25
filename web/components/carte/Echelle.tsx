/** Échelle graphique : un segment par preuve, comme l'échelle d'une carte. */
export function Echelle({ faites, total, segment = 14, avecCompte = true }: { faites: number; total: number; segment?: number; avecCompte?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span role="img" aria-label={`${faites} preuves sur ${total}`} className="inline-flex border-[1.5px] border-encre">
        {Array.from({ length: total }, (_, k) => (
          <span
            key={k}
            className={`h-2 ${k ? "border-l border-encre" : ""} ${k < faites ? (k % 2 ? "bg-sentier-fonce" : "bg-sentier") : "bg-fond"}`}
            style={{ width: segment }}
          />
        ))}
      </span>
      {avecCompte && <span aria-hidden="true" className="font-mono text-xs text-crayon">{faites}/{total}</span>}
    </span>
  );
}

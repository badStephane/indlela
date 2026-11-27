type Props = { taille?: number; avecNom?: boolean; className?: string };

/** Symbole « i » sentier + nom. Le symbole remplace le « i » de « indlela ». */
export function Logo({ taille = 32, avecNom = true, className = "" }: Props) {
  return (
    <span className={`inline-flex items-end gap-1.5 ${className}`}>
      <svg width={Math.round(taille * 0.56)} height={taille} viewBox="64 0 144 256" role="img" aria-label="Indlela">
        <path d="M96 224 C96 160 176 168 176 112" fill="none" stroke="var(--color-sentier)" strokeWidth="32" strokeLinecap="round" />
        <circle cx="176" cy="48" r="32" fill="var(--color-soleil)" />
      </svg>
      {avecNom && (
        <span className="font-logo font-bold leading-none text-sentier" style={{ fontSize: taille * 0.75 }} aria-hidden="true">
          ndlela
        </span>
      )}
    </span>
  );
}

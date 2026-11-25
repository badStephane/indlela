/** Chemin pas encore parcouru : un cercle en pointillés et quatre pas. Pour les écrans vides. */
export function CheminDebut({ largeur = 56 }: { largeur?: number }) {
  return (
    <svg aria-hidden="true" width={largeur} height={(largeur * 84) / 56} viewBox="0 0 56 84">
      <circle cx="40" cy="14" r="11" fill="none" stroke="var(--color-pointille)" strokeWidth="3" strokeDasharray="3 4" />
      {PAS.map(([cx, cy]) => (
        <circle key={cy} cx={cx} cy={cy} r="4" fill="var(--color-pointille)" />
      ))}
    </svg>
  );
}

const PAS = [
  [36, 37],
  [27, 47],
  [16, 57],
  [6, 69],
] as const;

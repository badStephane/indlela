const TEINTES = ["bg-sentier-1 text-encre", "bg-sentier-2 text-encre", "bg-sentier text-white", "bg-encre text-white"];

export type RepartitionEtape = { etape: string; nombre: number };
export type SegmentBarre = RepartitionEtape & { teinte: string };

/** Segments non vides. La teinte suit le rang de l'étape, pas celui du segment : une étape vide ne décale pas les couleurs. */
export function segmentsBarre(repartition: RepartitionEtape[]): SegmentBarre[] {
  return repartition
    .map((r, i) => ({ ...r, teinte: TEINTES[Math.min(i, TEINTES.length - 1)] }))
    .filter((r) => r.nombre > 0);
}

/** Répartition des jeunes d'une unité par étape (du plus clair au plus foncé). */
export function BarreSentier({ repartition }: { repartition: RepartitionEtape[] }) {
  const resume = repartition.map((r) => `${r.etape} : ${r.nombre}`).join(", ");
  return (
    <span role="img" aria-label={`Jeunes par étape. ${resume}`} className="flex h-7 border-[1.5px] border-encre">
      {segmentsBarre(repartition).map((r, i) => (
        <span
          key={r.etape}
          title={r.etape}
          className={`flex min-w-8 items-center justify-center font-mono text-[13px] ${r.teinte} ${i ? "border-l-[1.5px] border-encre" : ""}`}
          style={{ flex: `${r.nombre} 1 0` }}
        >
          {r.nombre}
        </span>
      ))}
    </span>
  );
}

import type { RepartitionEtape } from "./BarreSentier";

/** Jeunes par étape, posés sur le chemin : un carré vert par étape occupée, pointillé si personne n'y est. */
export function EffectifChemin({ etapes }: { etapes: RepartitionEtape[] }) {
  const n = etapes.length;
  if (!n) return null;
  const resume = etapes.map((e) => `${e.etape} : ${e.nombre}`).join(", ");
  return (
    <div role="img" aria-label={`Jeunes par étape. ${resume}`} className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span aria-hidden="true" className="absolute top-[17px] border-t-2 border-dashed border-pointille" style={{ left: `${50 / n}%`, right: `${50 / n}%` }} />
      {etapes.map((e) => (
        <div key={e.etape} className="relative flex min-w-0 flex-col items-center gap-1.5">
          <span
            className={`flex h-9 min-w-9 items-center justify-center px-1.5 font-mono text-[15px] ${e.nombre ? "bg-sentier text-white" : "border-[1.5px] border-dashed border-pointille bg-fond text-crayon"}`}
          >
            {e.nombre}
          </span>
          <span className="max-w-full text-center text-[14px] leading-tight">{e.etape}</span>
        </div>
      ))}
    </div>
  );
}

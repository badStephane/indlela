import { CarrePointille, RondPointe, Soleil } from "./Icones";

export type EtatEtape = "franchie" | "en-cours" | "a-venir";
export type EtapeSentier = { nom: string; etat: EtatEtape; note?: string };

/**
 * Sentier d'un jeune : franchie = rond pointé (signe de piste « arrivé »), en cours = soleil, à venir = pointillé.
 * Trait plein vert jusqu'à l'étape en cours, pointillé ensuite.
 */
export function Sentier({ etapes, className = "" }: { etapes: EtapeSentier[]; className?: string }) {
  const iEnCours = etapes.findIndex((e) => e.etat === "en-cours");
  const iCours = iEnCours >= 0 ? iEnCours : Math.max(0, etapes.map((e) => e.etat).lastIndexOf("franchie"));
  const n = etapes.length;
  const part = (i: number) => `${((i + 0.5) / n) * 100}%`;
  const resume = etapes.map((e) => `${e.nom} ${e.etat === "franchie" ? "franchie" : e.etat === "en-cours" ? "en cours" : "à venir"}`).join(", ");
  return (
    <ol aria-label={`Sentier : ${resume}`} className={`relative grid list-none p-0 ${className}`} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span aria-hidden="true" className="absolute top-4 border-t-[3px] border-sentier" style={{ left: part(0), width: `${(iCours / n) * 100}%` }} />
      <span aria-hidden="true" className="absolute top-4 border-t-2 border-dashed border-pointille" style={{ left: part(iCours), right: `${(0.5 / n) * 100}%` }} />
      {etapes.map((e) => (
        <li key={e.nom} className="relative z-10 flex flex-col items-center gap-1 text-center">
          <span className="flex h-8 items-center">
            {e.etat === "franchie" ? <RondPointe /> : e.etat === "en-cours" ? <Soleil /> : <CarrePointille />}
          </span>
          <span className={`text-sm ${e.etat === "a-venir" ? "text-crayon" : "font-semibold"}`}>{e.nom}</span>
          {e.note && <span className="font-mono text-xs text-crayon">{e.note}</span>}
        </li>
      ))}
    </ol>
  );
}

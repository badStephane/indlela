import type { ReactNode } from "react";

/** Cartouche à double cadre : identité d'un jeune, d'un compte ou d'une page (comme le titre d'une carte). */
export function Cartouche({ titre, sousTitre, libelle, valeur, as: Titre = "h1" }: { titre: ReactNode; sousTitre?: ReactNode; libelle?: string; valeur?: ReactNode; as?: "h1" | "h2" | "div" }) {
  return (
    <div className="m-1 grid grid-cols-[1fr_auto] border-[1.5px] border-encre bg-fond outline outline-1 outline-offset-[3px] outline-encre">
      <div className={`min-w-0 px-4 py-3 ${libelle ? "border-r border-encre" : ""}`}>
        <Titre className="m-0 text-titre font-extrabold lg:text-titre-web leading-tight tracking-[-0.3px]">{titre}</Titre>
        {sousTitre && <p className="mt-1 text-sm text-crayon">{sousTitre}</p>}
      </div>
      {libelle && (
        <div className="flex flex-col items-center justify-center px-4 py-3">
          <span className="text-xs text-crayon">{libelle}</span>
          <strong className="text-base">{valeur}</strong>
        </div>
      )}
    </div>
  );
}

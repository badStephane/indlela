import type { ReactNode } from "react";
import { PointAttente } from "./PastilleSync";

export type Preuve = {
  id: string;
  libelle: string;
  /** Date de réussite, déjà écrite (« 12.09 ») ; absente = à réussir. */
  date?: string;
  cadre?: string;
  note?: string;
  /** Réussie sur ce téléphone, pas encore envoyée : point orange. */
  attente?: boolean;
  /** Validation annulée (date écrite) : la preuve redevient à réussir. */
  annulee?: string;
  /** Sous la preuve, dans son filet : photos… */
  suite?: ReactNode;
};

/**
 * Tracé des preuves d'un domaine : point plein sur trait vert = réussie, rond vide sur pointillé = à réussir.
 * `onOuvrir` permet d'ouvrir une preuve réussie (photos, annulation).
 */
export function TracePreuves({ preuves, onOuvrir }: { preuves: Preuve[]; onOuvrir?: (p: Preuve) => void }) {
  return (
    <ul className="m-0 list-none p-0">
      {preuves.map((p) => {
        const ok = Boolean(p.date) && !p.annulee;
        const etat = ok ? `Réussie le ${p.date}${p.cadre ? `, validée par ${p.cadre}` : ""}${p.attente ? ", en attente du réseau" : ""}` : "À réussir";
        const contenu = (
          <>
            <span className={`block text-base ${p.annulee ? "text-crayon" : ""}`}>{p.libelle}</span>
            {ok && p.note && <span className="block font-note text-sm italic text-annotation">{p.note}</span>}
            {p.annulee && <span className="block text-sm font-semibold text-erreur">Annulée le {p.annulee} · à revalider</span>}
            <span className="sr-only">{etat}</span>
          </>
        );
        return (
          <li key={p.id} className="grid grid-cols-[26px_1fr] gap-x-2.5">
            <span aria-hidden="true" className="flex justify-center" style={{ background: ok ? "linear-gradient(var(--color-sentier),var(--color-sentier)) center/3px 100% no-repeat" : "repeating-linear-gradient(var(--color-pointille) 0 4px,transparent 4px 8px) center/2px 100% no-repeat" }}>
              <span className={`mt-3.5 size-3.5 rounded-full ${ok ? "border-[3px] border-fond bg-sentier shadow-[0_0_0_1.5px_var(--color-sentier)]" : "border-2 border-pointille bg-fond"}`} />
            </span>
            <div className="min-w-0 border-b border-ligne">
              <div className="grid grid-cols-[1fr_auto] gap-x-2.5">
                {ok && onOuvrir ? (
                  <button type="button" onClick={() => onOuvrir(p)} className="min-h-11 min-w-0 border-0 bg-transparent py-2.5 text-left text-encre">{contenu}</button>
                ) : (
                  <div className="min-w-0 py-2.5">{contenu}</div>
                )}
                <span aria-hidden="true" className="py-3 text-right font-mono text-xs text-crayon">
                  {ok && p.date}
                  {ok && p.cadre && <><br />{p.cadre}</>}
                  {ok && p.attente && (
                    <span className="mt-1 flex items-center justify-end gap-1.5">
                      <PointAttente /> attente
                    </span>
                  )}
                </span>
              </div>
              {p.suite}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

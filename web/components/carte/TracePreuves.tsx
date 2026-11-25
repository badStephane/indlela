export type Preuve = { id: string; libelle: string; date?: string; cadre?: string; note?: string };

/**
 * Tracé des preuves d'un domaine : point plein sur trait vert = réussie, rond vide sur pointillé = à réussir.
 * `onOuvrir` permet d'ouvrir une preuve réussie (photos, annulation).
 */
export function TracePreuves({ preuves, onOuvrir }: { preuves: Preuve[]; onOuvrir?: (p: Preuve) => void }) {
  return (
    <ul className="m-0 list-none p-0">
      {preuves.map((p) => {
        const ok = Boolean(p.date);
        const contenu = (
          <>
            <span className="block text-base">{p.libelle}</span>
            {ok && p.note && <span className="block font-note text-sm italic text-annotation">{p.note}</span>}
            <span className="sr-only">{ok ? `Réussie le ${p.date}${p.cadre ? `, validée par ${p.cadre}` : ""}` : "À réussir"}</span>
          </>
        );
        return (
          <li key={p.id} className="grid grid-cols-[26px_1fr_auto] gap-x-2.5">
            <span aria-hidden="true" className="flex justify-center" style={{ background: ok ? "linear-gradient(var(--color-sentier),var(--color-sentier)) center/3px 100% no-repeat" : "repeating-linear-gradient(var(--color-pointille) 0 4px,transparent 4px 8px) center/2px 100% no-repeat" }}>
              <span className={`mt-3.5 size-3.5 rounded-full ${ok ? "border-[3px] border-fond bg-sentier shadow-[0_0_0_1.5px_var(--color-sentier)]" : "border-2 border-pointille bg-fond"}`} />
            </span>
            {ok && onOuvrir ? (
              <button type="button" onClick={() => onOuvrir(p)} className="min-h-11 border-0 border-b border-ligne bg-transparent py-2.5 text-left">{contenu}</button>
            ) : (
              <div className="border-b border-ligne py-2.5">{contenu}</div>
            )}
            <span aria-hidden="true" className="border-b border-ligne py-3 text-right font-mono text-xs text-crayon">
              {p.date}
              {p.cadre && <><br />{p.cadre}</>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

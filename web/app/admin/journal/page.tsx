"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cx } from "@/components/ui";
import { Bouton } from "@/components/carte";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import type { JournalAction, JournalEntry, JournalValue } from "@/lib/admin";
import { fmtPoint, toISODate } from "@/lib/dates";

type Filtre = "tout" | "validations" | "referentiels" | "comptes" | "donnees";

const FILTRES: { value: Filtre; label: string; actions: JournalAction[] | null }[] = [
  { value: "tout", label: "Tout", actions: null },
  { value: "validations", label: "Validations", actions: ["validation", "annulation"] },
  { value: "referentiels", label: "Référentiels", actions: ["publication"] },
  { value: "comptes", label: "Comptes", actions: ["creation", "modification", "consentement"] },
  { value: "donnees", label: "Données", actions: ["import", "export", "sauvegarde"] },
];

const ACTION_LABELS: Record<JournalAction, string> = {
  validation: "Validation",
  annulation: "Annulation",
  publication: "Publication",
  creation: "Création",
  modification: "Modification",
  consentement: "Consentement",
  import: "Import",
  export: "Export",
  sauvegarde: "Sauvegarde",
};

const PAGE = 40;

/** « 28.11 16:42 » : jour, mois et heure de la trace. */
const quand = (iso: string) => `${fmtPoint(toISODate(new Date(iso)))} ${new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
const val = (v: JournalValue | undefined) => (v === null || v === undefined || v === "" ? "—" : typeof v === "boolean" ? (v ? "oui" : "non") : String(v));

export default function Journal() {
  const ok = useGuard((r) => r === "admin");
  const store = useStore();
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    if (ok) store.setLastTab("/admin/journal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const actions = FILTRES.find((f) => f.value === filtre)!.actions;
  const all = store.journal.filter((e) => !actions || actions.includes(e.action));
  const shown = all.slice(0, limit);

  return (
    <AppShell kicker="Toutes les écritures, en ajout seul : qui, quand, avant et après" title="Journal" wide>
      <div className="flex flex-col gap-4 px-4 pb-10 lg:px-0">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Filtrer le journal">
          {FILTRES.map((f) => {
            const on = f.value === filtre;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFiltre(f.value);
                  setLimit(PAGE);
                }}
                className={cx("min-h-11 flex-none border-[1.5px] border-encre px-3.5 text-[15px]", on ? "bg-encre font-semibold text-fond" : "bg-transparent text-encre")}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {shown.length === 0 ? (
          <p className="m-0 border-t border-ligne py-4 text-[16px] text-crayon">Aucune trace de ce type pour l&apos;instant.</p>
        ) : (
          <div>
            <div aria-hidden="true" className="hidden grid-cols-[120px_170px_150px_minmax(0,1fr)] gap-3 border-b border-ligne py-2 text-[14px] font-semibold lg:grid">
              <span>Date</span>
              <span>Qui</span>
              <span>Action</span>
              <span>Détail</span>
            </div>
            <ol className="m-0 list-none p-0">
              {shown.map((e) => (
                <Trace key={e.id} e={e} ouverte={open === e.id} onBascule={() => setOpen(open === e.id ? null : e.id)} />
              ))}
            </ol>
          </div>
        )}

        {all.length > limit && (
          <Bouton variante="secondaire" onClick={() => setLimit((l) => l + PAGE)} className="w-full lg:w-auto">
            Voir les {Math.min(PAGE, all.length - limit)} traces suivantes
          </Bouton>
        )}
        <p className="m-0 text-[15px] text-crayon text-pretty">Personne ne peut effacer une ligne du journal, pas même l&apos;administrateur. Chaque trace est datée et signée.</p>
      </div>
    </AppShell>
  );
}

function Trace({ e, ouverte, onBascule }: { e: JournalEntry; ouverte: boolean; onBascule: () => void }) {
  const champs = Array.from(new Set([...Object.keys(e.avant ?? {}), ...Object.keys(e.apres ?? {})]));
  return (
    <li className="border-b border-ligne">
      <button
        type="button"
        aria-expanded={ouverte}
        onClick={onBascule}
        className="grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 bg-transparent py-3 text-left text-[16px] text-encre lg:grid-cols-[120px_170px_150px_minmax(0,1fr)] lg:items-baseline"
      >
        <span className="font-mono text-[14px] font-semibold">{quand(e.at)}</span>
        <span className="text-right text-crayon lg:text-left lg:text-encre">{e.user}</span>
        <span className="font-semibold">{ACTION_LABELS[e.action]}</span>
        <span className="col-span-2 min-w-0 text-pretty lg:col-span-1">
          {e.resume} <span aria-hidden="true" className="text-crayon">{ouverte ? "▴" : "▾"}</span>
        </span>
      </button>
      {ouverte && (
        <div className="flex flex-col pb-3 lg:pl-[452px]">
          <span className="break-all font-mono text-[13px] text-crayon">
            {e.table} · {e.ligne}
          </span>
          {champs.length > 0 ? (
            <dl className="m-0">
              {champs.map((k) => (
                <div key={k} className="border-b border-ligne py-2 last:border-b-0">
                  <dt className="text-[14px] text-crayon">{k}</dt>
                  <dd className="m-0 break-words font-mono text-[15px]">
                    <s className="text-crayon">{e.avant ? val(e.avant[k]) : "—"}</s> → {e.apres ? val(e.apres[k]) : "—"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <span className="pt-1 text-[14px] text-crayon">Pas de détail avant / après pour cette trace.</span>
          )}
        </div>
      )}
    </li>
  );
}

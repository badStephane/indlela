"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cx, SectionLabel } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import type { JournalAction, JournalEntry, JournalValue } from "@/lib/admin";
import { daysSince, fmtDayMonth, toISODate } from "@/lib/dates";

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

const ACTION_DOT: Partial<Record<JournalAction, string>> = {
  validation: "bg-ok-dot",
  annulation: "bg-err-dot",
  publication: "bg-sun",
  consentement: "bg-wait-dot",
};

const PAGE = 40;

const dayLabel = (iso: string) => {
  const n = daysSince(iso);
  return n === 0 ? "Aujourd'hui" : n === 1 ? "Hier" : fmtDayMonth(iso);
};
const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
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
  const days: { day: string; items: JournalEntry[] }[] = [];
  for (const e of shown) {
    const day = toISODate(new Date(e.at));
    const last = days[days.length - 1];
    if (last?.day === day) last.items.push(e);
    else days.push({ day, items: [e] });
  }

  return (
    <AppShell kicker="Administration" title="Journal">
      <div className="flex flex-col gap-4 p-4">
        <p className="m-0 text-[14px] text-muted text-pretty">
          Chaque modification est gardée : qui, quoi, quand, avant et après. Le journal est en ajout seul : personne ne peut effacer une trace, pas même l&apos;administrateur.
        </p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filtrer le journal">
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
                className={cx("h-9 flex-none rounded-full border px-3.5 text-[13px] font-semibold", on ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted")}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {days.length === 0 && (
          <div className="rounded-card border border-dashed border-line-strong px-5 py-7 text-[15px] text-muted">Aucune trace de ce type pour l&apos;instant.</div>
        )}

        {days.map(({ day, items }) => (
          <section key={day} className="flex flex-col gap-2">
            <SectionLabel>
              {dayLabel(day)} · {items.length}
            </SectionLabel>
            <ol className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-line bg-surface p-0 [&>*:last-child]:border-b-0">
              {items.map((e) => {
                const expanded = open === e.id;
                const keys = Array.from(new Set([...Object.keys(e.avant ?? {}), ...Object.keys(e.apres ?? {})]));
                return (
                  <li key={e.id} className="border-b border-rule">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : e.id)}
                      className="flex w-full items-start gap-3 bg-transparent px-3.5 py-2.5 text-left text-inherit"
                    >
                      <span className="w-[42px] flex-none pt-0.5 font-mono text-[12px] text-muted">{time(e.at)}</span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[14px] font-medium text-pretty">{e.resume}</span>
                        <span className="flex items-center gap-1.5 text-[12px] text-muted">
                          <span className={cx("h-2 w-2 flex-none rounded-full", ACTION_DOT[e.action] ?? "bg-line-strong")} />
                          {ACTION_LABELS[e.action]} · {e.user}
                        </span>
                      </span>
                      <span className="pt-0.5 text-[14px] text-muted">{expanded ? "▴" : "▾"}</span>
                    </button>
                    {expanded && (
                      <div className="flex flex-col gap-2 px-3.5 pb-3.5 pl-[68px]">
                        <span className="break-all font-mono text-[11px] text-muted">
                          {e.table} · {e.ligne}
                        </span>
                        {keys.length > 0 && (
                          <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-ui bg-paper px-3 py-2.5 font-mono text-[11px]">
                            <span className="text-muted">champ</span>
                            <span className="text-muted">avant</span>
                            <span className="text-muted">après</span>
                            {keys.map((k) => (
                              <span key={k} className="contents">
                                <span>{k}</span>
                                <span className="break-words text-err-ink">{e.avant ? val(e.avant[k]) : "—"}</span>
                                <span className="break-words text-ok-ink">{e.apres ? val(e.apres[k]) : "—"}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        {all.length > limit && (
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="h-12 rounded-ui border border-line-strong bg-surface text-[15px] font-semibold text-ink">
            Voir les {Math.min(PAGE, all.length - limit)} traces suivantes
          </button>
        )}
      </div>
    </AppShell>
  );
}

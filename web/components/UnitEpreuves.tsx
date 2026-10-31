"use client";

import { useState } from "react";
import { cx } from "./ui";
import { useStore } from "@/lib/store";
import { uuid } from "@/lib/mock";
import { plural } from "@/lib/progress";
import { BRANCHES, type BranchCode } from "@/lib/referentiels";
import type { DomaineUnite, EtapeUnite, UnitAdapt } from "@/lib/effective";

// Adaptation du carnet à une unité : on retire des domaines au choix et on ajoute
// ses propres preuves dans un domaine. Les domaines obligatoires restent ceux du référentiel.

const MAX_LABEL = 120;

type Update = (fn: (a: UnitAdapt) => UnitAdapt, resume?: string) => void;

export function UnitEpreuves({ branche }: { branche: BranchCode }) {
  const store = useStore();
  const [open, setOpen] = useState(0);
  const steps = store.steps[branche];
  const unit = BRANCHES[branche].unit;
  const update: Update = (fn, resume) => store.updateAdapt(branche, fn, resume && `${unit} · ${resume}`);

  if (!steps.length) {
    return (
      <div className="rounded-card border border-dashed border-line-strong px-5 py-6 text-[14px] text-muted text-pretty">
        Le référentiel de la branche n&apos;a pas encore d&apos;étape : l&apos;unité n&apos;a rien à adapter pour l&apos;instant.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[14px] text-muted text-pretty">
        Le référentiel de la branche (version {store.refVersion[branche]}) est la base. Retirez les domaines au choix que l&apos;unité ne propose pas, et ajoutez ses propres
        preuves dans un domaine.
      </p>
      <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface [&>*:last-child]:border-b-0">
        {steps.map((s, i) => (
          <EtapeBloc key={s.id} step={s} isOpen={open === i} onOpen={() => setOpen(open === i ? -1 : i)} update={update} />
        ))}
      </div>
    </div>
  );
}

function EtapeBloc({ step, isOpen, onOpen, update }: { step: EtapeUnite; isOpen: boolean; onOpen: () => void; update: Update }) {
  const proposes = step.domaines.filter((d) => !d.retire && !d.archive).length;
  return (
    <div className="flex flex-col border-b border-rule bg-surface">
      <button type="button" aria-expanded={isOpen} onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 bg-transparent px-3.5 py-2 text-left text-inherit">
        <span className="flex flex-1 flex-col">
          <span className="text-[16px] font-semibold">{step.name}</span>
          <span className="text-[12px] text-muted">
            {proposes} {step.regle ? "séries de brevets" : "domaines"}
            {step.rule ? ` · ${step.rule}` : ""}
          </span>
        </span>
        <span className="text-[16px] text-muted">{isOpen ? "▴" : "▾"}</span>
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2 px-3.5 pb-3.5">
          {step.domaines.filter((d) => !d.archive).map((d) => (
            <DomaineRow key={d.id} d={d} brevets={!!step.regle} update={update} />
          ))}
        </div>
      )}
    </div>
  );
}

function DomaineRow({ d, brevets, update }: { d: DomaineUnite; brevets: boolean; update: Update }) {
  const store = useStore();
  const [label, setLabel] = useState("");
  const toggleRetire = () =>
    update(
      (a) => ({ ...a, retirees: a.retirees.includes(d.id) ? a.retirees.filter((x) => x !== d.id) : [...a.retirees, d.id] }),
      `Domaine « ${d.name} » ${d.retire ? "proposé de nouveau" : "retiré"} pour l'unité`,
    );
  const add = () => {
    const text = label.trim().slice(0, MAX_LABEL);
    if (!text) return;
    update((a) => ({ ...a, ajoutees: { ...a.ajoutees, [d.id]: [...(a.ajoutees[d.id] ?? []), { id: `u.${uuid()}`, label: text }] } }), `Preuve « ${text} » ajoutée à ${d.name}`);
    setLabel("");
    store.showToast(`« ${text} » ajoutée à ${d.name}`);
  };
  const removeAdded = (id: string) =>
    update(
      (a) => ({ ...a, ajoutees: { ...a.ajoutees, [d.id]: (a.ajoutees[d.id] ?? []).filter((x) => x.id !== id) } }),
      `Preuve « ${d.preuves.find((x) => x.id === id)?.label ?? ""} » retirée de ${d.name}`,
    );
  const propres = d.preuves.filter((x) => x.unite);

  return (
    <details className="rounded-ui border border-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-1.5">
        <span className="flex min-w-0 flex-col">
          <span className={cx("text-[14px] font-semibold", d.retire && "text-muted line-through")}>{d.name}</span>
          <span className="font-mono text-[11px] text-muted">
            {d.preuves.length} {brevets ? plural(d.preuves.length, "brevet", "brevets") : plural(d.preuves.length, "preuve", "preuves")}
            {d.min ? ` · ${d.min} au choix` : ""}
            {propres.length ? ` · ${propres.length} de l'unité` : ""}
          </span>
        </span>
        {d.obligatoire ? (
          <span className="flex-none rounded-full bg-acc-soft px-2.5 py-1.5 text-[12px] font-bold text-acc-text">Obligatoire</span>
        ) : (
          <button
            type="button"
            aria-pressed={!d.retire}
            onClick={(e) => {
              e.preventDefault();
              toggleRetire();
            }}
            className={cx("h-8 flex-none rounded-full border px-2.5 text-[12px] font-bold", d.retire ? "border-line-strong bg-transparent text-muted" : "border-acc bg-surface text-acc-text")}
          >
            {d.retire ? "Retiré" : "Proposé"}
          </button>
        )}
      </summary>
      <div className="flex flex-col gap-1 border-t border-line px-3 pb-3 pt-2">
        {d.preuves.filter((x) => !x.archive).map((x) => (
          <div key={x.id} className="flex items-start justify-between gap-2 py-1 text-[13px]">
            <span className="text-pretty">
              {x.label}
              {x.unite && <span className="font-mono text-[11px] text-acc-text"> · unité</span>}
            </span>
            {x.unite && (
              <button type="button" onClick={() => removeAdded(x.id)} aria-label={`Retirer ${x.label}`} className="h-7 flex-none bg-transparent px-1 text-[16px] text-muted">
                ×
              </button>
            )}
          </div>
        ))}
        {!d.retire && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="mt-1.5 flex gap-2"
          >
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={MAX_LABEL}
              placeholder={brevets ? "Brevet propre à l'unité" : "Preuve propre à l'unité"}
              aria-label={`Nouvelle preuve pour ${d.name}`}
              className="h-10 min-w-0 flex-1 rounded-ui border border-line-strong bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink"
            />
            <button type="submit" disabled={!label.trim()} className="h-10 flex-none rounded-ui bg-acc px-3.5 text-[13px] font-bold text-acc-ink disabled:bg-track disabled:text-muted">
              Ajouter
            </button>
          </form>
        )}
      </div>
    </details>
  );
}


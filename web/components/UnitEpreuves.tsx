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
  const unit = store.unitesNoms[branche];
  const update: Update = (fn, resume) => store.updateAdapt(branche, fn, resume && `${unit} · ${resume}`);

  if (!steps.length) {
    return (
      <p className="m-0 text-[16px] text-crayon text-pretty">
        Le référentiel de la branche n&apos;a pas encore d&apos;étape : l&apos;unité n&apos;a rien à adapter pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 border-l-4 border-encre pl-3 text-[16px] text-pretty">
        Le référentiel de la branche (version {store.refVersion[branche]}) est la base. Retirez les domaines au choix que l&apos;unité ne propose pas, et ajoutez ses propres
        preuves dans un domaine.
      </p>
      <div className="flex flex-col gap-4">
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
    <section className="flex flex-col">
      <button type="button" aria-expanded={isOpen} onClick={onOpen} className="filet-double flex min-h-14 w-full items-center gap-3 bg-transparent py-2 text-left text-encre">
        <span className="flex flex-1 flex-col">
          <span className="text-section font-extrabold tracking-[-0.3px]">{step.name}</span>
          <span className="text-[14px] text-crayon">
            {proposes} {step.regle ? "séries de brevets" : "domaines"}
            {step.rule ? ` · ${step.rule}` : ""}
          </span>
        </span>
        <span aria-hidden="true" className="text-[18px]">{isOpen ? "▴" : "▾"}</span>
      </button>
      {isOpen && (
        <div className="flex flex-col">
          {step.domaines.filter((d) => !d.archive).map((d) => (
            <DomaineRow key={d.id} d={d} brevets={!!step.regle} update={update} />
          ))}
        </div>
      )}
    </section>
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
    <details className="border-b border-ligne">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-2">
        <span className="flex min-w-0 flex-col">
          <span className={cx("text-[17px]", d.retire && "text-crayon line-through")}>{d.name}</span>
          <span className="font-mono text-[13px] text-crayon">
            {d.preuves.length} {brevets ? plural(d.preuves.length, "brevet", "brevets") : plural(d.preuves.length, "preuve", "preuves")}
            {d.min ? ` · ${d.min} au choix` : ""}
            {propres.length ? ` · ${propres.length} de l'unité` : ""}
          </span>
        </span>
        {d.obligatoire ? (
          <span className="flex-none text-[14px] text-crayon">obligatoire</span>
        ) : (
          <button
            type="button"
            aria-pressed={!d.retire}
            onClick={(e) => {
              e.preventDefault();
              toggleRetire();
            }}
            aria-label={`${d.name} : ${d.retire ? "retiré" : "proposé"} pour l'unité`}
            className="flex size-11 flex-none items-center justify-center bg-transparent"
          >
            <span aria-hidden="true" className={cx("flex size-7 items-center justify-center text-[17px] font-bold", d.retire ? "border-2 border-encre bg-fond" : "bg-sentier text-white")}>
              {d.retire ? "" : "✓"}
            </span>
          </button>
        )}
      </summary>
      <div className="flex flex-col pb-3">
        {d.preuves.filter((x) => !x.archive).map((x) => (
          <div key={x.id} className="flex items-start justify-between gap-2 border-t border-ligne py-2 text-[16px]">
            <span className="text-pretty">
              {x.label}
              {x.unite && <span className="ml-1.5 inline-block border border-encre px-1 text-[13px] font-semibold">propre à l&apos;unité</span>}
            </span>
            {x.unite && (
              <button type="button" onClick={() => removeAdded(x.id)} aria-label={`Retirer ${x.label}`} className="size-11 flex-none bg-transparent text-[20px] text-encre">
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
            className="mt-2 flex items-end gap-3"
          >
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={MAX_LABEL}
              placeholder={brevets ? "Brevet propre à l'unité" : "Preuve propre à l'unité"}
              aria-label={`Nouvelle preuve pour ${d.name}`}
              className="h-11 min-w-0 flex-1 border-0 border-b-[1.5px] border-encre bg-transparent px-0 text-[17px] text-encre placeholder:text-crayon"
            />
            <button type="submit" disabled={!label.trim()} className="min-h-11 flex-none border-[1.5px] border-dashed border-encre bg-fond px-3.5 text-[15px] font-semibold text-encre disabled:border-ligne disabled:text-crayon">
              + Ajouter
            </button>
          </form>
        )}
      </div>
    </details>
  );
}


"use client";

// Éditeur de référentiel de l'admin : étapes, domaines (ou séries de brevets) et preuves.
// Toutes les modifications vont dans le brouillon de la branche ; rien ne se supprime,
// un domaine ou une preuve s'archive.

import { useEffect, useState, type KeyboardEvent } from "react";
import { cx } from "@/components/ui";
import { uuid } from "@/lib/mock";
import { MAX_LABEL, addDomaine, addPreuve, moveDomaine, movePreuve, updateDomaine, updateEtape, updateEtapeRegles, updatePreuve } from "@/lib/refEditor";
import { MAJORITES } from "@/lib/courHonneur";
import type { Domaine, Etape, Preuve } from "@/lib/referentiels";

export type Edit = (fn: (steps: Etape[]) => Etape[]) => void;

const shortId = () => uuid().slice(0, 8);
const fieldClass = "h-11 min-w-0 border-0 border-b-[1.5px] border-encre bg-transparent px-0 text-[16px] font-normal text-encre";
const chipClass = "min-h-11 flex-none border-[1.5px] px-3 text-[14px] font-semibold";

/** Champ texte enregistré à la sortie du champ ou sur Entrée ; Échap annule. */
function EditableText({ value, onCommit, label, allowEmpty = false, className }: { value: string; onCommit: (v: string) => void; label: string; allowEmpty?: boolean; className?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const v = text.trim();
    if (v === value || (!v && !allowEmpty)) return setText(value);
    onCommit(v);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      setText(value);
      e.currentTarget.blur();
    }
  };
  return <input aria-label={label} value={text} maxLength={MAX_LABEL} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={onKey} className={cx(fieldClass, className)} />;
}

/** Champ d'ajout : un libellé et un bouton. */
export function AddInput({ placeholder, onAdd }: { placeholder: string; onAdd: (label: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text);
        setText("");
      }}
      className="flex gap-2"
    >
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_LABEL} placeholder={placeholder} aria-label={placeholder} className={cx(fieldClass, "flex-1")} />
      <button type="submit" disabled={!text.trim()} className="h-11 flex-none bg-sentier px-4 text-[15px] font-semibold text-white disabled:bg-ligne disabled:text-crayon">
        Ajouter
      </button>
    </form>
  );
}

function MoveButtons({ name, first, last, onMove }: { name: string; first: boolean; last: boolean; onMove: (delta: number) => void }) {
  const cls = "size-11 flex-none border-[1.5px] border-encre bg-transparent text-[15px] text-encre disabled:border-ligne disabled:text-crayon";
  return (
    <span className="flex flex-none gap-1">
      <button type="button" disabled={first} onClick={() => onMove(-1)} aria-label={`Monter ${name}`} className={cls}>
        ↑
      </button>
      <button type="button" disabled={last} onClick={() => onMove(1)} aria-label={`Descendre ${name}`} className={cls}>
        ↓
      </button>
    </span>
  );
}

function ArchiveButton({ archived, onToggle }: { archived?: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={cx(chipClass, archived ? "border-sentier bg-transparent text-sentier" : "border-encre bg-transparent text-encre")}>
      {archived ? "Restaurer" : "Archiver"}
    </button>
  );
}

export function EtapeEditor({ step, index, edit, isOpen, onOpen }: { step: Etape; index: number; edit: Edit; isOpen: boolean; onOpen: () => void }) {
  const brevets = step.regle?.kind === "brevets";
  const actifs = step.domaines.filter((d) => !d.archive).length;
  return (
    <div className="flex flex-col border-b border-ligne">
      <button type="button" aria-expanded={isOpen} onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 bg-transparent py-2 text-left text-encre">
        <span className="w-6 flex-none font-mono text-[15px]">{index + 1}.</span>
        <span className="flex flex-1 flex-col">
          <span className="text-[17px] font-semibold">{step.name}</span>
          <span className="text-[14px] text-crayon">
            {actifs} {brevets ? "séries de brevets" : "domaines"}
            {step.rule ? ` · ${step.rule}` : ""}
          </span>
        </span>
        <span aria-hidden="true" className="text-[16px] text-crayon">{isOpen ? "▴" : "▾"}</span>
      </button>
      {isOpen && (
        <div className="flex flex-col gap-4 pb-5">
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Nom de l'étape">
              <EditableText label="Nom de l'étape" value={step.name} onCommit={(name) => edit((s) => updateEtape(s, step.id, { name }))} />
            </Field>
            <Field label="Validée par">
              <EditableText label="Validée par" allowEmpty value={step.val} onCommit={(val) => edit((s) => updateEtape(s, step.id, { val }))} />
            </Field>
            <Field label="Règle affichée">
              <EditableText label="Règle affichée" allowEmpty value={step.rule ?? ""} onCommit={(rule) => edit((s) => updateEtape(s, step.id, { rule }))} />
            </Field>
          </div>
          <ReglesEditor step={step} edit={edit} />
          {step.domaines.map((d, i) => (
            <DomaineEditor key={d.id} d={d} brevets={brevets} edit={edit} first={i === 0} last={i === step.domaines.length - 1} />
          ))}
          <AddInput placeholder={brevets ? "Nouvelle série de brevets" : "Nouveau domaine"} onAdd={(name) => edit((s) => addDomaine(s, step.id, name, `${step.id}.d${shortId()}`))} />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

function DomaineEditor({ d, brevets, edit, first, last }: { d: Domaine; brevets: boolean; edit: Edit; first: boolean; last: boolean }) {
  const actives = d.preuves.filter((p) => !p.archive).length;
  const unit = brevets ? ["brevet", "brevets"] : ["preuve", "preuves"];
  const patch = (pt: Parameters<typeof updateDomaine>[2]) => edit((s) => updateDomaine(s, d.id, pt));
  return (
    <details className={cx("border-l-4 border-ligne pl-3", d.archive && "text-crayon")}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 py-1.5">
        <span className="flex min-w-0 flex-col">
          <span className={cx("text-[16px] font-semibold", d.archive && "line-through")}>{d.name}</span>
          <span className="font-mono text-[13px] text-crayon">
            {actives} {actives > 1 ? unit[1] : unit[0]}
            {d.min ? ` · ${d.min} au choix` : ""}
            {d.archive ? " · archivé" : d.obligatoire ? " · obligatoire" : " · au choix"}
          </span>
        </span>
        <MoveButtons name={d.name} first={first} last={last} onMove={(delta) => edit((s) => moveDomaine(s, d.id, delta))} />
      </summary>
      <div className="flex flex-col gap-2 border-t border-ligne pb-3 pt-2.5">
        <EditableText label={`Nom du domaine ${d.name}`} value={d.name} onCommit={(name) => patch({ name })} />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={d.obligatoire}
            onClick={() => patch({ obligatoire: !d.obligatoire })}
            className={cx(chipClass, d.obligatoire ? "border-encre bg-encre text-fond" : "border-encre bg-transparent text-encre")}
          >
            {d.obligatoire ? "Obligatoire" : "Au choix"}
          </button>
          {!brevets && actives > 1 && (
            <label className="flex items-center gap-1.5 text-[14px] font-semibold">
              À réussir
              <select value={d.min ?? 0} onChange={(e) => patch({ min: Number(e.target.value) })} className="h-11 border-0 border-b-[1.5px] border-encre bg-transparent px-1 text-[15px] text-encre">
                <option value={0}>toutes</option>
                {Array.from({ length: actives - 1 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} sur {actives}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ArchiveButton archived={d.archive} onToggle={() => patch({ archive: !d.archive })} />
        </div>
        <div className="flex flex-col gap-1.5">
          {d.preuves.map((x, i) => (
            <PreuveEditor key={x.id} x={x} edit={edit} first={i === 0} last={i === d.preuves.length - 1} />
          ))}
        </div>
        {!d.archive && <AddInput placeholder={brevets ? "Nouveau brevet" : "Nouvelle preuve"} onAdd={(label) => edit((s) => addPreuve(s, d.id, label, `${d.id}.p${shortId()}`))} />}
      </div>
    </details>
  );
}

function PreuveEditor({ x, edit, first, last }: { x: Preuve; edit: Edit; first: boolean; last: boolean }) {
  return (
    <div className={cx("flex items-center gap-1.5", x.archive && "text-crayon")}>
      <EditableText label={`Libellé : ${x.label}`} value={x.label} onCommit={(label) => edit((s) => updatePreuve(s, x.id, { label }))} className={cx("flex-1", x.archive && "line-through")} />
      <MoveButtons name={x.label} first={first} last={last} onMove={(delta) => edit((s) => movePreuve(s, x.id, delta))} />
      <ArchiveButton archived={x.archive} onToggle={() => edit((s) => updatePreuve(s, x.id, { archive: !x.archive }))} />
    </div>
  );
}

/** Règles de passage de l'étape : vote secret de la cour d'honneur, validation par brevets. */
function ReglesEditor({ step, edit }: { step: Etape; edit: Edit }) {
  const regle = step.regle;
  const setBrevets = (min: number, series: number) => edit((s) => updateEtapeRegles(s, step.id, { brevets: { min, series } }));
  return (
    <div className="flex flex-col gap-2.5 border-[1.5px] border-encre px-3 py-3">
      <span className="text-[15px] font-bold">Règles de passage</span>
      <label className="flex flex-wrap items-center justify-between gap-2 text-[15px]">
        Vote secret de la cour d&apos;honneur
        <select
          value={step.vote ? String(MAJORITES.find((m) => Math.abs(m.value - step.vote!.majorite) < 0.01)?.value ?? step.vote.majorite) : "0"}
          onChange={(e) => edit((s) => updateEtapeRegles(s, step.id, { vote: Number(e.target.value) || null }))}
          className="h-11 border-0 border-b-[1.5px] border-encre bg-transparent px-1 text-[15px] text-encre"
        >
          <option value="0">Pas de vote</option>
          {MAJORITES.map((m) => (
            <option key={m.label} value={String(m.value)}>
              {m.label} des voix
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
        <input
          type="checkbox"
          checked={!!regle}
          onChange={(e) => edit((s) => updateEtapeRegles(s, step.id, { brevets: e.target.checked ? { min: 3, series: 2 } : null }))}
          className="size-5 accent-sentier"
        />
        Étape validée par brevets (chaque domaine est une série)
      </label>
      {regle && (
        <div className="flex flex-wrap items-center gap-2 text-[15px]">
          Au moins
          <input type="number" min={1} max={20} value={regle.min} onChange={(e) => setBrevets(Number(e.target.value), regle.series)} aria-label="Nombre de brevets" className="h-11 w-16 border-0 border-b-[1.5px] border-encre bg-transparent px-1 font-mono text-encre" />
          brevets, dans
          <input type="number" min={1} max={regle.min} value={regle.series} onChange={(e) => setBrevets(regle.min, Number(e.target.value))} aria-label="Nombre de séries" className="h-11 w-16 border-0 border-b-[1.5px] border-encre bg-transparent px-1 font-mono text-encre" />
          séries différentes
        </div>
      )}
    </div>
  );
}

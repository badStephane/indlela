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
const fieldClass = "h-10 min-w-0 rounded-ui border border-line-strong bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink";
const chipClass = "h-8 flex-none rounded-full border px-2.5 text-[12px] font-bold";

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
      <button type="submit" disabled={!text.trim()} className="h-10 flex-none rounded-ui bg-acc px-3.5 text-[13px] font-bold text-acc-ink disabled:bg-track disabled:text-muted">
        Ajouter
      </button>
    </form>
  );
}

function MoveButtons({ name, first, last, onMove }: { name: string; first: boolean; last: boolean; onMove: (delta: number) => void }) {
  const cls = "h-8 w-8 flex-none rounded-ui border border-line bg-surface text-[13px] text-muted disabled:opacity-30";
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
    <button type="button" onClick={onToggle} className={cx(chipClass, archived ? "border-acc text-acc-text" : "border-line-strong text-muted")}>
      {archived ? "Restaurer" : "Archiver"}
    </button>
  );
}

export function EtapeEditor({ step, index, edit, isOpen, onOpen }: { step: Etape; index: number; edit: Edit; isOpen: boolean; onOpen: () => void }) {
  const brevets = step.regle?.kind === "brevets";
  const actifs = step.domaines.filter((d) => !d.archive).length;
  return (
    <div className="flex flex-col border-b border-rule bg-surface">
      <button type="button" aria-expanded={isOpen} onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 bg-transparent px-3.5 py-2 text-left text-inherit">
        <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-acc-soft num text-[13px] font-bold text-acc-text">{index + 1}</span>
        <span className="flex flex-1 flex-col">
          <span className="text-[16px] font-semibold">{step.name}</span>
          <span className="text-[12px] text-muted">
            {actifs} {brevets ? "séries de brevets" : "domaines"}
            {step.rule ? ` · ${step.rule}` : ""}
          </span>
        </span>
        <span className="text-[16px] text-muted">{isOpen ? "▴" : "▾"}</span>
      </button>
      {isOpen && (
        <div className="flex flex-col gap-3 px-3.5 pb-4">
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
    <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
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
    <details className={cx("rounded-ui border border-line", d.archive && "opacity-70")}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-1.5">
        <span className="flex min-w-0 flex-col">
          <span className={cx("text-[14px] font-semibold", d.archive && "line-through")}>{d.name}</span>
          <span className="num text-[11px] text-muted">
            {actives} {actives > 1 ? unit[1] : unit[0]}
            {d.min ? ` · ${d.min} au choix` : ""}
            {d.archive ? " · archivé" : d.obligatoire ? " · obligatoire" : " · au choix"}
          </span>
        </span>
        <MoveButtons name={d.name} first={first} last={last} onMove={(delta) => edit((s) => moveDomaine(s, d.id, delta))} />
      </summary>
      <div className="flex flex-col gap-2 border-t border-line px-3 pb-3 pt-2.5">
        <EditableText label={`Nom du domaine ${d.name}`} value={d.name} onCommit={(name) => patch({ name })} />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={d.obligatoire}
            onClick={() => patch({ obligatoire: !d.obligatoire })}
            className={cx(chipClass, d.obligatoire ? "border-transparent bg-acc-soft text-acc-text" : "border-line-strong text-muted")}
          >
            {d.obligatoire ? "Obligatoire" : "Au choix"}
          </button>
          {!brevets && actives > 1 && (
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
              À réussir
              <select value={d.min ?? 0} onChange={(e) => patch({ min: Number(e.target.value) })} className="h-8 rounded-ui border border-line-strong bg-surface px-1.5 text-[12px] text-ink">
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
    <div className={cx("flex items-center gap-1.5", x.archive && "opacity-60")}>
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
    <div className="flex flex-col gap-2.5 rounded-ui bg-paper px-3 py-2.5">
      <span className="text-[12px] font-semibold text-muted">Règles de passage</span>
      <label className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        Vote secret de la cour d&apos;honneur
        <select
          value={step.vote ? String(MAJORITES.find((m) => Math.abs(m.value - step.vote!.majorite) < 0.01)?.value ?? step.vote.majorite) : "0"}
          onChange={(e) => edit((s) => updateEtapeRegles(s, step.id, { vote: Number(e.target.value) || null }))}
          className="h-9 rounded-ui border border-line-strong bg-surface px-2 text-[13px] text-ink"
        >
          <option value="0">Pas de vote</option>
          {MAJORITES.map((m) => (
            <option key={m.label} value={String(m.value)}>
              {m.label} des voix
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-9 items-center gap-2.5 text-[13px]">
        <input
          type="checkbox"
          checked={!!regle}
          onChange={(e) => edit((s) => updateEtapeRegles(s, step.id, { brevets: e.target.checked ? { min: 3, series: 2 } : null }))}
          className="h-4 w-4 accent-[var(--acc)]"
        />
        Étape validée par brevets (chaque domaine est une série)
      </label>
      {regle && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          Au moins
          <input type="number" min={1} max={20} value={regle.min} onChange={(e) => setBrevets(Number(e.target.value), regle.series)} aria-label="Nombre de brevets" className="h-9 w-16 rounded-ui border border-line-strong bg-surface px-2 text-ink" />
          brevets, dans
          <input type="number" min={1} max={regle.min} value={regle.series} onChange={(e) => setBrevets(regle.min, Number(e.target.value))} aria-label="Nombre de séries" className="h-9 w-16 rounded-ui border border-line-strong bg-surface px-2 text-ink" />
          séries différentes
        </div>
      )}
    </div>
  );
}

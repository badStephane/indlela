"use client";

import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cx, rowClass } from "@/components/ui";
import { canValidate } from "@/lib/access";
import { useJeuneRoute } from "@/lib/useJeune";
import { useBack } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { ceremonies, CURRENT_CADRE, fullName, type Validation } from "@/lib/mock";
import { critStatus, isValidated, plural, progressOf } from "@/lib/progress";
import type { PreuveUnite } from "@/lib/effective";
import { fmtDayMonth, fmtShort, toISODate } from "@/lib/dates";

/** Preuves cochées, avec la façon dont le jeune les a réussies. */
type Selection = Record<string, string>;

interface Groupe {
  id: string;
  name: string;
  consigne?: string;
  preuves: PreuveUnite[];
}

export default function Valider() {
  const { ok, j } = useJeuneRoute(canValidate);
  const store = useStore();
  const [sel, setSel] = useState<Selection>({});
  const [date, setDate] = useState(() => toISODate(new Date()));
  const submitted = useRef(false);
  const back = useBack(j ? `/jeunes/${j.id}` : "/unite");
  if (!ok) return null;

  const { vals, offline, steps } = store;
  const p = progressOf(j, steps, vals);
  if (!p.step) return null;

  const open = (x: PreuveUnite) => !x.archive && !isValidated(critStatus(vals, j.id, x.id));
  const auProgramme: Groupe[] = p.domaines
    .map((d) => ({ id: d.domaine.id, name: d.domaine.name, consigne: d.domaine.min && !p.brevets ? `${d.domaine.min} au choix` : undefined, preuves: d.preuves.filter(open) }))
    .filter((g) => g.preuves.length);
  const dansProgramme = new Set(p.domaines.flatMap((d) => d.preuves.map((x) => x.id)));
  const autres: Groupe[] = p.step.domaines
    .filter((d) => !d.retire && !d.archive)
    .map((d) => ({ id: d.id, name: d.name, preuves: d.preuves.filter((x) => !x.archive && open(x) && !dansProgramme.has(x.id)) }))
    .filter((g) => g.preuves.length && (p.brevets || !p.domaines.some((x) => x.domaine.id === g.id)));

  const ids = Object.keys(sel);
  const n = ids.length;
  const today = toISODate(new Date());
  const toggle = (id: string) => setSel((s) => (id in s ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== id)) : { ...s, [id]: "" }));
  const toggleAll = (g: Groupe) => {
    const allOn = g.preuves.every((x) => x.id in sel);
    setSel((s) => (allOn ? Object.fromEntries(Object.entries(s).filter(([k]) => !g.preuves.some((x) => x.id === k))) : { ...Object.fromEntries(g.preuves.map((x) => [x.id, ""])), ...s }));
  };
  const setComment = (id: string, text: string) => setSel((s) => ({ ...s, [id]: text }));

  const confirm = () => {
    if (submitted.current || !n) return;
    submitted.current = true;
    store.validate(j, ids.map((preuveId) => ({ preuveId, commentaire: sel[preuveId].trim() })), date > today ? today : date);
    back();
  };

  // L'étape serait-elle complète avec cette saisie ?
  const simulated: Validation[] = ids.map((preuveId) => ({ id: preuveId, jeuneId: j.id, etapeId: j.etapeId, domaineId: "", preuveId, date, validePar: "", pending: false, annuleeLe: null, updatedAt: "" }));
  const completes = n > 0 && !p.complete && progressOf(j, steps, [...vals, ...simulated]).complete;
  const unit = p.brevets ? ["brevet", "brevets"] : ["preuve", "preuves"];

  return (
    <AppShell
      kicker={`Valider · ${fullName(j)}`}
      title={p.step.name}
      back={`/jeunes/${j.id}`}
      branch={j.branche}
      banner
      foot={{
        label: n ? `Valider ${n} ${plural(n, unit[0], unit[1])}` : `Cochez au moins une ${unit[0]}`,
        disabled: !n,
        onClick: confirm,
        note: offline ? "Sans réseau, la validation attend sur le téléphone." : undefined,
      }}
    >
      <div className="flex flex-col gap-4 p-4">
        <span className="text-[14px] text-muted">
          {p.brevets
            ? `${p.brevets.obtenus} ${plural(p.brevets.obtenus, "brevet obtenu", "brevets obtenus")} sur 3, dans ${p.brevets.series} ${plural(p.brevets.series, "série", "séries")} sur 2`
            : `${p.done} ${plural(p.done, "preuve réussie", "preuves réussies")} sur ${p.total} · étape ${p.step.name}`}
        </span>
        {!auProgramme.length && !autres.length ? (
          <div className="rounded-card border border-dashed border-line-strong p-5 text-[15px] text-muted">Toutes les preuves de cette étape sont déjà validées.</div>
        ) : (
          <>
            {auProgramme.map((g) => (
              <GroupeBloc key={g.id} g={g} sel={sel} vals={vals} jeuneId={j.id} onToggle={toggle} onToggleAll={() => toggleAll(g)} onComment={setComment} />
            ))}
            {autres.length > 0 && (
              <details className="rounded-card border border-dashed border-line-strong px-3.5 py-2">
                <summary className="min-h-10 cursor-pointer py-2 text-[14px] font-bold text-muted">{p.brevets ? "Autres brevets" : "Autres domaines au choix"}</summary>
                <div className="flex flex-col gap-3 pb-2">
                  {autres.map((g) => (
                    <GroupeBloc key={g.id} g={g} sel={sel} vals={vals} jeuneId={j.id} onToggle={toggle} onComment={setComment} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
        {completes && (
          <div className="rounded-ui bg-acc-soft px-3.5 py-3 text-[14px] font-semibold text-acc-text text-pretty">
            Avec cette validation, l&apos;étape {p.step.name} est réussie. Elle sera proposée à la cour d&apos;honneur du {fmtDayMonth(ceremonies().courHonneur, true)}.
          </div>
        )}
        <label className="flex items-center justify-between gap-3 text-[13px] font-semibold">
          Réussie le
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
            className="h-11 rounded-ui border border-line-strong bg-surface px-3 text-[15px] font-normal text-ink outline-none focus:border-ink"
          />
        </label>
        <span className="font-mono text-[13px] text-muted">Validé par {CURRENT_CADRE.full}</span>
      </div>
    </AppShell>
  );
}

interface GroupeBlocProps {
  g: Groupe;
  sel: Selection;
  vals: Validation[];
  jeuneId: string;
  onToggle: (id: string) => void;
  onToggleAll?: () => void;
  onComment: (id: string, text: string) => void;
}

function GroupeBloc({ g, sel, vals, jeuneId, onToggle, onToggleAll, onComment }: GroupeBlocProps) {
  const allOn = g.preuves.every((x) => x.id in sel);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          {g.name}
          {g.consigne ? ` · ${g.consigne}` : ""}
        </span>
        {onToggleAll && g.preuves.length > 1 && !g.consigne && (
          <button type="button" onClick={onToggleAll} className="h-8 bg-transparent px-1 text-[13px] font-bold text-acc-text">
            {allOn ? "Tout décocher" : "Tout cocher"}
          </button>
        )}
      </div>
      <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface [&>*:last-child]:border-b-0">
        {g.preuves.map((x) => {
          const on = x.id in sel;
          const r = critStatus(vals, jeuneId, x.id);
          return (
            <div key={x.id} className={cx("flex flex-col border-b border-rule", on ? "bg-acc-soft" : "bg-surface")}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(x.id)} className={cx(rowClass, "min-h-[56px] gap-3.5 border-b-0 bg-transparent py-2")}>
                <span
                  aria-hidden
                  className={cx(
                    "flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-[16px] font-extrabold text-acc-ink",
                    on ? "border-acc bg-acc" : "border-line-strong bg-transparent",
                  )}
                >
                  {on ? "✓" : ""}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-pretty">{x.label}</span>
                  {r.st === "cancelled" && <span className="font-mono text-[12px] text-err-ink">Annulée le {fmtShort(r.v.annuleeLe!)}</span>}
                </span>
              </button>
              {on && (
                <label className="flex flex-col gap-1 px-3.5 pb-3 pl-[56px] text-[12px] font-semibold text-acc-text">
                  Comment l&apos;a-t-il réussie ? (facultatif)
                  <input
                    value={sel[x.id]}
                    onChange={(e) => onComment(x.id, e.target.value)}
                    placeholder="Ex. au camp de Toubab Dialaw, devant le CP"
                    maxLength={280}
                    className="h-11 rounded-ui border border-line-strong bg-surface px-3 text-[15px] font-normal text-ink outline-none focus:border-ink"
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

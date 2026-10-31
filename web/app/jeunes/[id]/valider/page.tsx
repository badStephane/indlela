"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cx, List, rowClass } from "@/components/ui";
import { canValidate } from "@/lib/access";
import { useJeuneRoute } from "@/lib/useJeune";
import { useBack } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { ceremonies, CURRENT_CADRE, fullName } from "@/lib/mock";
import { critStatus, currentStep, doneCount, plural } from "@/lib/progress";
import { fmtDayMonth, fmtFull, fmtShort } from "@/lib/dates";

export default function Valider() {
  const { ok, j } = useJeuneRoute(canValidate);
  const store = useStore();
  const [sel, setSel] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  const back = useBack(j ? `/jeunes/${j.id}` : "/unite");
  if (!ok) return null;

  const { vals, offline } = store;
  const step = currentStep(j);
  const tot = step.crit.length;
  const d = doneCount(vals, j);
  const items = step.crit
    .map((label, i) => ({ label, i, r: critStatus(vals, j, i), opt: (step.opt ?? []).includes(i) }))
    .filter((x) => x.r.st === "todo" || x.r.st === "cancelled");
  const n = sel.length;
  const toggle = (i: number) => setSel((s) => (s.includes(i) ? s.filter((y) => y !== i) : [...s, i]));

  const confirm = () => {
    store.validate(j, sel, comment.trim());
    back();
  };

  return (
    <AppShell
      kicker={`Valider · ${fullName(j)}`}
      title={step.name}
      back={`/jeunes/${j.id}`}
      branch={j.branche}
      banner
      foot={{
        label: n ? `Valider ${n} ${plural(n, "critère", "critères")}` : "Cochez au moins un critère",
        disabled: !n,
        onClick: confirm,
        note: offline ? "Sans réseau, la validation attend sur le téléphone." : undefined,
      }}
    >
      <div className="flex flex-col gap-4 p-4">
        <span className="text-[14px] text-muted">
          {d} {plural(d, "critère", "critères")} sur {tot} déjà {plural(d, "validé", "validés")} · étape {step.name}
        </span>
        {!items.length ? (
          <div className="rounded-card border border-dashed border-line-strong p-5 text-[15px] text-muted">Tous les critères de cette étape sont déjà validés.</div>
        ) : (
          <List>
            {items.map((x) => {
              const on = sel.includes(x.i);
              const sub = x.r.st === "cancelled" ? `Annulée le ${fmtShort(x.r.v.annuleeLe!)}` : x.opt ? "Optionnel" : "";
              return (
                <button
                  key={x.i}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(x.i)}
                  className={cx(rowClass, "min-h-[60px] gap-3.5 py-2", on && "bg-acc-soft")}
                >
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
                    <span className="text-[16px] font-semibold">{x.label}</span>
                    {sub && <span className={cx("font-mono text-[12px]", x.r.st === "cancelled" ? "text-err-ink" : "text-muted")}>{sub}</span>}
                  </span>
                </button>
              );
            })}
          </List>
        )}
        {n > 0 && d + n >= tot && (
          <div className="rounded-ui bg-acc-soft px-3.5 py-3 text-[14px] font-semibold text-acc-text text-pretty">
            Avec cette validation, tous les critères de l&apos;étape {step.name} sont remplis. L&apos;étape sera proposée à la cour d&apos;honneur du{" "}
            {fmtDayMonth(ceremonies().courHonneur, true)}.
          </div>
        )}
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Commentaire (facultatif)
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Ex. épreuve faite au camp de Toubab Dialaw"
            className="resize-none rounded-ui border border-line-strong bg-surface px-3 py-2.5 text-[15px] font-normal text-ink outline-none focus:border-ink"
          />
        </label>
        <span className="font-mono text-[13px] text-muted">
          Le {fmtFull(new Date())} · par {store.role === "cadre" ? CURRENT_CADRE.full : store.userName}
        </span>
      </div>
    </AppShell>
  );
}

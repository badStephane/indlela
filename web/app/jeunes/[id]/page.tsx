"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Bar, Card, cx, List, OutlineButton, rowClass, Section, SectionLabel } from "@/components/ui";
import { canValidate } from "@/lib/access";
import { useJeuneRoute } from "@/lib/useJeune";
import { useStore } from "@/lib/store";
import { BRANCHES } from "@/lib/referentiels";
import { ceremonies, dateRemise, fullName, historiqueUnites } from "@/lib/mock";
import { critStatus, currentStep, doneCount, pct } from "@/lib/progress";
import { fmtDayMonth, fmtShort, fmtWhen } from "@/lib/dates";

export default function Fiche() {
  const { ok, j, home } = useJeuneRoute();
  const store = useStore();
  const router = useRouter();
  if (!ok) return null;

  const { vals, role } = store;
  const cadre = canValidate(role);
  const B = BRANCHES[j.branche];
  const step = currentStep(j);
  const tot = step.crit.length;
  const d = doneCount(vals, j);

  return (
    <AppShell
      kicker={B.unit}
      title={fullName(j)}
      back={home}
      branch={j.branche}
      banner
      foot={cadre ? { label: "Valider des critères", onClick: () => router.push(`/jeunes/${j.id}/valider`) } : undefined}
    >
      <div className="flex flex-col gap-[22px] px-4 pb-6 pt-[18px]">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] text-muted">
            {j.age} ans · {B.unit}
          </span>
          {!cadre && (
            <span className="mt-1.5 self-start rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold text-muted">Lecture seule</span>
          )}
        </div>

        {/* Le chemin : étapes franchies, soleil sur l'étape en cours. */}
        <ol className="m-0 flex list-none flex-col p-0" aria-label="Étapes">
          {B.steps.map((s, k) => {
            const done = k < j.etape;
            const cur = k === j.etape;
            const last = k === B.steps.length - 1;
            const dotColor = done ? "var(--acc)" : cur ? "#F2B400" : undefined;
            return (
              <li key={s.name} className="flex gap-3.5" aria-current={cur ? "step" : undefined}>
                <div className="flex w-[22px] flex-none flex-col items-center">
                  <span
                    className={cx("mt-[3px] flex-none rounded-full border-[3px]", !dotColor && "border-line-strong")}
                    style={{ width: cur ? 20 : 14, height: cur ? 20 : 14, background: dotColor ?? "transparent", borderColor: dotColor }}
                  />
                  <span
                    className="min-h-4 w-0 flex-1 border-l-[3px]"
                    style={{ borderLeftStyle: done ? "solid" : "dashed", borderLeftColor: last ? "transparent" : done ? "var(--acc)" : "var(--color-line-strong)" }}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-px pb-3.5">
                  <span className={cx(cur ? "text-[18px] font-extrabold" : "text-[15px] font-medium", k > j.etape ? "text-muted" : "text-ink")}>{s.name}</span>
                  <span className="font-mono text-[12px] text-muted">
                    {done ? `Remise le ${fmtShort(dateRemise(j, k), true)}` : cur ? `En cours · ${d}/${tot}` : "À venir"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <Card className="flex flex-col gap-2.5 p-4">
          <SectionLabel>Étape en cours</SectionLabel>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[22px] font-extrabold tracking-[-0.01em]">{step.name}</span>
            <span className="font-mono text-[14px] font-semibold text-acc-text">
              {d} / {tot}
            </span>
          </div>
          <Bar value={pct(d, tot)} height={8} />
          {step.rule && <span className="text-[13px] text-ink">Règle : {step.rule}</span>}
          <span className="text-[13px] text-muted text-pretty">Validation de l&apos;étape : {step.val}</span>
          {d === tot && (
            <span className="rounded-ui bg-acc-soft px-2.5 py-2 text-[13px] font-semibold text-acc-text">
              Critères remplis · à présenter à la cour d&apos;honneur du {fmtDayMonth(ceremonies().courHonneur)}
            </span>
          )}
        </Card>

        <Section label={`Critères · ${step.name}`}>
          <List>
            {step.crit.map((label, i) => {
              const r = critStatus(vals, j, i);
              const opt = (step.opt ?? []).includes(i);
              const checked = r.st === "done" || r.st === "pending";
              const pend = r.st === "pending";
              const tappable = checked && cadre;
              let meta = opt ? "Optionnel · à valider" : "À valider";
              let metaCls = "text-muted";
              if (checked) {
                meta = pend ? "Aujourd'hui · en attente de réseau" : `${fmtWhen(r.v.date)} · ${r.v.validePar}`;
                metaCls = pend ? "text-wait-text" : "text-muted";
              } else if (r.st === "cancelled") {
                meta = `Annulée le ${fmtShort(r.v.annuleeLe!)} · à revalider`;
                metaCls = "text-err-ink";
              }
              return (
                <button
                  key={label}
                  type="button"
                  disabled={!tappable}
                  onClick={tappable ? () => store.openCancelSheet(r.v.id) : undefined}
                  className={`${rowClass} min-h-14 gap-3 py-2 disabled:opacity-100`}
                >
                  <span
                    className={cx(
                      "flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 text-[14px] font-extrabold",
                      !checked && "border-line-strong bg-transparent",
                      pend && "border-wait-dot bg-wait-bg text-wait-ink",
                      checked && !pend && "border-acc bg-acc text-acc-ink",
                    )}
                    aria-hidden
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cx("text-[15px] font-medium", r.st === "cancelled" ? "text-muted" : "text-ink")}>{label}</span>
                    <span className={cx("font-mono text-[12px]", metaCls)}>{meta}</span>
                  </span>
                  {tappable && <span className="text-[18px] text-muted" aria-label="Annuler cette validation">⋯</span>}
                </button>
              );
            })}
          </List>
        </Section>

        <Section label="Spécialités et badges">
          {j.specs.length ? (
            <div className="flex flex-wrap gap-2">
              {j.specs.map((sp) => (
                <div key={sp.name} className="flex flex-col gap-0.5 rounded-full border border-line bg-surface px-3 py-2">
                  <span className="text-[14px] font-semibold">{sp.name}</span>
                  <span className="font-mono text-[12px] text-muted">{sp.meta}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[14px] text-muted">Aucune spécialité ni badge pour l&apos;instant.</span>
          )}
        </Section>

        <Section label="Historique des unités">
          <div className="flex flex-col">
            {historiqueUnites(j).map((h) => (
              <div key={h.unit} className="flex justify-between gap-3 border-b border-line py-1.5 text-[14px]">
                <span>{h.unit}</span>
                <span className="font-mono text-[12px] text-muted">{h.period}</span>
              </div>
            ))}
          </div>
        </Section>

        <OutlineButton onClick={() => router.push(`/jeunes/${j.id}/carnet`)} className="h-12 bg-surface text-[15px]">
          Voir le carnet PDF
        </OutlineButton>
      </div>
    </AppShell>
  );
}

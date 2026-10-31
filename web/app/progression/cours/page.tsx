"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Chip, List, rowClass, Section } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES, BRANCH_COLORS, type BranchCode } from "@/lib/referentiels";
import { ceremonies, fullName } from "@/lib/mock";
import { fmtDayMonth, fmtShort } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";
import { ajournes, decisionsRecentes, pretsAPresenter } from "@/lib/suivi";

// Cours d'honneur de toutes les unités : qui présenter, quelles étapes ajournées suivre,
// et les dernières décisions. Chaque ligne mène à la saisie de la décision.

const ORDER: BranchCode[] = ["meute", "troupe", "route"];
const NB_DECISIONS = 10;

export default function CoursHonneur() {
  const ok = useGuard((r) => r === "progression");
  const store = useStore();
  const router = useRouter();
  const { jeunes, vals, recons, steps } = store;

  useEffect(() => {
    if (ok) store.setLastTab("/progression/cours");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const prets = pretsAPresenter(jeunes, steps, vals, recons);
  const suivis = ajournes(jeunes, recons);
  const recentes = decisionsRecentes(recons, NB_DECISIONS);
  const unites = ORDER.filter((b) => steps[b].length > 0);
  const etapeName = (b: BranchCode, id: string) => steps[b].find((s) => s.id === id)?.name ?? id;
  const chipStyle = (b: BranchCode) => ({ background: BRANCH_COLORS[b].soft, color: BRANCH_COLORS[b].accText });

  return (
    <AppShell kicker={store.groupeNom} title="Cours d'honneur">
      <div className="flex flex-col gap-[22px] p-4 lg:mx-auto lg:w-full lg:max-w-[760px]">
        <p className="m-0 text-[14px] text-muted text-pretty">
          Prochaine cour d&apos;honneur le {fmtDayMonth(ceremonies().courHonneur, true)}. Un jeune apparaît ici dès que son étape est complète ; touchez son nom pour
          enregistrer la décision.
        </p>

        {unites.map((b) => {
          const list = prets.filter((x) => x.j.branche === b);
          return (
            <Section key={b} label={`${BRANCHES[b].unit} · à présenter`} gap="gap-2.5">
              {list.length ? (
                <List>
                  {list.map(({ j, p }) => (
                    <button key={j.id} type="button" onClick={() => router.push(jeuneHref(j.id, "cour"))} className={`${rowClass} min-h-14 justify-between gap-3 py-2`}>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[15px] font-semibold">{fullName(j)}</span>
                        <span className="text-[12px] text-muted">Étape complète · décision à saisir</span>
                      </span>
                      <Chip style={chipStyle(b)}>{p.step?.name}</Chip>
                    </button>
                  ))}
                </List>
              ) : (
                <span className="text-[14px] text-muted">Aucune étape complète pour l&apos;instant.</span>
              )}
            </Section>
          );
        })}

        <Section label="Étapes ajournées à suivre" gap="gap-2.5">
          {suivis.length ? (
            <List>
              {suivis.map(({ j, le }) => (
                <button key={j.id} type="button" onClick={() => router.push(jeuneHref(j.id, "cour"))} className={`${rowClass} min-h-14 justify-between gap-3 py-2`}>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-semibold">{fullName(j)}</span>
                    <span className="text-[12px] text-muted">
                      {BRANCHES[j.branche].unit} · ajournée le {fmtShort(le, true)}
                    </span>
                  </span>
                  <Chip style={chipStyle(j.branche)}>{etapeName(j.branche, j.etapeId)}</Chip>
                </button>
              ))}
            </List>
          ) : (
            <span className="text-[14px] text-muted">Aucune étape ajournée en attente.</span>
          )}
        </Section>

        <Section label="Décisions récentes" gap="gap-2.5">
          {recentes.length ? (
            <List>
              {recentes.map((r) => {
                const j = store.findJeune(r.jeuneId);
                if (!j) return null;
                return (
                  <button key={r.id} type="button" onClick={() => router.push(jeuneHref(j.id))} className={`${rowClass} min-h-14 justify-between gap-3 py-2`}>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[15px] font-semibold">{fullName(j)}</span>
                      <span className="text-[12px] text-muted">
                        {etapeName(j.branche, r.etapeId)} · {fmtShort(r.date, true)}
                        {r.pending ? " · en attente de réseau" : ""}
                      </span>
                    </span>
                    <Chip className={r.decision === "reconnue" ? "bg-ok-bg text-ok-ink" : "bg-wait-bg text-wait-ink"}>{r.decision === "reconnue" ? "Reconnue" : "Ajournée"}</Chip>
                  </button>
                );
              })}
            </List>
          ) : (
            <span className="text-[14px] text-muted">Aucune décision enregistrée cette année.</span>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

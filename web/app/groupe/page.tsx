"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, Chip, cx, List, mix, OutlineButton, rowClass, SEG_SHADES, Section, Segments, type Seg } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES, BRANCH_COLORS, type BranchCode } from "@/lib/referentiels";
import { ceremonies, fullName, GROUP_OTHER_UNITS, GROUPE, TROUPE } from "@/lib/mock";
import { currentStep, doneCount, isStepComplete, lastValidationDays } from "@/lib/progress";
import { fmtDayMonth } from "@/lib/dates";

const segsOf = (b: BranchCode, counts: number[]): Seg[] =>
  BRANCHES[b].steps.map((s, k) => ({ label: s.name, count: counts[k], color: mix(BRANCH_COLORS[b].acc, SEG_SHADES[k]) }));

export default function Groupe() {
  const ok = useGuard((r) => r === "groupe");
  const store = useStore();
  const router = useRouter();
  const { vals, offline } = store;

  useEffect(() => {
    if (ok) store.setLastTab("/groupe");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const M = GROUP_OTHER_UNITS.meute;
  const R = GROUP_OTHER_UNITS.route;
  const { courHonneur, remiseMeute } = ceremonies();
  const troupeCounts = BRANCHES.troupe.steps.map((_, k) => TROUPE.filter((j) => j.etape === k).length);
  const stale = TROUPE.filter((j) => lastValidationDays(vals, j) >= 30);
  const award = TROUPE.filter((j) => isStepComplete(vals, j));

  const kpis = [
    { v: TROUPE.length + M.effectif + R.effectif, l: "jeunes dans 3 unités" },
    { v: award.length + GROUP_OTHER_UNITS.aRemettre.length, l: "étapes à remettre en novembre" },
    { v: stale.length + M.sansValidation, l: "sans validation depuis 30 jours" },
  ];

  const units = [
    {
      code: "meute" as const,
      eff: `${M.effectif} jeunes · ${M.cadres} cadres`,
      segs: segsOf("meute", M.parEtape),
      recent: `${M.valideesCeMois} sur ${M.effectif} validés ce mois`,
      stale: `${M.sansValidation} sans validation`,
      staleOn: true,
      cta: "Ouvrir la meute",
      onOpen: () => store.showToast("Module meute : ouverture prévue en V2 (mars 2027)"),
    },
    {
      code: "troupe" as const,
      eff: `${TROUPE.length} jeunes · 3 cadres`,
      segs: segsOf("troupe", troupeCounts),
      recent: `${TROUPE.length - stale.length} sur ${TROUPE.length} validés ce mois`,
      stale: stale.length ? `${stale.length} sans validation` : "À jour",
      staleOn: stale.length > 0,
      cta: "Ouvrir la troupe",
      onOpen: () => router.push("/unite"),
    },
  ];

  const exportCsv = () => {
    if (offline) return store.showToast("Export impossible hors connexion : il se fait depuis le serveur.");
    const rows = [["unite", "prenom", "nom", "age", "etape", "criteres_valides", "criteres_total"]];
    for (const j of TROUPE) {
      const s = currentStep(j);
      rows.push([BRANCHES.troupe.unit, j.prenom, j.nom, String(j.age), s.name, String(doneCount(vals, j)), String(s.crit.length)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "groupe-grand-dakar-listes.csv";
    a.click();
    URL.revokeObjectURL(url);
    store.showToast("groupe-grand-dakar-listes.csv exporté");
  };

  return (
    <AppShell kicker={GROUPE} title="Vue groupe">
      <div className="flex flex-col gap-[22px] p-4">
        <div className="grid grid-cols-3 gap-2.5 rounded-card border border-line bg-forest px-4 py-[18px] text-white">
          {kpis.map((k) => (
            <div key={k.l} className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[34px] font-extrabold leading-[0.9] tracking-[-0.03em]">{k.v}</span>
              <span className="text-[12px] leading-[1.25] text-forest-muted text-pretty">{k.l}</span>
            </div>
          ))}
        </div>

        <Section label="Unités du groupe" gap="gap-2.5">
          {units.map((u) => (
            <Card key={u.code} className="flex flex-col overflow-hidden">
              <div className="h-1" style={{ background: BRANCH_COLORS[u.code].acc }} />
              <div className="flex flex-col gap-3 px-4 pb-4 pt-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[18px] font-extrabold">{BRANCHES[u.code].unit}</span>
                  <span className="font-mono text-[12px] text-muted">{u.eff}</span>
                </div>
                <Segments segs={u.segs} barHeight={10} labelClass="text-muted" />
                <div className="flex justify-between gap-2 text-[13px]">
                  <span className="text-muted">{u.recent}</span>
                  <span className={cx("font-bold", u.staleOn ? "text-stale-strong" : "text-muted")}>{u.stale}</span>
                </div>
                <OutlineButton onClick={u.onOpen} className="h-11 bg-transparent text-[14px] font-bold">
                  {u.cta}
                </OutlineButton>
              </div>
            </Card>
          ))}
          <Card className="flex flex-col overflow-hidden">
            <div className="h-1" style={{ background: BRANCH_COLORS.route.acc }} />
            <div className="flex flex-col gap-3 px-4 pb-4 pt-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[18px] font-extrabold">{BRANCHES.route.unit}</span>
                <span className="font-mono text-[12px] text-muted">
                  {R.effectif} jeunes · {R.cadres} cadres
                </span>
              </div>
              <span className="text-[14px] text-muted text-pretty">Module route prévu en V2. Le référentiel officiel de la branche est encore attendu.</span>
            </div>
          </Card>
        </Section>

        <Section label="À remettre · cérémonies de novembre" gap="gap-2.5">
          <List>
            {award.map((j) => (
              <button key={j.id} type="button" onClick={() => router.push(`/jeunes/${j.id}`)} className={`${rowClass} min-h-14 justify-between gap-3 py-2`}>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">{fullName(j)}</span>
                  <span className="text-[12px] text-muted">Troupe · cour d&apos;honneur du {fmtDayMonth(courHonneur)}</span>
                </span>
                <Chip style={{ background: BRANCH_COLORS.troupe.soft, color: BRANCH_COLORS.troupe.accText }}>{currentStep(j).name}</Chip>
              </button>
            ))}
            {GROUP_OTHER_UNITS.aRemettre.map((m) => (
              <div key={m.name} className={`${rowClass} min-h-14 justify-between gap-3 py-2`}>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">{m.name}</span>
                  <span className="text-[12px] text-muted">Meute · remise des insignes le {fmtDayMonth(remiseMeute)}</span>
                </span>
                <Chip style={{ background: BRANCH_COLORS.meute.soft, color: BRANCH_COLORS.meute.accText }}>{m.step}</Chip>
              </div>
            ))}
          </List>
        </Section>

        <OutlineButton onClick={exportCsv} className="h-12 bg-surface text-[15px] font-bold">
          Exporter les listes du groupe (CSV)
        </OutlineButton>
      </div>
    </AppShell>
  );
}

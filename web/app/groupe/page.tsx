"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, Chip, cx, List, OutlineButton, rowClass, Section } from "@/components/ui";
import { SentierEffectif } from "@/components/Sentier";
import { useGuard } from "@/lib/access";
import { useStore, useTroupe } from "@/lib/store";
import { BRANCHES, BRANCH_COLORS, type BranchCode } from "@/lib/referentiels";
import { ageOf, ceremonies, fullName, GROUP_OTHER_UNITS } from "@/lib/mock";
import { lastValidationDays, progressOf } from "@/lib/progress";
import { fmtDayMonth, LONG_MONTHS, fromISODate } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";
import { slug, telechargerExcel } from "@/lib/excel";

const segsOf = (b: BranchCode, counts: number[]) => BRANCHES[b].steps.map((s, k) => ({ label: s.name, count: counts[k] }));

export default function Groupe() {
  const ok = useGuard((r) => r === "groupe");
  const store = useStore();
  const router = useRouter();
  const troupe = useTroupe();
  const { vals, offline, steps } = store;

  useEffect(() => {
    if (ok) store.setLastTab("/groupe");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const M = GROUP_OTHER_UNITS.meute;
  const R = GROUP_OTHER_UNITS.route;
  const { courHonneur, remiseMeute } = ceremonies();
  const rows = troupe.map((j) => ({ j, p: progressOf(j, steps, vals) }));
  const troupeCounts = steps.troupe.map((_, k) => rows.filter((r) => r.p.index === k).length);
  const stale = troupe.filter((j) => lastValidationDays(vals, j) >= 30);
  const award = rows.filter((r) => r.p.complete);
  // Mois des prochaines cérémonies (celle de la meute suit celle de la troupe).
  const moisCeremonies = LONG_MONTHS[fromISODate(courHonneur).getMonth()];

  const kpis = [
    { v: troupe.length + M.effectif + R.effectif, l: "jeunes dans 3 unités" },
    { v: award.length + GROUP_OTHER_UNITS.aRemettre.length, l: `étapes à remettre en ${moisCeremonies}` },
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
      eff: `${troupe.length} jeunes · ${store.comptes.filter((c) => c.role === "cadre" && c.actif && c.unites.includes("troupe")).length} cadres`,
      segs: segsOf("troupe", troupeCounts),
      recent: `${troupe.length - stale.length} sur ${troupe.length} validés ce mois`,
      stale: stale.length ? `${stale.length} sans validation` : "À jour",
      staleOn: stale.length > 0,
      cta: "Ouvrir la troupe",
      onOpen: () => router.push("/unite"),
    },
  ];

  const exportListes = () => {
    if (offline) return store.showToast("Export impossible hors connexion : il se fait depuis le serveur.");
    const name = `${slug(store.groupeNom)}-listes.xlsx`;
    const lines = rows.map(({ j, p }) => [store.unitesNoms.troupe, j.prenom, j.nom, ageOf(j), p.step?.name, p.done, p.total]);
    telechargerExcel(name, [{ nom: "Listes", lignes: [["Unité", "Prénom", "Nom", "Âge", "Étape", "Preuves validées", "Preuves de l'étape"], ...lines], largeurs: [20, 16, 16, 6, 14, 10, 10] }])
      .then(() => {
        store.log({ action: "export", table: "jeunes", ligne: name, resume: `Export ${name} (${lines.length} lignes)`, apres: { fichier: name, lignes: lines.length } });
        store.showToast(`${name} exporté`);
      })
      .catch(() => store.showToast("L'export a échoué. Réessayez."));
  };

  return (
    <AppShell kicker={store.groupeNom} title="Vue groupe">
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
                  <span className="text-[18px] font-extrabold">{store.unitesNoms[u.code]}</span>
                  <span className="num text-[12px] text-muted">{u.eff}</span>
                </div>
                <SentierEffectif etapes={u.segs} accent={BRANCH_COLORS[u.code].acc} />
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
                <span className="text-[18px] font-extrabold">{store.unitesNoms.route}</span>
                <span className="num text-[12px] text-muted">
                  {R.effectif} jeunes · {R.cadres} cadres
                </span>
              </div>
              <span className="text-[14px] text-muted text-pretty">Module route prévu en V2. Le référentiel officiel de la branche est encore attendu.</span>
            </div>
          </Card>
        </Section>

        <Section label={`À remettre · cérémonies de ${moisCeremonies}`} gap="gap-2.5">
          <List>
            {award.map(({ j, p }) => (
              <button key={j.id} type="button" onClick={() => router.push(jeuneHref(j.id))} className={`${rowClass} min-h-14 justify-between gap-3 py-2`}>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">{fullName(j)}</span>
                  <span className="text-[12px] text-muted">Troupe · cour d&apos;honneur du {fmtDayMonth(courHonneur)}</span>
                </span>
                <Chip style={{ background: BRANCH_COLORS.troupe.soft, color: BRANCH_COLORS.troupe.accText }}>{p.step?.name}</Chip>
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

        <OutlineButton onClick={exportListes} className="h-12 bg-surface text-[15px] font-bold">
          Exporter les listes du groupe (Excel)
        </OutlineButton>
      </div>
    </AppShell>
  );
}

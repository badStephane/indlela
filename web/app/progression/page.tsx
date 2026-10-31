"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RapportCard } from "@/components/progression/RapportCard";
import { Bar, Card, cx, List, mix, rowClass, SEG_SHADES, Section, Segments } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES, BRANCH_COLORS, type BranchCode } from "@/lib/referentiels";
import { fullName, type Jeune } from "@/lib/mock";
import { pct, plural, progressOf } from "@/lib/progress";
import { jeuneHref } from "@/lib/routes";
import {
  cadresInactifs,
  estActif,
  jeunesARelancer,
  parEtape,
  pretsAPresenter,
  sansConsentement,
  SEUIL_CADRE_JOURS,
  SEUIL_JEUNE_JOURS,
  type JeuneARelancer,
} from "@/lib/suivi";

// Tableau de bord du responsable progression : chaque unité du groupe, avec de vraies
// données, puis qui relancer (jeunes, cadres, consentements manquants).

const ORDER: BranchCode[] = ["meute", "troupe", "route"];

export default function Progression() {
  const ok = useGuard((r) => r === "progression");
  const store = useStore();
  const { jeunes, vals, recons, steps, comptes } = store;

  useEffect(() => {
    if (ok) store.setLastTab("/progression");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const actifs = jeunes.filter(estActif);
  const relances = jeunesARelancer(jeunes, vals);
  const prets = pretsAPresenter(jeunes, steps, vals, recons);
  const cadres = cadresInactifs(comptes);
  const attente = sansConsentement(jeunes);
  const nbUnites = ORDER.filter((b) => actifs.some((j) => j.branche === b)).length;

  const kpis = [
    { v: actifs.length, l: `jeunes dans ${nbUnites} ${plural(nbUnites, "unité", "unités")}` },
    { v: prets.length, l: plural(prets.length, "étape à présenter", "étapes à présenter") },
    { v: relances.length, l: `sans validation depuis ${SEUIL_JEUNE_JOURS} jours` },
  ];

  return (
    <AppShell kicker={store.groupeNom} title="Progression du groupe">
      <div className="flex flex-col gap-[22px] p-4 lg:mx-auto lg:w-full lg:max-w-[960px]">
        <div className="grid grid-cols-3 gap-2.5 rounded-card border border-line bg-forest px-4 py-[18px] text-white">
          {kpis.map((k) => (
            <div key={k.l} className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[34px] font-extrabold leading-[0.9] tracking-[-0.03em]">{k.v}</span>
              <span className="text-[12px] leading-[1.25] text-forest-muted text-pretty">{k.l}</span>
            </div>
          ))}
        </div>

        <Section label="Unités du groupe" gap="gap-2.5">
          <div className="grid gap-2.5 lg:grid-cols-3">
            {ORDER.map((b) => (
              <UniteCard key={b} branche={b} relances={relances} />
            ))}
          </div>
        </Section>

        <Section label="Rapport d'évolution" gap="gap-2.5">
          <RapportCard />
        </Section>

        <Section label={`Jeunes sans validation depuis ${SEUIL_JEUNE_JOURS} jours`} gap="gap-2.5">
          {relances.length ? (
            <JeunesARelancer list={relances} />
          ) : (
            <span className="text-[14px] text-muted">Chaque jeune a eu une validation ce mois-ci.</span>
          )}
        </Section>

        <Section label={`Cadres sans connexion depuis ${SEUIL_CADRE_JOURS / 7} semaines`} gap="gap-2.5">
          {cadres.length ? (
            <List>
              {cadres.map(({ compte, jours }) => (
                <div key={compte.id} className={`${rowClass} min-h-[52px] justify-between gap-3 py-2`}>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-semibold">{compte.nom}</span>
                    <span className="text-[12px] text-muted">{compte.unites.map((u) => BRANCHES[u as BranchCode]?.unit ?? u).join(", ") || "Aucune unité"}</span>
                  </span>
                  <span className="flex-none font-mono text-[13px] font-semibold text-stale">{jours === null ? "Jamais connecté" : `${jours} jours`}</span>
                </div>
              ))}
            </List>
          ) : (
            <span className="text-[14px] text-muted">Tous les cadres se sont connectés récemment.</span>
          )}
        </Section>

        {attente.length > 0 && (
          <Section label="Fiches en attente du consentement des parents" gap="gap-2.5">
            <List>
              {attente.map((j) => (
                <div key={j.id} className={`${rowClass} min-h-[52px] justify-between gap-3 py-2`}>
                  <span className="text-[15px] font-semibold">{fullName(j)}</span>
                  <span className="flex-none text-[12px] text-muted">{BRANCHES[j.branche].unit}</span>
                </div>
              ))}
            </List>
            <span className="text-[13px] text-muted text-pretty">Ces fiches restent inactives tant que l&apos;admin n&apos;a pas enregistré le formulaire signé.</span>
          </Section>
        )}
      </div>
    </AppShell>
  );
}

function UniteCard({ branche, relances }: { branche: BranchCode; relances: JeuneARelancer[] }) {
  const store = useStore();
  const router = useRouter();
  const { jeunes, vals, steps, comptes } = store;
  const B = BRANCHES[branche];
  const color = BRANCH_COLORS[branche].acc;
  const membres = jeunes.filter((j) => j.branche === branche && estActif(j));
  const nbCadres = comptes.filter((c) => c.role === "cadre" && c.actif && c.unites.includes(branche)).length;
  const responsableId = store.unites.find((u) => u.branche === branche)?.responsable;
  const responsable = comptes.find((c) => c.id === responsableId)?.nom;
  const enRetard = relances.filter((x) => x.j.branche === branche).length;
  const counts = parEtape(jeunes, steps, branche);
  const segs = steps[branche].map((s, k) => ({ label: s.name, count: counts[k], color: mix(color, SEG_SHADES[k] ?? 100) }));

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="h-1" style={{ background: color }} />
      <div className="flex flex-col gap-3 px-4 pb-4 pt-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span className="whitespace-nowrap text-[18px] font-extrabold">{B.unit}</span>
          <span className="flex-none font-mono text-[12px] text-muted">
            {membres.length} {plural(membres.length, "jeune", "jeunes")} · {nbCadres} {plural(nbCadres, "cadre", "cadres")}
          </span>
        </div>
        <span className="-mt-2 text-[13px] text-muted">{responsable ? `Responsable : ${responsable}` : "Pas de responsable désigné"}</span>
        {!steps[branche].length ? (
          <span className="text-[14px] text-muted text-pretty">Pas encore de référentiel publié pour la branche.</span>
        ) : !membres.length ? (
          <span className="text-[14px] text-muted text-pretty">Aucun jeune actif dans l&apos;unité.</span>
        ) : (
          <>
            <Segments segs={segs} barHeight={10} labelClass="text-muted" />
            <div className="flex justify-between gap-2 text-[13px]">
              <span className="text-muted">
                {membres.length - enRetard} sur {membres.length} à jour
              </span>
              <span className={cx("font-bold", enRetard ? "text-stale-strong" : "text-muted")}>{enRetard ? `${enRetard} à relancer` : "À jour"}</span>
            </div>
            <details className="rounded-ui border border-line">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[14px] font-bold">
                Voir les jeunes <span className="text-muted">▾</span>
              </summary>
              <div className="flex flex-col border-t border-line">
                {membres.map((j) => (
                  <JeuneLigne key={j.id} j={j} onOpen={() => router.push(jeuneHref(j.id))} progress={progressOf(j, steps, vals)} color={color} />
                ))}
              </div>
            </details>
          </>
        )}
      </div>
    </Card>
  );
}

function JeuneLigne({ j, progress, color, onOpen }: { j: Jeune; progress: ReturnType<typeof progressOf>; color: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex min-h-12 w-full items-center gap-3 border-b border-rule bg-transparent px-3 py-1.5 text-left text-inherit last:border-b-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-semibold">{fullName(j)}</span>
        <span className="text-[12px] text-muted">
          {progress.step?.name} · {progress.done}/{progress.total}
        </span>
      </span>
      <Bar value={pct(progress.done, progress.total)} color={color} className="w-16 flex-none" />
    </button>
  );
}

function JeunesARelancer({ list }: { list: JeuneARelancer[] }) {
  const router = useRouter();
  const { steps } = useStore();
  return (
    <List>
      {list.map(({ j, jours }) => (
        <button key={j.id} type="button" onClick={() => router.push(jeuneHref(j.id))} className={`${rowClass} min-h-[52px] justify-between gap-3 py-2`}>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold">{fullName(j)}</span>
            <span className="text-[12px] text-muted">
              {BRANCHES[j.branche].unit} · {steps[j.branche].find((s) => s.id === j.etapeId)?.name}
            </span>
          </span>
          <span className="flex-none font-mono text-[13px] font-semibold text-stale">{jours === null ? "Jamais" : `${jours} jours`}</span>
        </button>
      ))}
    </List>
  );
}

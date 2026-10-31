"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { List, OutlineButton, rowClass } from "@/components/ui";
import { SentierEffectif, SentierJeune } from "@/components/Sentier";
import { canValidate, useGuard } from "@/lib/access";
import { useStore, useTroupe, useTroupeSansConsentement } from "@/lib/store";
import { ceremonies, fullName } from "@/lib/mock";
import { hasPending, plural, progressOf } from "@/lib/progress";
import { fmtDayMonth, fmtMeeting } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";

export default function Unite() {
  const ok = useGuard((r) => r === "cadre" || r === "groupe");
  const store = useStore();
  const router = useRouter();
  const troupe = useTroupe();
  const enAttente = useTroupeSansConsentement();
  const { vals, role, steps } = store;

  useEffect(() => {
    if (ok && role === "cadre") store.setLastTab("/unite");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, role]);

  if (!ok) return null;

  const rows = troupe.map((j) => ({ j, p: progressOf(j, steps, vals) }));
  const award = rows.filter((r) => r.p.complete).length;
  const etapes = steps.troupe.map((s, k) => ({ label: s.name, count: rows.filter((r) => r.p.index === k).length }));
  const canAdd = canValidate(role);
  const addJeunes = () => router.push("/unite/ajouter");

  return (
    <AppShell kicker={store.groupeNom} title={store.unitesNoms.troupe} back={role === "groupe" ? "/groupe" : undefined} banner wide>
      <div className="flex flex-col gap-3 p-4 lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
        <span className="text-[14px] text-muted">Réunion du {fmtMeeting(new Date())}</span>

        {enAttente.length > 0 && (
          <div className="rounded-ui bg-wait-bg px-3.5 py-2.5 text-[13px] text-wait-ink text-pretty">
            {enAttente.length > 1 ? `${enAttente.length} fiches attendent` : "1 fiche attend"} le consentement des parents ({enAttente.map((j) => j.prenom).join(", ")}).{" "}
            {enAttente.length > 1 ? "Elles apparaîtront" : "Elle apparaîtra"} ici dès que l&apos;admin l&apos;aura enregistré.
          </div>
        )}

        {troupe.length > 0 && (
          <div className="flex flex-col gap-5 rounded-card bg-forest px-4 pb-4 pt-[18px] text-white">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[17px] font-bold">
                <span className="num">{troupe.length}</span> {plural(troupe.length, "jeune", "jeunes")} sur le chemin
              </span>
            </div>
            <SentierEffectif etapes={etapes} tone="sombre" />
            {award > 0 && (
              <span className="flex items-center gap-2 rounded-ui bg-white/10 px-3 py-2 text-[13px] text-pretty">
                <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-sun" />
                <span>
                  <span className="num font-bold">{award}</span> {plural(award, "étape à remettre", "étapes à remettre")} à la cour d&apos;honneur du{" "}
                  {fmtDayMonth(ceremonies().courHonneur)}
                </span>
              </span>
            )}
          </div>
        )}
        </div>

        {troupe.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line-strong px-5 py-7">
            <span className="text-[17px] font-bold">Aucun jeune dans cette unité</span>
            <span className="text-[14px] text-muted text-pretty">
              Ajoutez vos jeunes un par un, ou collez la liste de l&apos;unité (un prénom et un nom par ligne). Vous indiquerez ensuite l&apos;étape de chacun.
            </span>
            {canAdd && (
              <button type="button" onClick={addJeunes} className="h-11 rounded-ui bg-acc px-4 text-[15px] font-bold text-acc-ink">
                Ajouter les jeunes de l&apos;unité
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <List>
              {rows.map(({ j, p }) => (
                <button key={j.id} type="button" onClick={() => router.push(jeuneHref(j.id))} className={`${rowClass} min-h-[66px] gap-3 py-2.5`}>
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[16px] font-semibold">{fullName(j)}</span>
                      <span className="flex-none text-[13px] text-muted">
                        {p.step?.name} <span className="num font-semibold text-ink">{p.done}/{p.total}</span>
                      </span>
                    </span>
                    <SentierJeune
                      total={p.steps.length}
                      index={p.index}
                      part={p.total ? p.done / p.total : 0}
                      label={`${p.step?.name ?? ""}, ${p.done} sur ${p.total}`}
                    />
                  </span>
                  {hasPending(vals, j) && <span title="En attente de synchronisation" aria-label="En attente de synchronisation" className="h-2.5 w-2.5 flex-none rounded-full bg-wait-dot" />}
                </button>
              ))}
            </List>
            {canAdd && (
              <OutlineButton onClick={addJeunes} className="h-12 bg-surface text-[15px]">
                Ajouter des jeunes
              </OutlineButton>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

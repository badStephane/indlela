"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Bar, List, mix, OutlineButton, rowClass, SEG_SHADES, Segments } from "@/components/ui";
import { canValidate, useGuard } from "@/lib/access";
import { useStore, useTroupe, useTroupeSansConsentement } from "@/lib/store";
import { ceremonies, fullName, GROUPE } from "@/lib/mock";
import { hasPending, pct, plural, progressOf } from "@/lib/progress";
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
  const segs = steps.troupe.map((s, k) => ({ label: s.name, count: rows.filter((r) => r.p.index === k).length, color: mix("#F2B400", SEG_SHADES[k]) }));
  const canAdd = canValidate(role);
  const addJeunes = () => router.push("/unite/ajouter");

  return (
    <AppShell kicker={GROUPE} title="Troupe Saint-Paul" back={role === "groupe" ? "/groupe" : undefined} banner>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
          <span>Réunion du {fmtMeeting(new Date())}</span>
          <span className="font-mono">
            {troupe.length} {plural(troupe.length, "jeune", "jeunes")}
          </span>
        </div>

        {enAttente.length > 0 && (
          <div className="rounded-ui bg-wait-bg px-3.5 py-2.5 text-[13px] text-wait-ink text-pretty">
            {enAttente.length > 1 ? `${enAttente.length} fiches attendent` : "1 fiche attend"} le consentement des parents ({enAttente.map((j) => j.prenom).join(", ")}).{" "}
            {enAttente.length > 1 ? "Elles apparaîtront" : "Elle apparaîtra"} ici dès que l&apos;admin l&apos;aura enregistré.
          </div>
        )}

        {troupe.length > 0 && (
          <div className="flex flex-col gap-4 rounded-card border border-line bg-forest px-4 pb-4 pt-[18px] text-white">
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[60px] font-extrabold leading-[0.85] tracking-[-0.04em]">{troupe.length}</span>
                <span className="text-[13px] text-forest-muted">jeunes sur le chemin</span>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-[30px] font-extrabold leading-[0.9]">{award}</span>
                <span className="text-[12px] text-forest-muted">étapes à remettre le {fmtDayMonth(ceremonies().courHonneur)}</span>
              </div>
            </div>
            <Segments segs={segs} barHeight={12} labelClass="text-forest-muted" />
          </div>
        )}

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
          <>
            <List>
              {rows.map(({ j, p }) => (
                <button key={j.id} type="button" onClick={() => router.push(jeuneHref(j.id))} className={`${rowClass} min-h-[66px] gap-3 py-2.5`}>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-acc-soft text-[14px] font-bold text-acc-text">
                    {j.prenom[0] + j.nom[0]}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[16px] font-semibold">{fullName(j)}</span>
                      <span className="flex-none font-mono text-[12px] text-muted">
                        {p.done}/{p.total}
                      </span>
                    </span>
                    <span className="flex items-center gap-2.5">
                      <span className="w-[76px] flex-none text-[13px] text-muted">{p.step?.name}</span>
                      <Bar value={pct(p.done, p.total)} className="flex-1" />
                    </span>
                  </span>
                  {hasPending(vals, j) && <span title="En attente de synchronisation" aria-label="En attente de synchronisation" className="h-2.5 w-2.5 flex-none rounded-full bg-wait-dot" />}
                </button>
              ))}
            </List>
            {canAdd && (
              <OutlineButton onClick={addJeunes} className="h-12 bg-surface text-[15px]">
                + Ajouter des jeunes
              </OutlineButton>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

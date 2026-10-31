"use client";

import { AppShell } from "@/components/AppShell";
import { useJeuneRoute } from "@/lib/useJeune";
import { useStore } from "@/lib/store";
import { BRANCHES, BRANCH_COLORS } from "@/lib/referentiels";
import { dateRemise, fullName, GROUPE } from "@/lib/mock";
import { progressOf } from "@/lib/progress";
import { preuveLabel } from "@/lib/effective";
import { dateReconnue, historique } from "@/lib/courHonneur";
import { fmtFull, fmtShort } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";

// Aperçu du carnet. En production, le PDF est généré par le serveur (même rendu
// sur tous les téléphones) ; ici, « Télécharger » passe par l'impression du navigateur.
export default function Carnet() {
  const { ok, j } = useJeuneRoute();
  const store = useStore();
  if (!ok) return null;

  const { vals, offline, steps } = store;
  const B = BRANCHES[j.branche];
  const p = progressOf(j, steps, vals);
  const order = p.step?.domaines.flatMap((d) => d.preuves.map((x) => x.id)) ?? [];
  const live = vals
    .filter((v) => v.jeuneId === j.id && v.etapeId === p.step?.id && !v.annuleeLe)
    .sort((a, b) => order.indexOf(a.preuveId) - order.indexOf(b.preuveId));
  const name = fullName(j);

  return (
    <AppShell
      kicker="Carnet PDF"
      title={name}
      back={jeuneHref(j.id)}
      branch={j.branche}
      foot={{
        label: offline ? "Téléchargement indisponible" : "Télécharger le PDF",
        disabled: offline,
        onClick: () => {
          const prev = document.title;
          document.title = `carnet-${j.prenom.toLowerCase()}-${j.nom.toLowerCase()}`;
          window.print();
          document.title = prev;
        },
      }}
    >
      <div className="flex min-h-full flex-col gap-3.5 bg-desk p-4">
        <article
          className="print-sheet flex flex-col gap-3.5 bg-white px-5 py-[22px] text-[#1F1D19] shadow-[0_1px_3px_rgba(0,0,0,.12),0_8px_24px_rgba(0,0,0,.06)]"
          style={{ fontFamily: "var(--font-plex), var(--font-sans)" }}
        >
          <div className="flex items-center justify-between pb-2.5" style={{ borderBottom: `2px solid ${BRANCH_COLORS[j.branche].acc}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Indlela" className="h-[18px] w-auto" />
            <span className="font-mono text-[11px] text-[#6B665C]">{B.name.toUpperCase()}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[#6B665C]">Carnet de progression</span>
            <span className="text-[20px] font-bold">{name}</span>
            <span className="text-[12px] text-[#6B665C]">
              {B.unit} · {GROUPE}
            </span>
          </div>
          <div className="flex flex-col">
            {p.steps.map((s, k) => (
              <div key={s.name} className="flex justify-between gap-2 border-b border-[#EEEAE1] py-1.5 text-[12px]">
                <span className="font-semibold">{s.name}</span>
                <span className="font-mono text-[11px] text-[#6B665C]">
                  {k < p.index ? remiseLabel(dateReconnue(store.recons, j.id, s.id) ?? dateRemise(j, k, p.index)) : k === p.index ? `en cours · ${p.done}/${p.total}` : "—"}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[#6B665C]">{p.brevets ? "Brevets obtenus" : "Preuves réussies"} · {p.step?.name}</span>
            {live.map((v) => (
              <div key={v.id} className="flex flex-col text-[12px]">
                <div className="flex justify-between gap-2">
                  <span>✓ {preuveLabel(p.steps, v.etapeId, v.preuveId)}</span>
                  <span className="font-mono text-[11px] text-[#6B665C]">
                    {v.pending ? "en attente · " : ""}
                    {fmtShort(v.date)}
                  </span>
                </div>
                {v.commentaire && <span className="pl-3.5 text-[11px] text-[#6B665C]">{v.commentaire}</span>}
              </div>
            ))}
          </div>
          {historique(store.recons, j.id).some((r) => r.observations) && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#6B665C]">Observations de la cour d&apos;honneur</span>
              {historique(store.recons, j.id)
                .filter((r) => r.observations)
                .map((r) => (
                  <div key={r.id} className="flex flex-col text-[12px]">
                    <span>{r.observations}</span>
                    <span className="font-mono text-[11px] text-[#6B665C]">
                      {p.steps.find((x) => x.id === r.etapeId)?.name} · {fmtShort(r.date, true)} · {r.ct}
                    </span>
                  </div>
                ))}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[#6B665C]">Spécialités et badges</span>
            <span className="text-[12px]">{j.specs.length ? j.specs.map((s) => `${s.name} (${s.meta})`).join(" ; ") : "Aucune pour l'instant"}</span>
          </div>
          <span className="border-t border-[#EEEAE1] pt-2 font-mono text-[10px] text-[#6B665C]">Généré le {fmtFull(new Date())} · page 1 / 1</span>
        </article>
        {offline && (
          <div className="no-print rounded-ui bg-err-bg px-3 py-2.5 text-[14px] text-err-ink text-pretty">
            Le carnet est généré par le serveur. Retrouvez du réseau pour le télécharger.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function remiseLabel(iso: string | null): string {
  return iso ? `remise le ${fmtShort(iso, true)}` : "franchie";
}

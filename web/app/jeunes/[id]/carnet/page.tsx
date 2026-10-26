"use client";

import { AppShell } from "@/components/AppShell";
import { useJeuneRoute } from "@/lib/useJeune";
import { useStore } from "@/lib/store";
import { BRANCHES, BRANCH_COLORS } from "@/lib/referentiels";
import { dateRemise, fullName, GROUPE } from "@/lib/mock";
import { currentStep, doneCount } from "@/lib/progress";
import { fmtFull, fmtShort } from "@/lib/dates";

// Aperçu du carnet. En production, le PDF est généré par le serveur (même rendu
// sur tous les téléphones) ; ici, « Télécharger » passe par l'impression du navigateur.
export default function Carnet() {
  const { ok, j } = useJeuneRoute();
  const store = useStore();
  if (!ok) return null;

  const { vals, offline } = store;
  const B = BRANCHES[j.branche];
  const step = currentStep(j);
  const tot = step.crit.length;
  const d = doneCount(vals, j);
  const live = vals.filter((v) => v.jeuneId === j.id && v.etape === j.etape && !v.annuleeLe).sort((a, b) => a.critere - b.critere);
  const name = fullName(j);

  return (
    <AppShell
      kicker="Carnet PDF"
      title={name}
      back={`/jeunes/${j.id}`}
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
            {B.steps.map((s, k) => (
              <div key={s.name} className="flex justify-between gap-2 border-b border-[#EEEAE1] py-1.5 text-[12px]">
                <span className="font-semibold">{s.name}</span>
                <span className="font-mono text-[11px] text-[#6B665C]">
                  {k < j.etape ? `remise le ${fmtShort(dateRemise(j, k), true)}` : k === j.etape ? `en cours · ${d}/${tot}` : "—"}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[#6B665C]">Critères validés · {step.name}</span>
            {live.map((v) => (
              <div key={v.id} className="flex justify-between gap-2 text-[12px]">
                <span>✓ {step.crit[v.critere]}</span>
                <span className="font-mono text-[11px] text-[#6B665C]">
                  {v.pending ? "en attente · " : ""}
                  {fmtShort(v.date)}
                </span>
              </div>
            ))}
          </div>
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

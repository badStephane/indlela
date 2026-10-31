// Le sentier : les étapes d'une branche dessinées comme un chemin, le même vocabulaire que
// sur la fiche du jeune. Étapes franchies en vert plein, étape en cours marquée du soleil,
// étapes à venir en pointillé.

import { cx } from "./ui";

const POINTILLE = "repeating-linear-gradient(90deg, var(--color-line-strong) 0 4px, transparent 4px 8px)";

interface SentierJeuneProps {
  /** Nombre d'étapes de la branche. */
  total: number;
  /** Étape en cours (à partir de 0). */
  index: number;
  /** Avancement dans l'étape en cours, de 0 à 1. */
  part: number;
  label: string;
  /** Couleur de la branche, quand l'écran n'est pas déjà à ses couleurs. */
  accent?: string;
  className?: string;
}

/** Où en est un jeune sur le chemin de sa branche, et son avancement dans l'étape en cours. */
export function SentierJeune({ total, index, part, label, accent = "var(--acc)", className }: SentierJeuneProps) {
  const fill = `${Math.round(Math.min(Math.max(part, 0), 1) * 100)}%`;
  return (
    <span role="img" aria-label={label} className={cx("flex items-center", className)}>
      {Array.from({ length: total }, (_, k) => {
        const passe = k < index;
        const ici = k === index;
        return (
          <span key={k} className="flex min-w-0 flex-1 items-center">
            <span
              className={cx(
                "flex-none rounded-full",
                passe && "h-2 w-2",
                ici && "h-3 w-3 bg-sun ring-[3px] ring-sun/25",
                !passe && !ici && "h-2 w-2 border-[1.5px] border-line-strong bg-surface",
              )}
              style={passe ? { background: accent } : undefined}
            />
            <span className="relative mx-1 h-[3px] flex-1 overflow-hidden rounded-full" style={passe ? undefined : { background: POINTILLE }}>
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: passe ? "100%" : ici ? fill : "0%", background: accent }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

interface Etape {
  label: string;
  count: number;
}

interface SentierEffectifProps {
  etapes: Etape[];
  /** « sombre » sur le vert forêt, « clair » sur une carte. */
  tone?: "sombre" | "clair";
  accent?: string;
}

/** Combien de jeunes se tiennent à chaque étape du chemin. */
export function SentierEffectif({ etapes, tone = "clair", accent = "var(--acc)" }: SentierEffectifProps) {
  const n = etapes.length;
  if (!n) return null;
  const sombre = tone === "sombre";
  const bord = `${50 / n}%`;
  return (
    <div className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span aria-hidden className={cx("absolute top-[38px] h-[2px]", sombre ? "bg-white/25" : "bg-line-strong")} style={{ left: bord, right: bord }} />
      {etapes.map((e) => {
        const vide = e.count === 0;
        return (
          <div key={e.label} className="relative flex min-w-0 flex-col items-center gap-1.5 px-0.5 text-center">
            <span className={cx("num h-[26px] text-[26px] font-extrabold leading-none", vide && (sombre ? "text-white/40" : "text-muted"))}>{e.count}</span>
            <span
              aria-hidden
              className={cx("my-[3px] h-3 w-3 rounded-full", vide ? (sombre ? "border-2 border-white/40 bg-forest" : "border-2 border-line-strong bg-surface") : "")}
              style={vide ? undefined : { background: sombre ? "#fff" : accent, boxShadow: `0 0 0 3px ${sombre ? "rgba(255,255,255,.2)" : "var(--acc-soft)"}` }}
            />
            <span className={cx("w-full text-[12px] leading-tight [overflow-wrap:anywhere]", sombre ? "text-forest-muted" : "text-muted")}>{e.label}</span>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { BRANCHES, BRANCH_COLORS, type BranchCode } from "@/lib/referentiels";
import { useStore, useSheetTarget, type Role } from "@/lib/store";
import { useBack } from "@/lib/nav";
import { fmtWhen } from "@/lib/dates";
import { plural } from "@/lib/progress";
import { cx } from "./ui";

const TABS: Record<Role, [string, string][]> = {
  cadre: [
    ["/unite", "Unité"],
    ["/unite/tableau-de-bord", "Tableau de bord"],
  ],
  groupe: [["/groupe", "Vue groupe"]],
  parent: [["/famille", "Famille"]],
  admin: [["/admin/referentiels", "Référentiels"]],
};

export interface FootAction {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  note?: string;
}

export function accentVars(branch: BranchCode): CSSProperties {
  const c = BRANCH_COLORS[branch];
  return { "--acc": c.acc, "--acc-text": c.accText, "--acc-ink": c.accInk, "--acc-soft": c.soft } as CSSProperties;
}

/** Colonne d'application, pleine hauteur sur téléphone, centrée sur grand écran. */
export function Frame({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className="print-root min-h-dvh sm:py-6">
      <div
        className={cx(
          "relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-paper sm:h-[min(860px,calc(100dvh-48px))] sm:rounded-[34px] sm:shadow-[0_2px_8px_rgba(0,0,0,.06),0_24px_60px_rgba(27,35,30,.14)]",
          className,
        )}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}

export function AppShell({
  kicker,
  title,
  back,
  branch = "troupe",
  banner = false,
  foot,
  children,
}: {
  kicker: string;
  title: string;
  /** Écran parent quand on arrive par un lien direct ; absent = pas de bouton retour. */
  back?: string;
  branch?: BranchCode;
  banner?: boolean;
  foot?: FootAction;
  children: ReactNode;
}) {
  const store = useStore();
  const router = useRouter();
  const goBack = useBack(back ?? "/");
  const { offline, syncErr, pending, role, lastTab, toast } = store;

  const sync = offline
    ? { label: pending ? `Hors ligne · ${pending}` : "Hors ligne", cls: "bg-wait-bg text-wait-ink", dot: "bg-wait-dot" }
    : syncErr
      ? { label: "Échec · Réessayer", cls: "bg-err-bg text-err-ink", dot: "bg-err-dot" }
      : { label: "En ligne", cls: "bg-ok-bg text-ok-ink", dot: "bg-ok-dot" };

  const bannerText = pending
    ? `Hors connexion · ${pending} ${plural(pending, "validation", "validations")} en attente. Elles partiront au retour du réseau.`
    : "Hors connexion. Vos validations restent sur le téléphone et partiront au retour du réseau.";

  const tabs = role ? TABS[role] : [];

  return (
    <Frame style={accentVars(branch)}>
      <header className="no-print flex min-h-[62px] flex-none items-center gap-1.5 bg-paper px-3 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] text-ink">
        {back !== undefined && (
          <button type="button" onClick={goBack} aria-label="Retour" className="-ml-1.5 h-11 w-11 flex-none bg-transparent text-[28px] leading-none text-inherit">
            ‹
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col pl-1">
          <span className="truncate text-[12px] text-muted">{kicker}</span>
          <h1 className="truncate text-[19px] font-extrabold tracking-[-0.01em]">{title}</h1>
        </div>
        <button
          type="button"
          onClick={store.tapSync}
          aria-live="polite"
          className={cx("flex h-10 flex-none items-center gap-[7px] rounded-full px-3 text-[12px] font-bold", sync.cls)}
        >
          <span className={cx("h-2 w-2 rounded-full", sync.dot)} />
          {sync.label}
        </button>
      </header>

      {banner && offline && <div className="no-print flex-none bg-wait-bg px-4 py-[9px] text-[13px] text-wait-ink text-pretty">{bannerText}</div>}

      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>

      {foot && (
        <div className="no-print flex flex-none flex-col gap-1.5 border-t border-line bg-surface px-4 pb-3 pt-2.5">
          {foot.note && <span className="text-center text-[12px] text-muted text-pretty">{foot.note}</span>}
          <button
            type="button"
            onClick={foot.disabled ? undefined : foot.onClick}
            aria-disabled={foot.disabled}
            className={cx("h-[52px] rounded-ui text-[16px] font-bold", foot.disabled ? "cursor-default bg-track text-muted" : "bg-acc text-acc-ink")}
          >
            {foot.label}
          </button>
        </div>
      )}

      <nav className="no-print flex flex-none border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        {tabs.map(([href, label]) => {
          const on = lastTab === href;
          return (
            <button
              key={href}
              type="button"
              onClick={() => {
                store.setLastTab(href);
                router.push(href);
              }}
              className={cx("h-[58px] flex-1 border-t-[3px] bg-transparent text-[13px] font-bold", on ? "border-acc text-ink" : "border-transparent text-muted")}
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            store.logout();
            router.replace("/connexion");
          }}
          className="h-[58px] flex-1 border-t-[3px] border-transparent bg-transparent text-[13px] font-bold text-muted"
        >
          Quitter
        </button>
      </nav>

      <CancelSheet />

      {toast && (
        <div
          role="status"
          className="no-print absolute left-3 right-3 z-[6] flex min-h-[52px] items-center gap-2 rounded-ui bg-toast py-1.5 pl-3.5 pr-1.5 text-white shadow-[0_8px_24px_rgba(0,0,0,.25)]"
          style={{ bottom: `calc(${foot ? 150 : 72}px + env(safe-area-inset-bottom))` }}
        >
          <span className="flex-1 text-[14px] text-pretty">{toast.msg}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                const u = toast.undo!;
                store.hideToast();
                u();
              }}
              className="h-10 bg-transparent px-3 text-[14px] font-extrabold text-sun"
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </Frame>
  );
}

function CancelSheet() {
  const store = useStore();
  const target = useSheetTarget();
  if (!target) return null;
  const { v, j } = target;
  const label = BRANCHES[j.branche].steps[v.etape].crit[v.critere];
  const when = fmtWhen(v.date);
  return (
    <div className="no-print absolute inset-0 z-[5] flex items-end bg-[rgba(15,18,16,.45)]" onClick={store.closeSheet}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full flex-col gap-3 rounded-t-sheet bg-surface px-[18px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5"
      >
        <span id="sheet-title" className="text-[19px] font-extrabold">
          Annuler cette validation ?
        </span>
        <div className="flex flex-col gap-0.5 rounded-ui bg-paper px-3 py-2.5">
          <span className="text-[15px] font-semibold">{label}</span>
          <span className="font-mono text-[12px] text-muted">
            {when === "Aujourd'hui" ? when : `Validé le ${when}`} · {v.validePar}
          </span>
        </div>
        <span className="text-[14px] text-muted text-pretty">
          La validation n&apos;est pas effacée : elle reste dans le journal avec la date d&apos;annulation et votre nom. Le critère redevient à valider.
        </span>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button type="button" onClick={store.closeSheet} className="h-[50px] rounded-ui border border-line-strong bg-transparent text-[15px] font-bold text-ink">
            Garder
          </button>
          <button type="button" onClick={() => store.cancelValidation(v.id)} className="h-[50px] rounded-ui bg-danger text-[15px] font-bold text-white">
            Annuler la validation
          </button>
        </div>
      </div>
    </div>
  );
}

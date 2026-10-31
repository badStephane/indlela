"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { BRANCH_COLORS, type BranchCode } from "@/lib/referentiels";
import { useStore, useSheetTarget, type Role } from "@/lib/store";
import { useBack } from "@/lib/nav";
import { fmtWhen } from "@/lib/dates";
import { plural } from "@/lib/progress";
import { cx } from "./ui";
import { ConfirmSheet } from "./ConfirmSheet";
import { Sheet } from "./Sheet";
import { DEMO } from "@/lib/demo";
import { ROLE_LABELS } from "@/lib/admin";

/** Onglet : adresse, nom, et nom court pour la barre du téléphone. */
type Tab = [href: string, label: string, court?: string];

const TABS: Record<Role, Tab[]> = {
  cadre: [
    ["/unite", "Unité"],
    ["/unite/epreuves", "Épreuves"],
    ["/unite/tableau-de-bord", "Tableau de bord", "Suivi"],
  ],
  groupe: [
    ["/groupe", "Vue groupe", "Groupe"],
    ["/groupe/unites", "Unités"],
    ["/admin/donnees", "Données"],
  ],
  progression: [
    ["/progression", "Progression"],
    ["/progression/cours", "Cours d'honneur", "Cours"],
    ["/progression/epreuves", "Épreuves"],
    ["/groupe/unites", "Unités"],
    ["/admin/donnees", "Données"],
  ],
  parent: [["/famille", "Famille"]],
  admin: [
    ["/admin/referentiels", "Référentiels"],
    ["/admin/comptes", "Comptes"],
    ["/admin/journal", "Journal"],
    ["/admin/donnees", "Données"],
  ],
};

const initiales = (nom: string) =>
  nom
    .replace(/^(Cdt|Adj|CG|RP|Admin|Famille)\.?\s+/i, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

function Chevron() {
  return (
    <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

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

/**
 * Colonne d'application, pleine hauteur sur téléphone, centrée sur tablette.
 * `wide` : à partir de 1024 px, l'application occupe tout l'écran (navigation latérale).
 */
export function Frame({ children, style, className, wide = false }: { children: ReactNode; style?: CSSProperties; className?: string; wide?: boolean }) {
  return (
    <div className={cx("print-root min-h-dvh sm:py-6", wide && "lg:py-0")}>
      <div
        className={cx(
          "relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-paper sm:h-[min(860px,calc(100dvh-48px))] sm:rounded-[34px] sm:shadow-[0_2px_8px_rgba(0,0,0,.06),0_24px_60px_rgba(27,35,30,.14)]",
          wide && "lg:h-dvh lg:max-w-none lg:flex-row lg:rounded-none lg:shadow-none",
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
  wide = false,
  children,
}: {
  kicker: string;
  title: string;
  /** Écran parent quand on arrive par un lien direct ; absent = pas de bouton retour. */
  back?: string;
  branch?: BranchCode;
  banner?: boolean;
  foot?: FootAction;
  /** Sur ordinateur, le contenu prend plus de largeur (écrans en deux colonnes). */
  wide?: boolean;
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
  // Cinq onglets tiennent sur 360 px avec leur nom court.
  const tabText = tabs.length >= 4 ? "flex-1 px-0.5 text-[12px]" : "flex-1 text-[13px]";
  const [compte, setCompte] = useState(false);
  const openTab = (href: string) => {
    store.setLastTab(href);
    router.push(href);
  };
  const [confirmQuit, setConfirmQuit] = useState(false);
  const doQuit = () => {
    store.logout();
    router.replace("/connexion");
  };
  // Hors démo, quitter efface le téléphone : on prévient si des saisies attendent encore.
  const quit = () => (!DEMO && pending ? setConfirmQuit(true) : doQuit());
  // Le toast se place au-dessus du pied d'action et de la barre d'onglets (absente sur ordinateur).
  const toastOffsets = {
    "--toast-b": `calc(${foot ? 150 : 72}px + env(safe-area-inset-bottom))`,
    "--toast-b-lg": `${foot ? 92 : 24}px`,
  } as CSSProperties;

  return (
    <Frame wide style={accentVars(branch)}>
      <SideNav tabs={tabs} current={lastTab} onOpen={openTab} onQuit={quit} />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="no-print flex min-h-[62px] flex-none items-center gap-1.5 bg-paper px-3 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] text-ink lg:min-h-[72px] lg:border-b lg:border-line lg:px-6 lg:pb-3 lg:pt-3">
          {back !== undefined && (
            <button type="button" onClick={goBack} aria-label="Retour" className="-ml-2 flex h-11 w-11 flex-none items-center justify-center rounded-full bg-transparent text-inherit hover:bg-track">
              <Chevron />
            </button>
          )}
          <div className="flex min-w-0 flex-1 flex-col pl-1">
            <span className="truncate text-[12px] text-muted">{kicker}</span>
            <h1 className="truncate text-[19px] font-extrabold tracking-[-0.01em] lg:text-[22px]">{title}</h1>
          </div>
          <button
            type="button"
            onClick={store.tapSync}
            aria-live="polite"
            className={cx("flex h-10 flex-none items-center gap-[7px] rounded-full px-3 text-[12px] font-bold", sync.cls)}
          >
            <span className={cx("h-2 w-2 rounded-full", sync.dot)} />
            {/* En ligne, le point suffit sur téléphone : le titre garde la place. */}
            <span className={cx(!offline && !syncErr && "sr-only sm:not-sr-only")}>{sync.label}</span>
          </button>
          {role && (
            <button
              type="button"
              onClick={() => setCompte(true)}
              aria-label={`Compte de ${store.userName}`}
              className="num flex h-10 w-10 flex-none items-center justify-center rounded-full bg-forest text-[13px] font-bold text-white lg:hidden"
            >
              {initiales(store.userName)}
            </button>
          )}
        </header>

        {store.storageErr && (
          <div role="alert" className="no-print flex-none bg-err-bg px-4 py-[9px] text-[13px] font-semibold text-err-ink text-pretty lg:px-6">
            Ce téléphone n&apos;enregistre plus les saisies (mémoire pleine ou navigation privée). Retrouvez du réseau avant de fermer l&apos;application.
          </div>
        )}
        {banner && offline && <div className="no-print flex-none bg-wait-bg px-4 py-[9px] text-[13px] text-wait-ink text-pretty lg:px-6">{bannerText}</div>}

        <main className="min-h-0 flex-1 overflow-y-auto">
          {/* Sur téléphone, le contenu reste l'enfant direct de main ; sur ordinateur, il est centré. */}
          <div className={cx("contents lg:mx-auto lg:block lg:w-full lg:py-4", wide ? "lg:max-w-[1120px] lg:px-2" : "lg:max-w-[760px]")}>{children}</div>
        </main>

        {foot && (
          <div className="no-print flex flex-none border-t border-line bg-surface px-4 pb-3 pt-2.5 lg:px-6">
            <div className={cx("flex w-full flex-col gap-1.5 lg:mx-auto lg:flex-row lg:items-center lg:justify-end lg:gap-4 lg:px-4", wide ? "lg:max-w-[1120px]" : "lg:max-w-[760px]")}>
              {foot.note && <span className="text-center text-[12px] text-muted text-pretty lg:flex-1 lg:text-left lg:text-[13px]">{foot.note}</span>}
              <button
                type="button"
                onClick={foot.disabled ? undefined : foot.onClick}
                aria-disabled={foot.disabled}
                className={cx(
                  "h-[52px] rounded-ui text-[16px] font-bold lg:w-[320px] lg:flex-none",
                  foot.disabled ? "cursor-default bg-track text-muted" : "bg-acc text-acc-ink",
                )}
              >
                {foot.label}
              </button>
            </div>
          </div>
        )}

        <nav aria-label="Navigation" className="no-print flex flex-none border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
          {tabs.map(([href, label, court]) => {
            const on = lastTab === href;
            return (
              <button
                key={href}
                type="button"
                onClick={() => openTab(href)}
                aria-current={on ? "page" : undefined}
                aria-label={court ? label : undefined}
                className={cx("relative h-[58px] min-w-0 truncate bg-transparent font-bold", tabText, on ? "text-ink" : "text-muted")}
              >
                {court ?? label}
                {on && <span aria-hidden className="absolute left-1/2 top-[7px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-sun" />}
              </button>
            );
          })}
        </nav>

        {compte && (
          <Sheet title={store.userName} onClose={() => setCompte(false)}>
            <span className="-mt-2 text-[14px] text-muted">
              {role && ROLE_LABELS[role]} · {store.groupeNom}
            </span>
            <button
              type="button"
              onClick={() => {
                setCompte(false);
                quit();
              }}
              className="h-12 rounded-ui border border-line-strong bg-transparent text-[15px] font-bold text-ink"
            >
              Se déconnecter
            </button>
          </Sheet>
        )}

        <CancelSheet />
        {confirmQuit && (
          <ConfirmSheet
            title="Quitter sans envoyer ?"
            cancelLabel="Rester"
            confirmLabel="Quitter quand même"
            onCancel={() => setConfirmQuit(false)}
            onConfirm={() => {
              setConfirmQuit(false);
              doQuit();
            }}
          >
            <span className="text-[14px] text-muted text-pretty">
              {pending} {plural(pending, "saisie n'a pas encore été envoyée", "saisies n'ont pas encore été envoyées")}. En quittant, elles sont effacées de ce
              téléphone avec le reste du carnet.
            </span>
          </ConfirmSheet>
        )}

        {toast && (
          <div
            role="status"
            className="no-print absolute bottom-[var(--toast-b)] left-3 right-3 z-[6] flex min-h-[52px] items-center gap-2 rounded-ui bg-toast py-1.5 pl-3.5 pr-1.5 text-white shadow-[0_8px_24px_rgba(0,0,0,.25)] lg:bottom-[var(--toast-b-lg)] lg:left-auto lg:right-6 lg:w-[420px]"
            style={toastOffsets}
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
      </div>
    </Frame>
  );
}

/** Navigation latérale, à partir de 1024 px ; remplace la barre d'onglets du bas. */
function SideNav({ tabs, current, onOpen, onQuit }: { tabs: Tab[]; current: string | null; onOpen: (href: string) => void; onQuit: () => void }) {
  const store = useStore();
  return (
    <nav aria-label="Navigation principale" className="no-print hidden w-[252px] flex-none flex-col gap-7 border-r border-line bg-surface px-4 py-6 lg:flex">
      <div className="flex flex-col gap-2 px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Indlela" className="h-[28px] w-auto self-start" />
        <span className="text-[13px] leading-snug text-muted text-pretty">{store.groupeLibelle}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {tabs.map(([href, label]) => {
          const on = current === href;
          return (
            <button
              key={href}
              type="button"
              onClick={() => onOpen(href)}
              aria-current={on ? "page" : undefined}
              className={cx(
                "flex h-11 items-center gap-2.5 rounded-ui px-3 text-left text-[15px] font-bold",
                on ? "bg-acc-soft text-acc-text" : "bg-transparent text-muted hover:bg-paper hover:text-ink",
              )}
            >
              <span aria-hidden className={cx("h-[7px] w-[7px] flex-none rounded-full", on ? "bg-sun" : "bg-transparent")} />
              {label}
            </button>
          );
        })}
      </div>
      {store.role && (
        <div className="mt-auto flex items-center gap-2.5 border-t border-line px-1 pt-4">
          <span className="num flex h-9 w-9 flex-none items-center justify-center rounded-full bg-forest text-[12px] font-bold text-white">{initiales(store.userName)}</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] font-bold">{store.userName}</span>
            <span className="text-[12px] leading-tight text-muted">{ROLE_LABELS[store.role]}</span>
          </span>
          <button type="button" onClick={onQuit} className="h-9 flex-none rounded-ui px-2 text-[13px] font-bold text-muted hover:bg-paper hover:text-ink">
            Quitter
          </button>
        </div>
      )}
    </nav>
  );
}

function CancelSheet() {
  const store = useStore();
  const target = useSheetTarget();
  if (!target) return null;
  const { v, label } = target;
  const when = fmtWhen(v.date);
  return (
    <ConfirmSheet
      title="Annuler cette validation ?"
      cancelLabel="Garder"
      confirmLabel="Annuler la validation"
      onCancel={store.closeSheet}
      onConfirm={() => store.cancelValidation(v.id)}
    >
      <div className="flex flex-col gap-0.5 rounded-ui bg-paper px-3 py-2.5">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="num text-[12px] text-muted">
          {when === "Aujourd'hui" ? when : `Validé le ${when}`} · {v.validePar}
        </span>
      </div>
      <span className="text-[14px] text-muted text-pretty">
        La validation n&apos;est pas effacée : elle reste dans le journal avec la date d&apos;annulation et votre nom. La preuve redevient à réussir.
      </span>
    </ConfirmSheet>
  );
}

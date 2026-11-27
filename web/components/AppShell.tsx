"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { usePhotos } from "@/lib/photosStore";
import { useStore, useSheetTarget, type Role } from "@/lib/store";
import { useBack } from "@/lib/nav";
import { fmtWhen } from "@/lib/dates";
import { plural } from "@/lib/progress";
import { cx } from "./ui";
import { Bandeau, Logo, PastilleSync, type EtatSync } from "./carte";
import { ConfirmSheet } from "./ConfirmSheet";
import { MenuCompte } from "./MenuCompte";
import { DEMO } from "@/lib/demo";
import { ROLE_LABELS } from "@/lib/admin";

/** Onglet : adresse, nom, et nom court pour la barre du téléphone. */
type Tab = [href: string, label: string, court?: string];

const TABS: Record<Role, Tab[]> = {
  cadre: [
    ["/unite", "Unité"],
    ["/unite/tableau-de-bord", "Tableau de bord"],
    ["/unite/epreuves", "Épreuves"],
  ],
  groupe: [
    ["/groupe", "Vue groupe", "Groupe"],
    ["/groupe/unites", "Unités"],
    ["/admin/donnees", "Données"],
  ],
  progression: [
    ["/progression", "Progression du groupe", "Progression"],
    ["/progression/cours", "Cours d'honneur", "Cours"],
    ["/progression/epreuves", "Épreuves"],
    ["/progression/rapport", "Rapport d'évolution", "Rapport"],
    ["/groupe/unites", "Groupe et unités"],
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

/** Onglets de la barre du téléphone ; les écrans suivants passent dans le menu du compte. */
const ONGLETS_TELEPHONE = 4;

/** Nom de l'écran où mène le bouton retour : le nom de son onglet, sinon « Retour ». */
function libelleRetour(href: string | undefined): string {
  const tab = Object.values(TABS)
    .flat()
    .find(([h]) => h === href);
  return tab?.[1] ?? "Retour";
}

export interface FootAction {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  note?: string;
}

/**
 * Colonne d'application, pleine hauteur ; centrée sur tablette.
 * `wide` : à partir de 1024 px, l'application occupe tout l'écran (barre latérale).
 */
export function Frame({ children, style, className, wide = false }: { children: ReactNode; style?: CSSProperties; className?: string; wide?: boolean }) {
  return (
    <div className="print-root min-h-dvh bg-fond-2">
      <div
        className={cx(
          "relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-fond sm:border-x sm:border-ligne",
          wide && "lg:max-w-none lg:flex-row lg:border-x-0",
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
  banner = false,
  foot,
  wide = false,
  aDroite,
  titreDansPage = false,
  retour,
  children,
}: {
  /** Sous-titre, sous le titre de la page. */
  kicker: string;
  title: string;
  /** Écran parent quand on arrive par un lien direct ; absent = pas de bouton retour. */
  back?: string;
  banner?: boolean;
  foot?: FootAction;
  /** Sur ordinateur, le contenu prend plus de largeur (écrans en deux colonnes). */
  wide?: boolean;
  /** Actions courtes à droite de l'en-tête (lien, bouton secondaire). */
  aDroite?: ReactNode;
  /** La page pose elle-même son h1 (cartouche d'un jeune) : l'en-tête ne garde que le retour et les actions. */
  titreDansPage?: boolean;
  /** Libellé du bouton retour quand l'écran parent n'est pas un onglet (« ‹ Fatou Ndiaye »). */
  retour?: string;
  children: ReactNode;
}) {
  const store = useStore();
  const router = useRouter();
  const goBack = useBack(back ?? "/");
  const { offline, syncErr, pending, role, lastTab, toast } = store;
  const photosEnAttente = usePhotos().enAttente;

  const etatSync: EtatSync = offline ? "hors-ligne" : syncErr ? "erreur" : "en-ligne";
  const bannerText = pending
    ? `Hors connexion · ${pending} ${plural(pending, "validation", "validations")} en attente. Elles partiront au retour du réseau.`
    : "Hors connexion. Vos validations restent sur le téléphone et partiront au retour du réseau.";

  const tabs = role ? TABS[role] : [];
  const tabsBas = tabs.slice(0, ONGLETS_TELEPHONE);
  const tabsMenu = tabs.slice(ONGLETS_TELEPHONE);
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
  const quit = () => (!DEMO && (pending || photosEnAttente) ? setConfirmQuit(true) : doQuit());
  // Le toast se place au-dessus du pied d'action et de la barre d'onglets (absente sur ordinateur).
  const toastOffsets = {
    "--toast-b": `calc(${foot ? 160 : 80}px + env(safe-area-inset-bottom))`,
    "--toast-b-lg": `${foot ? 96 : 24}px`,
  } as CSSProperties;
  const largeur = wide ? "lg:max-w-[1120px]" : "lg:max-w-[760px]";

  const actions = (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {aDroite}
        <PastilleSync etat={etatSync} enAttente={pending} onRelancer={store.tapSync} />
      </div>
      {role && (
        <button type="button" onClick={() => setCompte(true)} className="min-h-11 bg-transparent px-1 text-[14px] text-encre underline underline-offset-4 lg:hidden">
          Compte
        </button>
      )}
    </div>
  );

  return (
    <Frame wide>
      <SideNav tabs={tabs} current={lastTab} etatSync={etatSync} onOpen={openTab} onCompte={() => setCompte(true)} />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* L'en-tête défile avec la page : sur téléphone, un titre sur deux lignes ne garde pas un tiers de l'écran. */}
        <main className="min-h-0 flex-1 overflow-y-auto">
        <header className="no-print flex-none px-4 pt-[max(14px,env(safe-area-inset-top))] lg:px-8 lg:pt-6">
          <div className={cx("flex flex-col gap-1 lg:mx-auto lg:w-full", largeur)}>
            {(back !== undefined || titreDansPage) && (
              <div className="flex items-start justify-between gap-3">
                {back !== undefined ? (
                  <button type="button" onClick={goBack} className="-ml-1 flex min-h-11 items-center gap-1.5 bg-transparent px-1 text-[17px] text-encre">
                    <span aria-hidden="true" className="text-[22px] leading-none">‹</span>
                    {retour ?? libelleRetour(back)}
                  </button>
                ) : (
                  <span />
                )}
                {titreDansPage && actions}
              </div>
            )}
            {!titreDansPage && (
              <div className="flex items-start gap-3 border-b-4 border-double border-encre pb-3">
                <div className="min-w-0 flex-1">
                  <h1 className="m-0 text-titre font-extrabold leading-[1.1] tracking-[-0.3px] lg:text-titre-web">{title}</h1>
                  {kicker && <p className="m-0 mt-1 text-[15px] text-crayon">{kicker}</p>}
                </div>
                {actions}
              </div>
            )}
          </div>
        </header>

        {(store.storageErr || (banner && offline)) && (
          <div className="no-print flex flex-none flex-col gap-2 px-4 pt-3 lg:px-8">
            <div className={cx("flex flex-col gap-2 lg:mx-auto lg:w-full", largeur)}>
              {store.storageErr && (
                <Bandeau ton="erreur">
                  Ce téléphone n&apos;enregistre plus les saisies (mémoire pleine ou navigation privée). Retrouvez du réseau avant de fermer l&apos;application.
                </Bandeau>
              )}
              {banner && offline && <Bandeau>{bannerText}</Bandeau>}
            </div>
          </div>
        )}

          {/* Sur téléphone, le contenu reste l'enfant direct de main ; sur ordinateur, il est centré. */}
          <div className={cx("contents lg:mx-auto lg:block lg:w-full lg:px-4 lg:py-4", largeur)}>{children}</div>
        </main>

        {foot && (
          <div className="no-print flex flex-none border-t border-ligne bg-fond px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 lg:px-8">
            <div className={cx("flex w-full flex-col gap-1.5 lg:mx-auto lg:flex-row lg:items-center lg:justify-end lg:gap-4", largeur)}>
              {foot.note && <span className="text-center text-[14px] text-crayon text-pretty lg:flex-1 lg:text-left">{foot.note}</span>}
              <button
                type="button"
                onClick={foot.disabled ? undefined : foot.onClick}
                aria-disabled={foot.disabled}
                className={cx(
                  "h-[54px] w-full text-[17px] font-semibold lg:w-[320px] lg:flex-none",
                  foot.disabled ? "cursor-default bg-ligne text-crayon" : "bg-sentier text-white",
                )}
              >
                {foot.label}
              </button>
            </div>
          </div>
        )}

        {tabsBas.length > 1 && (
          <nav aria-label="Navigation" className="no-print flex flex-none border-t-4 border-double border-encre bg-fond pb-[env(safe-area-inset-bottom)] lg:hidden">
            {tabsBas.map(([href, label, court]) => {
              const on = lastTab === href;
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => openTab(href)}
                  aria-current={on ? "page" : undefined}
                  aria-label={court ? label : undefined}
                  className={cx(
                    "flex min-h-16 min-w-0 flex-1 items-center justify-center px-1 text-center leading-tight",
                    tabsBas.length >= 4 ? "text-[13px]" : "text-[15px]",
                    on ? "bg-encre font-bold text-fond" : "bg-transparent text-encre",
                  )}
                >
                  {court ?? label}
                </button>
              );
            })}
          </nav>
        )}

        {compte && <MenuCompte ecrans={tabsMenu.map(([href, label]) => ({ href, label }))} onOpen={openTab} onClose={() => setCompte(false)} onQuit={quit} />}

        <CancelSheet />
        {confirmQuit && (
          <ConfirmSheet
            title="Des saisies ne sont pas envoyées"
            cancelLabel="Rester connecté"
            confirmLabel="Me déconnecter quand même"
            onCancel={() => setConfirmQuit(false)}
            onConfirm={() => {
              setConfirmQuit(false);
              doQuit();
            }}
          >
            <span className="text-[15px] text-pretty">
              {[
                pending ? `${pending} ${plural(pending, "saisie", "saisies")}` : "",
                photosEnAttente ? `${photosEnAttente} ${plural(photosEnAttente, "photo", "photos")}` : "",
              ]
                .filter(Boolean)
                .join(" et ")}{" "}
              {pending + photosEnAttente > 1 ? "attendent" : "attend"} encore le réseau. Si vous vous déconnectez, tout est effacé de cet appareil avec le reste du
              carnet.
            </span>
          </ConfirmSheet>
        )}

        {toast && (
          <div
            role="status"
            className="no-print absolute bottom-[var(--toast-b)] left-3 right-3 z-[6] flex min-h-[56px] items-center gap-3 bg-encre py-2 pl-4 pr-2 text-fond lg:bottom-[var(--toast-b-lg)] lg:left-auto lg:right-8 lg:w-[440px]"
            style={toastOffsets}
          >
            <span className="flex-1 text-[15px] text-pretty">{toast.msg}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  const u = toast.undo!;
                  store.hideToast();
                  u();
                }}
                className="min-h-11 flex-none border-[1.5px] border-soleil bg-transparent px-3 text-[16px] font-bold text-soleil"
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

const LIBELLES_SYNC: Record<EtatSync, { libelle: string; point: string }> = {
  "en-ligne": { libelle: "En ligne", point: "bg-sentier" },
  "hors-ligne": { libelle: "Hors ligne", point: "bg-attente" },
  erreur: { libelle: "Envoi en échec", point: "bg-erreur" },
};

/** Barre latérale, à partir de 1024 px ; remplace la barre d'onglets du bas. */
function SideNav({ tabs, current, etatSync, onOpen, onCompte }: { tabs: Tab[]; current: string | null; etatSync: EtatSync; onOpen: (href: string) => void; onCompte: () => void }) {
  const store = useStore();
  const sync = LIBELLES_SYNC[etatSync];
  return (
    <nav aria-label="Navigation principale" className="no-print hidden w-[240px] flex-none flex-col gap-6 border-r border-ligne bg-fond-2 px-4 py-6 lg:flex">
      <Logo taille={30} className="px-2" />
      {store.role && (
        <div className="m-1 flex flex-col border-[1.5px] border-encre bg-fond px-3 py-2.5 outline outline-1 outline-offset-[3px] outline-encre">
          <span className="text-[13px] text-crayon">{store.groupeNom}</span>
          <strong className="text-[15px]">{ROLE_LABELS[store.role]}</strong>
        </div>
      )}
      <div className="flex flex-col">
        {tabs.map(([href, label]) => {
          const on = current === href;
          return (
            <button
              key={href}
              type="button"
              onClick={() => onOpen(href)}
              aria-current={on ? "page" : undefined}
              className={cx("flex min-h-11 items-center px-3.5 text-left text-[16px]", on ? "bg-encre font-bold text-fond" : "bg-transparent text-encre hover:bg-fond")}
            >
              {label}
            </button>
          );
        })}
      </div>
      {store.role && (
        <div className="mt-auto flex flex-col gap-1 px-1.5 text-[14px]">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className={cx("size-[9px] rounded-full", sync.point)} />
            {sync.libelle}
          </span>
          <span className="text-crayon">
            {store.userName} ·{" "}
            <button type="button" onClick={onCompte} className="bg-transparent p-0 text-encre underline underline-offset-4">
              compte
            </button>
          </span>
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
      <div className="flex flex-col gap-0.5 border-l-4 border-encre pl-3">
        <span className="text-[16px] font-semibold">{label}</span>
        <span className="font-mono text-[13px] text-crayon">
          {when === "Aujourd'hui" ? when : `Validé le ${when}`} · {v.validePar}
        </span>
      </div>
      <span className="text-[15px] text-crayon text-pretty">
        La validation n&apos;est pas effacée : elle reste dans le journal avec la date d&apos;annulation et votre nom. La preuve redevient à réussir.
      </span>
    </ConfirmSheet>
  );
}

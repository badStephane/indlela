import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, InputHTMLAttributes, ReactNode } from "react";

/** Titre de section avec filet double. `aDroite` : compteur ou action courte. */
export function TitreSection({ children, aDroite, as: T = "h2" }: { children: ReactNode; aDroite?: ReactNode; as?: "h2" | "h3" }) {
  return (
    <T className="filet-double mt-6 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-section font-extrabold tracking-[-0.3px]">
      <span className="min-w-0">{children}</span>
      {aDroite && <span className="ml-auto min-w-0 text-right font-mono text-[13px] font-normal">{aDroite}</span>}
    </T>
  );
}

/** Surligneur jaune : ce qui demande l'attention. Texte toujours à l'encre. */
export function Surligne({ children }: { children: ReactNode }) {
  return <mark className="bg-soleil px-1 font-semibold text-encre">{children}</mark>;
}

type Variante = "primaire" | "secondaire" | "danger" | "encre";
const VARIANTES: Record<Variante, string> = {
  primaire: "bg-sentier text-white border-0",
  secondaire: "bg-fond text-encre border-[1.5px] border-encre",
  danger: "bg-fond text-erreur border-[1.5px] border-erreur",
  encre: "bg-encre text-fond border-0",
};
const base = "inline-flex min-h-12 items-center justify-center px-4 font-semibold text-base no-underline disabled:bg-ligne disabled:text-crayon";

/** Bouton à angles droits. Pleine largeur et 54 px de haut en barre d'action mobile (`large`). */
export function Bouton({ variante = "primaire", large = false, className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; large?: boolean }) {
  return <button type="button" {...p} className={`${base} ${VARIANTES[variante]} ${large ? "h-[54px] w-full text-[17px]" : ""} ${className}`} />;
}
/** Même allure, mais lien interne : `next/link`, sans recharger la page (l'app doit rester utilisable hors ligne). */
export function BoutonLien({ variante = "primaire", large = false, className = "", ...p }: ComponentProps<typeof Link> & { variante?: Variante; large?: boolean }) {
  return <Link {...p} className={`${base} ${VARIANTES[variante]} ${large ? "h-[54px] w-full text-[17px]" : ""} ${className}`} />;
}

/** Champ sur une ligne (pas de boîte). `erreur` s'affiche juste en dessous. */
export function ChampLigne({ label, erreur, mono = false, id, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; erreur?: string; mono?: boolean; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <input
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-err` : undefined}
        {...p}
        className={`mt-0.5 block h-11 w-full border-0 border-b-[1.5px] bg-transparent p-0 text-[17px] text-encre ${erreur ? "border-erreur" : "border-encre"} ${mono ? "font-mono" : ""}`}
      />
      {erreur && <p id={`${id}-err`} className="mt-1 text-sm font-semibold text-erreur">{erreur}</p>}
    </div>
  );
}

/** Bandeau d'information : alerte (jaune), erreur (rouge), ok (vert). */
export function Bandeau({ ton = "alerte", children }: { ton?: "alerte" | "erreur" | "ok"; children: ReactNode }) {
  const t = { alerte: "bg-alerte-fond border-soleil", erreur: "bg-erreur-fond border-erreur", ok: "bg-ok-fond border-sentier" }[ton];
  return <div role={ton === "erreur" ? "alert" : "status"} className={`border-l-4 px-3 py-2.5 text-[15px] leading-snug ${t}`}>{children}</div>;
}

/** Fond à la couleur de chaque branche, pour un filet ou une pastille. */
export const FOND_BRANCHE = { meute: "bg-meute", troupe: "bg-troupe", route: "bg-route" } as const;

/** Filet de branche à gauche d'un bloc (meute, troupe, route). */
export function BlocBranche({ branche, children }: { branche: "meute" | "troupe" | "route"; children: ReactNode }) {
  const c = { meute: "border-meute", troupe: "border-troupe", route: "border-route" }[branche];
  return <section className={`border-l-[6px] pl-4 ${c}`}>{children}</section>;
}

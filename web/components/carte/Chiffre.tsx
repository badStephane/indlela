import type { ReactNode } from "react";

/** Grille de chiffres clés, séparés par des filets fins. Les colonnes se règlent avec className. */
export function Chiffres({ children, className = "grid-cols-3" }: { children: ReactNode; className?: string }) {
  return <dl className={`m-0 grid border-b border-ligne ${className}`}>{children}</dl>;
}

/** Un chiffre clé : la valeur en grand, son libellé dessous. */
export function Chiffre({ valeur, libelle }: { valeur: ReactNode; libelle: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse gap-1 border-ligne py-3 pr-2 [&+&]:border-l [&+&]:pl-3">
      <dt className="text-[15px] leading-snug text-crayon">{libelle}</dt>
      <dd className="m-0 text-[40px] font-extrabold leading-none tracking-[-1px]">{valeur}</dd>
    </div>
  );
}

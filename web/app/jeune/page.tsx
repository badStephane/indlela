"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FicheJeune } from "@/components/FicheJeune";
import { canValidate } from "@/lib/access";
import { useJeuneRoute } from "@/lib/useJeune";
import { useStore } from "@/lib/store";
import { fullName } from "@/lib/mock";
import { progressOf } from "@/lib/progress";
import { jeuneHref } from "@/lib/routes";

export default function Fiche() {
  const { ok, j, home } = useJeuneRoute();
  const store = useStore();
  const router = useRouter();
  if (!ok) return null;

  const { vals, role, steps } = store;
  const cadre = canValidate(role);
  const p = progressOf(j, steps, vals);
  const unite = store.unitesNoms[j.branche];

  return (
    <AppShell
      kicker={unite}
      title={fullName(j)}
      back={home}
      banner
      titreDansPage
      retour={role === "parent" ? "Vos enfants" : undefined}
      aDroite={
        <Link href={jeuneHref(j.id, "carnet")} className="flex min-h-11 items-center px-1 text-[17px] text-encre underline underline-offset-4">
          Carnet PDF
        </Link>
      }
      foot={cadre && p.step ? { label: p.brevets ? "Valider des brevets" : "Valider des preuves", onClick: () => router.push(jeuneHref(j.id, "valider")) } : undefined}
    >
      <div className="flex flex-col gap-5 px-4 pb-8 pt-2 lg:px-0">
        <FicheJeune j={j} />
      </div>
    </AppShell>
  );
}

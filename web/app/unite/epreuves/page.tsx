"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { UnitEpreuves } from "@/components/UnitEpreuves";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";

export default function EpreuvesUnite() {
  const ok = useGuard((r) => r === "cadre");
  const store = useStore();

  useEffect(() => {
    if (ok) store.setLastTab("/unite/epreuves");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  return (
    <AppShell kicker={`${store.unitesNoms.troupe} · référentiel version ${store.refVersion.troupe}`} title="Épreuves de l'unité">
      <div className="px-4 pb-8 pt-4 lg:px-0">
        <UnitEpreuves branche="troupe" />
      </div>
    </AppShell>
  );
}

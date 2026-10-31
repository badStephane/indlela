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
    <AppShell kicker="Troupe Saint-Paul" title="Épreuves de l'unité">
      <div className="p-4">
        <UnitEpreuves branche="troupe" />
      </div>
    </AppShell>
  );
}

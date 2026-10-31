"use client";

import { useEffect } from "react";
import { ReferentielsScreen } from "@/components/admin/ReferentielsScreen";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";

export default function EpreuvesGroupe() {
  const ok = useGuard((r) => r === "progression");
  const store = useStore();

  useEffect(() => {
    if (ok) store.setLastTab("/progression/epreuves");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;
  return <ReferentielsScreen kicker={store.groupeNom} title="Épreuves" withUnits />;
}

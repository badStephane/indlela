"use client";

import { useEffect } from "react";
import { ReferentielsScreen } from "@/components/admin/ReferentielsScreen";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";

export default function Referentiels() {
  const ok = useGuard((r) => r === "admin");
  const store = useStore();

  useEffect(() => {
    if (ok) store.setLastTab("/admin/referentiels");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;
  return <ReferentielsScreen kicker="Administration" title="Référentiels" />;
}

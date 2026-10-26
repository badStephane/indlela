"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLE_HOME, useStore } from "@/lib/store";
import { Frame } from "@/components/AppShell";

/** La dernière unité ou vue utilisée s'ouvre seule. */
export default function Home() {
  const { hydrated, role, lastTab } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (!hydrated) return;
    router.replace(role ? lastTab || ROLE_HOME[role] : "/connexion");
  }, [hydrated, role, lastTab, router]);
  return <Frame>{null}</Frame>;
}

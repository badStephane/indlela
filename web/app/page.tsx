"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLE_HOME, useStore } from "@/lib/store";
import { Accueil } from "@/components/accueil/Accueil";

/** Visiteur : la présentation du carnet. Compte déjà connecté : sa dernière unité ou vue s'ouvre seule. */
export default function Home() {
  const { hydrated, role, lastTab } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (hydrated && role) router.replace(lastTab || ROLE_HOME[role]);
  }, [hydrated, role, lastTab, router]);
  if (hydrated && role) return null;
  return <Accueil />;
}

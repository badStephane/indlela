"use client";

import { useSearchParams } from "next/navigation";
import { canSeeJeune, useGuard } from "./access";
import { findJeune } from "./mock";
import { useStore, type Role } from "./store";

/** Jeune de l'écran /jeune?id=…, visible seulement s'il est accessible au rôle. */
export function useJeuneRoute(extra: (role: Role) => boolean = () => true) {
  const id = useSearchParams().get("id");
  const { role, jeunes } = useStore();
  const j = findJeune(jeunes, id);
  const ok = useGuard((r) => canSeeJeune(r, j) && extra(r));
  const home = role === "parent" ? "/famille" : role === "groupe" ? "/groupe" : "/unite";
  return { ok: ok && !!j, j: j!, home };
}

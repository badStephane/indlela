"use client";

import { useParams } from "next/navigation";
import { canSeeJeune, useGuard } from "./access";
import { useStore, type Role } from "./store";

/** Jeune de la route /jeunes/[id], visible seulement s'il est accessible au rôle. */
export function useJeuneRoute(extra: (role: Role) => boolean = () => true) {
  const { id } = useParams<{ id: string }>();
  const { role, findJeune, compte } = useStore();
  const j = findJeune(id);
  const ok = useGuard((r) => canSeeJeune(r, j, compte) && extra(r));
  const home = role === "parent" ? "/famille" : role === "groupe" ? "/groupe" : "/unite";
  return { ok: ok && !!j, j: j!, home };
}

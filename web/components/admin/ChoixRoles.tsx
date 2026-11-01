"use client";

import { cx } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/admin";
import type { Role } from "@/lib/store";

const PROPOSES: readonly Role[] = ["cadre", "parent", "groupe", "progression", "admin"];

interface ChoixRolesProps {
  roles: readonly Role[];
  onToggle: (r: Role) => void;
  disabled?: boolean;
}

/** Rôles cochés d'un compte : les rôles d'encadrement se cumulent, parent reste seul (voir lib/roles.ts). */
export function ChoixRoles({ roles, onToggle, disabled = false }: ChoixRolesProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold">Rôles</span>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Rôles du compte">
        {PROPOSES.map((r) => {
          const on = roles.includes(r);
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onToggle(r)}
              className={cx(
                "h-11 rounded-ui border text-[14px] font-semibold disabled:opacity-60",
                on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink",
              )}
            >
              {ROLE_LABELS[r]}
            </button>
          );
        })}
      </div>
      <span className="text-[12px] text-muted text-pretty">Plusieurs rôles possibles. Un compte parent reste à part, sans autre rôle.</span>
    </div>
  );
}

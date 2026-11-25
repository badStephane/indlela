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
    <fieldset className="m-0 flex flex-col border-0 p-0">
      <legend className="mb-1 text-sm font-semibold">Rôles (cumulables)</legend>
      {PROPOSES.map((r) => {
        const on = roles.includes(r);
        return (
          <button
            key={r}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onToggle(r)}
            className="flex min-h-11 items-center gap-3 bg-transparent text-left text-[16px] text-encre disabled:text-crayon"
          >
            <span aria-hidden="true" className={cx("flex size-[22px] flex-none items-center justify-center border-[1.5px] text-[14px] font-bold", on ? "border-sentier bg-sentier text-white" : "border-encre")}>
              {on ? "✓" : ""}
            </span>
            {ROLE_LABELS[r]}
          </button>
        );
      })}
      <span className="pt-1 text-[14px] text-crayon text-pretty">Plusieurs rôles possibles. Un compte parent reste à part, sans autre rôle.</span>
    </fieldset>
  );
}

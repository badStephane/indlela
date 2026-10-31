"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Frame } from "@/components/AppShell";
import { cx } from "@/components/ui";
import { ROLE_HOME, useStore, type Role } from "@/lib/store";
import { DEMO } from "@/lib/demo";

const ROLES: [Role, string][] = [
  ["cadre", "Cadre"],
  ["groupe", "Chef de groupe"],
  ["progression", "Resp. progression"],
  ["parent", "Parent"],
  ["admin", "Admin"],
];

const inputClass = "h-12 rounded-ui border border-line-strong bg-surface px-3.5 text-[16px] font-normal text-ink outline-none focus:border-ink";

export default function Connexion() {
  const store = useStore();
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const enter = (role: Role) => {
    store.enter(role);
    router.replace(ROLE_HOME[role]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (store.offline) return setErr("Pas de réseau. La première connexion demande Internet ; ensuite, le carnet fonctionne sans réseau.");
    if (!id || !pw) return setErr("Saisissez votre identifiant et votre mot de passe.");
    if (pw.length < 4) return setErr("Identifiant ou mot de passe incorrect.");
    enter("cadre");
  };

  return (
    <Frame>
      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-6 pb-6 pt-[max(48px,calc(env(safe-area-inset-top)+24px))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Indlela" className="h-[38px] w-auto self-start" />
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[26px] font-extrabold leading-[1.15] tracking-[-0.01em]">Carnet de progression</h1>
          <p className="m-0 text-[15px] text-muted text-pretty">Connectez-vous avec le compte remis par votre groupe.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3.5" noValidate>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Identifiant
            <input
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setErr(null);
              }}
              placeholder="prenom.nom"
              autoComplete="username"
              autoCapitalize="none"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Mot de passe
            <input
              type="password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setErr(null);
              }}
              placeholder="••••••"
              autoComplete="current-password"
              className={inputClass}
            />
          </label>
          {err && (
            <div role="alert" className="rounded-ui bg-err-bg px-3 py-2.5 text-[14px] text-err-ink text-pretty">
              {err}
            </div>
          )}
          <button type="submit" className="h-[52px] rounded-ui bg-green text-[16px] font-bold text-white">
            Se connecter
          </button>
        </form>
        {DEMO && (
        <div className="mt-auto flex flex-col gap-2.5 border-t border-line pt-4">
          <span className="text-[13px] font-bold text-muted">Démo : entrer comme</span>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(([r, label]) => (
              <button key={r} type="button" onClick={() => enter(r)} className="h-11 rounded-ui border border-line bg-surface text-[14px] font-semibold text-ink">
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <DemoToggle on={store.demo.emptyUnit} onClick={() => store.setDemo({ emptyUnit: !store.demo.emptyUnit })} label="Unité vide" />
            <DemoToggle on={store.demo.syncFails} onClick={() => store.setDemo({ syncFails: !store.demo.syncFails })} label="1re synchro en échec" />
          </div>
        </div>
        )}
      </div>
    </Frame>
  );
}

function DemoToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cx("flex h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold", on ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted")}
    >
      <span className={cx("h-2 w-2 rounded-full", on ? "bg-sun" : "bg-line-strong")} />
      {label}
    </button>
  );
}

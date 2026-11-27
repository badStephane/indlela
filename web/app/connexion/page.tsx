"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Frame } from "@/components/AppShell";
import { cx } from "@/components/ui";
import { Bandeau, Bouton, ChampLigne, CourbesNiveau, Logo } from "@/components/carte";
import { SecondFacteur } from "@/components/connexion/SecondFacteur";
import { ROLE_HOME, useStore, type Role } from "@/lib/store";
import { DEMO } from "@/lib/demo";
import { supabase } from "@/lib/supabase";
import { connecter, deconnecter, verifierCode, type EtapeConnexion } from "@/lib/session";

type Facteur = Extract<EtapeConnexion, { etape: "enrolement" | "code" }>;

const ROLES: [Role, string][] = [
  ["cadre", "Cadre"],
  ["groupe", "Chef de groupe"],
  ["progression", "Resp. progression"],
  ["parent", "Parent"],
  ["admin", "Admin"],
];

export default function Connexion() {
  const store = useStore();
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [facteur, setFacteur] = useState<Facteur | null>(null);

  const enter = (role: Role) => {
    store.enter(role);
    router.replace(ROLE_HOME[role]);
  };

  const suite = (r: EtapeConnexion) => {
    setBusy(false);
    if (r.etape === "erreur") return setErr(r.message);
    setErr(null);
    if (r.etape === "ok") {
      router.replace(ROLE_HOME[store.connecter(r.moi)]);
      return;
    }
    // Un code faux renvoie une erreur : l'écran (et son QR code) reste affiché.
    setFacteur(r);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (store.offline) return setErr("Pas de réseau. La première connexion demande Internet ; ensuite, le carnet fonctionne sans réseau.");
    if (!id || !pw) return setErr("Saisissez votre identifiant et votre mot de passe.");
    if (!supabase) {
      // Sans serveur configuré, seule la démo fonctionne.
      if (!DEMO) return setErr("Le serveur n'est pas configuré. Adressez-vous à l'administrateur.");
      return pw.length < 4 ? setErr("Identifiant ou mot de passe incorrect.") : enter("cadre");
    }
    setBusy(true);
    suite(await connecter(id, pw));
  };

  const code = async (saisie: string) => {
    if (busy || !facteur) return;
    setBusy(true);
    suite(await verifierCode(facteur.factorId, saisie));
  };

  const annuler = () => {
    setFacteur(null);
    setErr(null);
    setPw("");
    void deconnecter();
  };

  return (
    <Frame>
      <div className="relative isolate flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6 pt-[max(56px,calc(env(safe-area-inset-top)+40px))]">
        <CourbesNiveau hauteur={48} largeur={420} />
        <div className="flex flex-col gap-3">
          <Logo taille={44} className="self-start" />
          <p className="m-0 text-[17px] text-crayon text-pretty">
            Carnet de progression des Scouts du Sénégal.
            <span className="block font-note italic text-annotation">« le chemin », en zoulou</span>
          </p>
        </div>
        <h1 className="filet-double m-0 mt-2 text-titre font-extrabold leading-tight tracking-[-0.3px]">Connexion</h1>
        {facteur ? (
          <SecondFacteur
            enrolement={facteur.etape === "enrolement" ? facteur : undefined}
            busy={busy}
            err={err}
            onCode={code}
            onAnnuler={annuler}
          />
        ) : (
          <form onSubmit={submit} className="-mt-2 flex flex-col gap-5" noValidate>
            <ChampLigne
              id="identifiant"
              label="Identifiant"
              mono
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setErr(null);
              }}
              placeholder="prenom.nom"
              autoComplete="username"
              autoCapitalize="none"
            />
            <ChampLigne
              id="mot-de-passe"
              label="Mot de passe"
              type="password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setErr(null);
              }}
              placeholder="••••••"
              autoComplete="current-password"
            />
            {err && <Bandeau ton="erreur">{err}</Bandeau>}
            <Bouton type="submit" large disabled={busy}>
              {busy ? "Connexion…" : "Se connecter"}
            </Bouton>
            <p className="m-0 text-[16px] text-crayon text-pretty">
              Votre identifiant et votre mot de passe vous sont remis par l&apos;administrateur du groupe. Il n&apos;y a pas d&apos;inscription.
            </p>
          </form>
        )}
        {!facteur && (
          <p className="m-0 mt-auto border-t border-ligne pt-4 text-[15px] text-crayon text-pretty">
            Chef de groupe, responsable progression ou administrateur : un code à 6 chiffres de votre application d&apos;authentification vous sera demandé ensuite.
          </p>
        )}
        {DEMO && !facteur && (
          <div className="flex flex-col gap-2.5 border-t border-ligne pt-4">
            <span className="text-[15px] font-semibold">Démo : entrer comme</span>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(([r, label]) => (
                <button key={r} type="button" onClick={() => enter(r)} className="min-h-11 border-[1.5px] border-encre bg-transparent px-2 text-[15px] font-semibold text-encre">
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
      className={cx("flex min-h-11 items-center gap-2 border-[1.5px] border-encre px-3 text-[14px] font-semibold", on ? "bg-encre text-fond" : "bg-transparent text-encre")}
    >
      <span aria-hidden="true" className={cx("size-3 border-[1.5px]", on ? "border-soleil bg-soleil" : "border-encre")} />
      {label}
    </button>
  );
}

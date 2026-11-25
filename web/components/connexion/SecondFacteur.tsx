"use client";

import { useState, type FormEvent } from "react";
import { Bandeau, Bouton, ChampLigne } from "@/components/carte";

interface SecondFacteurProps {
  /** Présents au premier passage : le compte associe son application d'authentification. */
  enrolement?: { qr: string; secret: string };
  busy: boolean;
  err: string | null;
  onCode: (code: string) => void;
  onAnnuler: () => void;
}

/** Étape du second facteur : enrôlement (QR code et clé) ou simple saisie du code. */
export function SecondFacteur({ enrolement, busy, err, onCode, onAnnuler }: SecondFacteurProps) {
  const [code, setCode] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onCode(code);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-section font-extrabold">{enrolement ? "Protégez votre compte" : "Code de vérification"}</h2>
        <p className="m-0 text-[16px] text-crayon text-pretty">
          {enrolement
            ? "Votre rôle donne accès aux fiches de tout le groupe : un second code est demandé à chaque connexion. Installez une application d'authentification (Google Authenticator, Microsoft Authenticator…), scannez ce code, puis saisissez les six chiffres qu'elle affiche."
            : "Saisissez les six chiffres affichés par votre application d'authentification."}
        </p>
      </div>
      {enrolement && (
        <div className="flex flex-col items-start gap-2.5 border-[1.5px] border-encre p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolement.qr} alt="QR code à scanner avec l'application d'authentification" className="h-44 w-44" />
          <span className="text-[15px] text-crayon">Pas d&apos;appareil photo ? Saisissez cette clé dans l&apos;application :</span>
          <code className="select-all break-all font-mono text-[15px] font-semibold">{enrolement.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
        </div>
      )}
      <ChampLigne
        id="code-2fa"
        label="Code à six chiffres"
        mono
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        placeholder="123 456"
        className="tracking-[0.2em]"
      />
      {err && <Bandeau ton="erreur">{err}</Bandeau>}
      <Bouton type="submit" large disabled={busy}>
        {busy ? "Vérification…" : "Valider le code"}
      </Bouton>
      <Bouton variante="secondaire" onClick={onAnnuler} className="w-full">
        Annuler
      </Bouton>
    </form>
  );
}

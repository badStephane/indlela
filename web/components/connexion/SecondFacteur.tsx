"use client";

import { useState, type FormEvent } from "react";

const inputClass = "h-12 rounded-ui border border-line-strong bg-surface px-3.5 text-[16px] font-normal text-ink outline-none focus:border-ink";

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
        <h2 className="m-0 text-[20px] font-extrabold">{enrolement ? "Protégez votre compte" : "Code de vérification"}</h2>
        <p className="m-0 text-[15px] text-muted text-pretty">
          {enrolement
            ? "Votre rôle donne accès aux fiches de tout le groupe : un second code est demandé à chaque connexion. Installez une application d'authentification (Google Authenticator, Microsoft Authenticator…), scannez ce code, puis saisissez les six chiffres qu'elle affiche."
            : "Saisissez les six chiffres affichés par votre application d'authentification."}
        </p>
      </div>
      {enrolement && (
        <div className="flex flex-col items-start gap-2.5 rounded-card border border-line bg-surface p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolement.qr} alt="QR code à scanner avec l'application d'authentification" className="h-44 w-44" />
          <span className="text-[13px] text-muted">Pas d&apos;appareil photo ? Saisissez cette clé dans l&apos;application :</span>
          <code className="num select-all break-all text-[14px] font-semibold">{enrolement.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
        </div>
      )}
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Code à six chiffres
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123 456"
          className={`${inputClass} num tracking-[0.2em]`}
        />
      </label>
      {err && (
        <div role="alert" className="rounded-ui bg-err-bg px-3 py-2.5 text-[14px] text-err-ink text-pretty">
          {err}
        </div>
      )}
      <button type="submit" disabled={busy} className="h-[52px] rounded-ui bg-green text-[16px] font-bold text-white disabled:opacity-60">
        {busy ? "Vérification…" : "Valider le code"}
      </button>
      <button type="button" onClick={onAnnuler} className="h-11 text-[15px] font-semibold text-muted">
        Annuler
      </button>
    </form>
  );
}

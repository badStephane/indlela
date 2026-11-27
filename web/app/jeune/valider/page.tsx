"use client";

import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cx } from "@/components/ui";
import { Bandeau, TitreSection } from "@/components/carte";
import { canValidate } from "@/lib/access";
import { useJeuneRoute } from "@/lib/useJeune";
import { useBack } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { ceremonies, CURRENT_CADRE, fullName, type Validation } from "@/lib/mock";
import { critStatus, isValidated, plural, progressOf } from "@/lib/progress";
import type { PreuveUnite } from "@/lib/effective";
import { fmtDayMonth, fmtPoint, toISODate } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";
import { usePhotos } from "@/lib/photosStore";
import { AjoutPhotos } from "@/components/photos/AjoutPhotos";

/** Preuves cochées, avec la façon dont le jeune les a réussies. */
type Selection = Record<string, string>;
/** Photos de preuve, par preuve cochée. */
type PhotosSel = Record<string, string[]>;

interface Groupe {
  id: string;
  name: string;
  consigne?: string;
  preuves: PreuveUnite[];
}

export default function Valider() {
  const { ok, j } = useJeuneRoute(canValidate);
  const store = useStore();
  const [sel, setSel] = useState<Selection>({});
  const [photosSel, setPhotosSel] = useState<PhotosSel>({});
  const photos = usePhotos();
  const [date, setDate] = useState(() => toISODate(new Date()));
  const submitted = useRef(false);
  const back = useBack(j ? jeuneHref(j.id) : "/unite");
  if (!ok) return null;

  const { vals, offline, steps } = store;
  const p = progressOf(j, steps, vals);
  if (!p.step) return null;

  const open = (x: PreuveUnite) => !x.archive && !isValidated(critStatus(vals, j.id, x.id));
  const auProgramme: Groupe[] = p.domaines
    .map((d) => ({ id: d.domaine.id, name: d.domaine.name, consigne: d.domaine.min && !p.brevets ? `${d.domaine.min} au choix` : undefined, preuves: d.preuves.filter(open) }))
    .filter((g) => g.preuves.length);
  const dansProgramme = new Set(p.domaines.flatMap((d) => d.preuves.map((x) => x.id)));
  const autres: Groupe[] = p.step.domaines
    .filter((d) => !d.retire && !d.archive)
    .map((d) => ({ id: d.id, name: d.name, preuves: d.preuves.filter((x) => !x.archive && open(x) && !dansProgramme.has(x.id)) }))
    .filter((g) => g.preuves.length && (p.brevets || !p.domaines.some((x) => x.domaine.id === g.id)));

  const ids = Object.keys(sel);
  const n = ids.length;
  const today = toISODate(new Date());
  const oublierPhotos = (preuveIds: string[]) => {
    preuveIds.forEach((id) => (photosSel[id] ?? []).forEach(photos.abandonner));
    setPhotosSel((s) => Object.fromEntries(Object.entries(s).filter(([k]) => !preuveIds.includes(k))));
  };
  const toggle = (id: string) => {
    if (id in sel) oublierPhotos([id]);
    setSel((s) => (id in s ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== id)) : { ...s, [id]: "" }));
  };
  const toggleAll = (g: Groupe) => {
    const allOn = g.preuves.every((x) => x.id in sel);
    if (allOn) oublierPhotos(g.preuves.map((x) => x.id));
    setSel((s) => (allOn ? Object.fromEntries(Object.entries(s).filter(([k]) => !g.preuves.some((x) => x.id === k))) : { ...Object.fromEntries(g.preuves.map((x) => [x.id, ""])), ...s }));
  };
  const setComment = (id: string, text: string) => setSel((s) => ({ ...s, [id]: text }));
  const setPhotos = (id: string, list: string[]) => setPhotosSel((s) => ({ ...s, [id]: list }));

  const confirm = () => {
    if (submitted.current || !n) return;
    submitted.current = true;
    const creees = store.validate(j, ids.map((preuveId) => ({ preuveId, commentaire: sel[preuveId].trim() })), date > today ? today : date);
    photos.attacher(creees.map((v) => ({ validationId: v.id, jeuneId: j.id, photoIds: photosSel[v.preuveId] ?? [] })));
    // Preuve déjà validée entre-temps (double touche, autre cadre) : ses photos ne servent plus.
    oublierPhotos(ids.filter((id) => !creees.some((v) => v.preuveId === id)));
    back();
  };

  // L'étape serait-elle complète avec cette saisie ?
  const simulated: Validation[] = ids.map((preuveId) => ({ id: preuveId, jeuneId: j.id, etapeId: j.etapeId, domaineId: "", preuveId, date, validePar: "", pending: false, annuleeLe: null, updatedAt: "" }));
  const completes = n > 0 && !p.complete && progressOf(j, steps, [...vals, ...simulated]).complete;
  const unit = p.brevets ? ["brevet", "brevets"] : ["preuve", "preuves"];

  const validePar = store.role === "cadre" ? CURRENT_CADRE.full : store.userName;

  return (
    <AppShell
      kicker={`Étape ${p.step.name}`}
      title={p.brevets ? "Valider des brevets" : "Valider des preuves"}
      back={jeuneHref(j.id)}
      retour={fullName(j)}
      banner
      foot={{
        label: n ? `Valider ${n} ${plural(n, unit[0], unit[1])}` : `Cochez au moins une ${unit[0]}`,
        disabled: !n,
        onClick: confirm,
        note: offline ? "Sans réseau, la validation attend sur le téléphone." : `Réussie le ${fmtPoint(date, true)} · validée par ${validePar}`,
      }}
    >
      <div className="flex flex-col gap-5 px-4 pb-8 pt-4 lg:px-0">
        <p className="m-0 text-[16px] text-crayon">
          {p.brevets
            ? `${p.brevets.obtenus} ${plural(p.brevets.obtenus, "brevet obtenu", "brevets obtenus")} sur 3, dans ${p.brevets.series} ${plural(p.brevets.series, "série", "séries")} sur 2`
            : `Déjà réussies : ${p.done} sur ${p.total}.`}
        </p>
        {!auProgramme.length && !autres.length ? (
          <p className="m-0 text-[16px] text-crayon">Toutes les preuves de cette étape sont déjà validées.</p>
        ) : (
          <>
            {auProgramme.map((g) => (
              <GroupeBloc key={g.id} g={g} sel={sel} photos={photosSel} vals={vals} jeuneId={j.id} onToggle={toggle} onToggleAll={() => toggleAll(g)} onComment={setComment} onPhotos={setPhotos} />
            ))}
            {autres.length > 0 && (
              <details className="group">
                <summary className="min-h-11 cursor-pointer list-none py-2 text-[16px] text-crayon">
                  {p.brevets ? "Autres brevets" : `Autres domaines au choix (${autres.map((g) => g.name).join(", ")})`} :{" "}
                  <span className="text-encre underline underline-offset-4 group-open:hidden">afficher</span>
                  <span className="hidden text-encre underline underline-offset-4 group-open:inline">masquer</span>
                </summary>
                <div className="flex flex-col gap-5 pt-2">
                  {autres.map((g) => (
                    <GroupeBloc key={g.id} g={g} sel={sel} photos={photosSel} vals={vals} jeuneId={j.id} onToggle={toggle} onComment={setComment} onPhotos={setPhotos} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
        {completes && (
          <Bandeau ton="ok">
            Avec cette validation, l&apos;étape {p.step.name} est réussie. Elle sera proposée à la cour d&apos;honneur du {fmtDayMonth(ceremonies().courHonneur, true)}.
          </Bandeau>
        )}
        <label className="flex flex-wrap items-center justify-between gap-3 text-[16px] font-semibold">
          Réussie le
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
            className="h-11 border-0 border-b-[1.5px] border-encre bg-transparent px-0 font-mono text-[17px] font-normal text-encre"
          />
        </label>
      </div>
    </AppShell>
  );
}

interface GroupeBlocProps {
  g: Groupe;
  sel: Selection;
  photos: PhotosSel;
  vals: Validation[];
  jeuneId: string;
  onToggle: (id: string) => void;
  onToggleAll?: () => void;
  onComment: (id: string, text: string) => void;
  onPhotos: (id: string, ids: string[]) => void;
}

function GroupeBloc({ g, sel, photos, vals, jeuneId, onToggle, onToggleAll, onComment, onPhotos }: GroupeBlocProps) {
  const allOn = g.preuves.every((x) => x.id in sel);
  const toutCocher =
    onToggleAll && g.preuves.length > 1 && !g.consigne ? (
      <button type="button" onClick={onToggleAll} className="min-h-11 bg-transparent px-0 font-sans text-[16px] font-semibold text-encre underline underline-offset-4">
        {allOn ? "Tout décocher" : "Tout cocher"}
      </button>
    ) : g.consigne ? (
      g.consigne
    ) : undefined;
  return (
    <section>
      <TitreSection aDroite={toutCocher}>{g.name}</TitreSection>
      <ul className="m-0 list-none p-0">
        {g.preuves.map((x) => {
          const on = x.id in sel;
          const r = critStatus(vals, jeuneId, x.id);
          return (
            <li key={x.id} className="border-b border-ligne">
              <button type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(x.id)} className="flex min-h-14 w-full items-center gap-3.5 bg-transparent py-2.5 text-left text-encre">
                <span
                  aria-hidden="true"
                  className={cx("flex size-7 flex-none items-center justify-center text-[17px] font-bold", on ? "bg-sentier text-white" : "border-2 border-encre bg-fond")}
                >
                  {on ? "✓" : ""}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[17px] text-pretty">{x.label}</span>
                  {r.st === "cancelled" && <span className="text-[14px] font-semibold text-erreur">Annulée le {fmtPoint(r.v.annuleeLe!)}</span>}
                </span>
              </button>
              {on && (
                <div className="flex flex-col gap-3 pb-3.5 pl-[42px]">
                  <label className="flex flex-col text-[15px] font-semibold">
                    Comment l&apos;a-t-il réussie ? (facultatif)
                    <input
                      value={sel[x.id]}
                      onChange={(e) => onComment(x.id, e.target.value)}
                      placeholder="Ex. au camp de Toubab Dialaw, devant le CP"
                      maxLength={280}
                      className="h-11 border-0 border-b-[1.5px] border-encre bg-transparent px-0 text-[17px] font-normal text-encre placeholder:text-crayon"
                    />
                  </label>
                  <AjoutPhotos preuve={x.label} ids={photos[x.id] ?? []} onChange={(list) => onPhotos(x.id, list)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

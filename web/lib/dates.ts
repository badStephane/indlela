const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const LONG_MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const DAY_MS = 86_400_000;

/** Lit « 2026-10-31 » comme une date locale (new Date() la lirait en UTC, un jour plus tôt sous les fuseaux négatifs). */
export function fromISODate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysAgo(n: number, from: Date = new Date()): Date {
  const x = startOfDay(from);
  x.setDate(x.getDate() - n);
  return x;
}

/** Nombre de jours entiers entre une date ISO et aujourd'hui. */
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.round((startOfDay(now).getTime() - startOfDay(fromISODate(iso)).getTime()) / DAY_MS);
}

/** « 1er oct. », « 14 juin 2025 ». L'année s'affiche si demandée ou si elle diffère de l'année en cours. */
export function fmtShort(iso: string, withYear = false, now: Date = new Date()): string {
  const x = fromISODate(iso);
  const d = x.getDate();
  const y = withYear || x.getFullYear() !== now.getFullYear() ? " " + x.getFullYear() : "";
  return `${d === 1 ? "1er" : d} ${MONTHS[x.getMonth()]}${y}`;
}

/** « 26 oct. 2026 » */
export function fmtFull(d: Date): string {
  return `${d.getDate() === 1 ? "1er" : d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** « lundi 26 octobre » */
export function fmtMeeting(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate() === 1 ? "1er" : d.getDate()} ${LONG_MONTHS[d.getMonth()]}`;
}

/** « 7 nov. » / « 7 novembre » */
export function fmtDayMonth(iso: string, long = false): string {
  const x = fromISODate(iso);
  return `${x.getDate() === 1 ? "1er" : x.getDate()} ${(long ? LONG_MONTHS : MONTHS)[x.getMonth()]}`;
}

/** Date relative pour une validation : « Aujourd'hui » ou « 12 oct. ». */
export function fmtWhen(iso: string): string {
  return daysSince(iso) === 0 ? "Aujourd'hui" : fmtShort(iso);
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

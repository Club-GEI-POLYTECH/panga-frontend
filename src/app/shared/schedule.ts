/**
 * Emploi du temps — types & normalisation partagés (élève, parent, enseignant).
 *
 * La grille de référence est l'entité `ClassScheduleSlot` définie par l'admin
 * (`weekdayIso`, `startTime`, `endTime`, `label`, `room`, `classSubject`). Les
 * endpoints de lecture peuvent renvoyer plusieurs formes (liste, objet par jour,
 * enveloppe `{ slots }`) : `normalizeSchedule` les ramène toutes à `ScheduleSlot[]`.
 */

/** Créneau normalisé pour l'affichage (jour ISO 1..7 + horaires HH:mm). */
export interface ScheduleSlot {
  /** Jour ISO : 1 = lundi … 7 = dimanche. */
  day: number;
  start: string;
  end: string;
  label: string;
  room?: string;
}

/** Noms FR des jours (index ISO 1..7). */
export const SCHEDULE_DAY_NAMES: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
};

export function scheduleDayName(d: number): string {
  return SCHEDULE_DAY_NAMES[d] ?? `Jour ${d}`;
}

const DAY_KEYS: Record<string, number> = {
  monday: 1,
  lundi: 1,
  tuesday: 2,
  mardi: 2,
  wednesday: 3,
  mercredi: 3,
  thursday: 4,
  jeudi: 4,
  friday: 5,
  vendredi: 5,
  saturday: 6,
  samedi: 6,
  sunday: 7,
  dimanche: 7,
};

function toDay(v: unknown): number {
  if (typeof v === 'number') {
    return v;
  }
  const s = String(v ?? '').toLowerCase();
  if (DAY_KEYS[s]) {
    return DAY_KEYS[s];
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Libellé d'un créneau : privilégie la matière liée (classSubject/slot). */
function slotLabel(o: Record<string, unknown>): string {
  const subject = (o['classSubject'] ?? {}) as Record<string, unknown>;
  const slot = (subject['nationalProgramSlot'] ?? o['nationalProgramSlot'] ?? {}) as Record<
    string,
    unknown
  >;
  return String(
    o['label'] ??
      slot['labelFr'] ??
      slot['programCode'] ??
      o['subject'] ??
      o['courseName'] ??
      o['subjectLabel'] ??
      'Cours',
  );
}

/** Normalise l'emploi du temps quelle que soit sa forme (liste, objet par jour, enveloppe). */
export function normalizeSchedule(data: unknown): ScheduleSlot[] {
  const out: ScheduleSlot[] = [];
  const push = (raw: unknown, dayHint?: number) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const day = dayHint ?? toDay(o['weekdayIso'] ?? o['weekday'] ?? o['day']);
    if (!day) {
      return;
    }
    out.push({
      day,
      start: String(o['startTime'] ?? o['start'] ?? '').slice(0, 5),
      end: String(o['endTime'] ?? o['end'] ?? '').slice(0, 5),
      label: slotLabel(o),
      room: (o['room'] ?? o['roomNumber']) as string | undefined,
    });
  };

  if (Array.isArray(data)) {
    data.forEach((s) => push(s));
    return out;
  }
  const obj = (data ?? {}) as Record<string, unknown>;
  const slots = obj['slots'] ?? obj['scheduleSlots'] ?? obj['schedule'];
  if (Array.isArray(slots)) {
    slots.forEach((s) => push(s));
    return out;
  }
  // Forme objet par jour : { monday: [...], ... }.
  for (const [key, value] of Object.entries(obj)) {
    const day = DAY_KEYS[key.toLowerCase()];
    if (day && Array.isArray(value)) {
      value.forEach((s) => push(s, day));
    }
  }
  return out;
}

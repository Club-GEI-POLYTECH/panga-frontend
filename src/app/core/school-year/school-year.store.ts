import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { unwrapEnvelope } from '../http/api.util';

export interface SchoolYearSettings {
  currentSchoolYear?: string;
  nextSchoolYear?: string;
  schoolYearStartDate?: string;
  schoolYearEndDate?: string;
  source?: 'settings' | 'computed';
}

export interface UpdateSchoolYearDto {
  currentSchoolYear: string;
  nextSchoolYear?: string;
  schoolYearStartDate?: string;
  schoolYearEndDate?: string;
}

/** Sentinelle « toutes les années » pour les filtres de liste. */
export const ALL_YEARS = 'all';

/**
 * Source de vérité de l'année scolaire côté front.
 * - `current` : année courante de l'école (réglage backend, ou déduite).
 * - `selected` : année choisie dans le sélecteur global (défaut = `current`).
 * Les écrans lisent `selected()` ; envoyer cette valeur aux API (ou `ALL_YEARS`
 * pour l'historique). Le backend applique l'année courante si on omet le champ.
 */
@Injectable({ providedIn: 'root' })
export class SchoolYearStore {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/settings/school-year`;

  readonly current = signal<string>(computeSchoolYear(new Date()));
  readonly selected = signal<string>(this.current());
  readonly next = signal<string>(nextOf(this.current()));
  readonly source = signal<'settings' | 'computed'>('computed');
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  private loaded = false;

  /** L'année courante est déduite (pas encore configurée) → rappel admin. */
  readonly needsSetup = computed(() => this.source() === 'computed');

  /**
   * Valeur d'année à transmettre aux **GET** (filtres de liste) :
   * - chaîne vide si l'année sélectionnée est l'année courante → on n'envoie
   *   rien, le backend applique automatiquement l'année en cours de l'école
   *   (évite tout décalage front/back) ;
   * - sinon l'année explicitement choisie (`all` inclus pour l'historique).
   */
  readonly filter = computed(() => (this.selected() === this.current() ? '' : this.selected()));

  /** Options du sélecteur : courante, suivante, 2 précédentes, + historique. */
  readonly options = computed(() => {
    const cur = this.current();
    const start = startYear(cur);
    const list: { value: string; label: string }[] = [];
    for (let y = start + 1; y >= start - 2; y--) {
      const value = `${y}-${y + 1}`;
      const label = value === cur ? `${value} (en cours)` : value;
      list.push({ value, label });
    }
    list.push({ value: ALL_YEARS, label: 'Tout l’historique' });
    return list;
  });

  /** Charge l'année courante de l'école (idempotent). */
  load(force = false): void {
    if (this.loaded && !force) {
      return;
    }
    this.loaded = true;
    this.http
      .get<unknown>(this.base)
      .pipe(map((r) => unwrapEnvelope<SchoolYearSettings>(r)))
      .subscribe({ next: (d) => this.apply(d), error: () => undefined });
  }

  /** Met à jour le réglage école (admin) et réapplique localement. */
  update(dto: UpdateSchoolYearDto): Observable<SchoolYearSettings> {
    return this.http.put<unknown>(this.base, dto).pipe(
      map((r) => unwrapEnvelope<SchoolYearSettings>(r)),
      tap((d) => this.apply(d.currentSchoolYear ? d : { ...d, ...dto, source: 'settings' })),
    );
  }

  setSelected(year: string): void {
    this.selected.set(year);
  }

  private apply(d: SchoolYearSettings): void {
    const cur = d.currentSchoolYear;
    const followsCurrent = this.selected() === this.current();
    if (cur) {
      this.current.set(cur);
      if (followsCurrent) {
        this.selected.set(cur);
      }
    }
    this.next.set(d.nextSchoolYear || nextOf(this.current()));
    this.source.set(d.source ?? 'computed');
    this.startDate.set(d.schoolYearStartDate ?? '');
    this.endDate.set(d.schoolYearEndDate ?? '');
  }
}

/* -------------------------------------------------------------------------- */

/** Année scolaire (AAAA-AAAA) selon la règle « bascule au 1er septembre ». */
export function computeSchoolYear(date: Date): string {
  const y = date.getFullYear();
  const start = date.getMonth() >= 8 ? y : y - 1; // mois 8 = septembre
  return `${start}-${start + 1}`;
}

function startYear(schoolYear: string): number {
  const n = parseInt(schoolYear.slice(0, 4), 10);
  return Number.isFinite(n) ? n : new Date().getFullYear();
}

function nextOf(schoolYear: string): string {
  const s = startYear(schoolYear) + 1;
  return `${s}-${s + 1}`;
}

/** Format valide AAAA-AAAA avec années consécutives. */
export function isValidSchoolYear(value: string): boolean {
  const m = /^(\d{4})-(\d{4})$/.exec(value.trim());
  return !!m && Number(m[2]) === Number(m[1]) + 1;
}

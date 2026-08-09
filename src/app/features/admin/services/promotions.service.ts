import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ListResult, toHttpParams, unwrapEnvelope, unwrapList } from '../../../core/http/api.util';
import { SKIP_ERROR_TOAST } from '../../../core/http/http-context';
import type {
  ComputeDecisionsDto,
  FinalizeDecisionsDto,
  FinalizeResult,
  PromotionDecision,
  RecordTransferDto,
  UpdateDecisionDto,
} from '../models/promotion.models';

interface DecisionFilter {
  schoolYear?: string;
  classInstanceId?: string;
  decision?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

/** Promotions : décisions de fin d'année (calcul, finalisation, transfert). */
@Injectable({ providedIn: 'root' })
export class PromotionsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/promotions`;

  /** Calculer les décisions d'une classe (brouillon recalculable). */
  compute(dto: ComputeDecisionsDto): Observable<PromotionDecision[]> {
    return this.http
      .post<unknown>(`${this.base}/compute`, dto)
      .pipe(map((r) => unwrapList<PromotionDecision>(r).items));
  }

  /**
   * Finaliser (clôturer) les décisions d'une classe. Toast global désactivé :
   * l'appelant affiche le résultat (`enrollments`) ou le 422 « notes incomplètes »
   * dans un panneau dédié plutôt qu'un simple toast d'erreur.
   */
  finalize(dto: FinalizeDecisionsDto): Observable<FinalizeResult> {
    return this.http
      .post<unknown>(`${this.base}/finalize`, dto, {
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .pipe(map((r) => unwrapEnvelope<FinalizeResult>(r)));
  }

  /** Lister les décisions (paginé + filtres). */
  list(filter: DecisionFilter): Observable<ListResult<PromotionDecision>> {
    return this.http
      .get<unknown>(`${this.base}/decisions`, { params: toHttpParams(filter) })
      .pipe(map((r) => unwrapList<PromotionDecision>(r)));
  }

  /** Override manuel d'une décision (tant qu'elle est en brouillon). */
  update(id: string, dto: UpdateDecisionDto): Observable<PromotionDecision> {
    return this.http
      .patch<unknown>(`${this.base}/decisions/${id}`, dto)
      .pipe(map((r) => unwrapEnvelope<PromotionDecision>(r)));
  }

  /** Décision d'un élève pour une année. */
  studentDecision(studentId: string, schoolYear: string): Observable<PromotionDecision> {
    return this.http
      .get<unknown>(`${this.base}/students/${studentId}/decision`, {
        params: toHttpParams({ schoolYear }),
      })
      .pipe(map((r) => unwrapEnvelope<PromotionDecision>(r)));
  }

  /** Enregistrer le transfert d'un élève. */
  recordTransfer(dto: RecordTransferDto): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.base}/transfer`, dto)
      .pipe(map((r) => unwrapEnvelope(r)));
  }
}

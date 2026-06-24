import { HttpContextToken } from '@angular/common/http';

/**
 * Marque une requête comme « silencieuse » : l'errorInterceptor n'affiche aucun
 * toast en cas d'échec (ex. récupération d'un avatar inexistant → 404 normal).
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

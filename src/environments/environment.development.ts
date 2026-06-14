/**
 * Configuration de développement. Pointe vers le backend NestJS local.
 * Ajustez `apiBaseUrl` selon le port réel de votre backend.
 *
 * NB : ce fichier remplace environment.ts au build dev (fileReplacements),
 * il doit donc rester autonome (pas d'import depuis ./environment).
 */
export const environment = {
  production: false,
  // Relatif : passe par le proxy de dev (proxy.conf.json) → pas de CORS.
  apiBaseUrl: '/v1',
  schoolHeader: 'x-school-id',
  tenantHeader: 'x-tenant-id',
  langHeader: 'x-lang',
  defaultLang: 'fr',
  availableLangs: ['fr', 'en'] as const,
  features: {
    offlineQueue: false,
    pushNotifications: false,
  },
};

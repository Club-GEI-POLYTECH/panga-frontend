/**
 * Configuration de production (valeur par défaut importée par le code).
 * En build `development`, ce fichier est remplacé par `environment.development.ts`
 * via `fileReplacements` (cf. angular.json).
 */
export const environment = {
  production: true,
  /** Base de l'API REST du backend NestJS. */
  apiBaseUrl: '/v1',
  /** En-têtes multi-tenant propagés par le TenantInterceptor. */
  schoolHeader: 'x-school-id',
  tenantHeader: 'x-tenant-id',
  /** En-tête de langue propagé par le LangInterceptor. */
  langHeader: 'x-lang',
  defaultLang: 'fr',
  availableLangs: ['fr', 'en'] as const,
  /** Feature flags front (activables par phase). */
  features: {
    offlineQueue: false,
    pushNotifications: false,
  },
};

export type AppEnvironment = typeof environment;

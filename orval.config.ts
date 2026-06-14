import { defineConfig } from 'orval';

/**
 * Génération du client HTTP + types depuis la spec OpenAPI du backend Panga.
 *
 * Source : exportez la spec du backend NestJS puis lancez `npm run api:generate`.
 *   - via fichier : `GET /v1/docs-json` enregistré dans ./openapi.json
 *   - ou directement par URL (décommentez la ligne `target` correspondante).
 *
 * Le client généré (services Angular typés) ne doit PAS être édité à la main :
 * régénérez-le à chaque évolution du contrat d'API (à brancher en CI).
 */
export default defineConfig({
  panga: {
    input: {
      target: './openapi.json',
      // target: 'http://localhost:3000/v1/docs-json',
    },
    output: {
      mode: 'tags-split',
      target: 'src/app/core/api/generated',
      schemas: 'src/app/core/api/generated/models',
      client: 'angular',
      clean: true,
      prettier: true,
    },
  },
});

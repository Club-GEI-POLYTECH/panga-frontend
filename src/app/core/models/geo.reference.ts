import type { EnumOption } from './school.enums';

/**
 * Données de référence géographiques & monétaires — source unique pour les
 * sélecteurs pays / indicatifs / provinces / devises. Objectif : uniformité des
 * données saisies dans tous les formulaires.
 *
 * Les `code` pays sont en ISO 3166-1 alpha-2 (valeur stockée pour `country`).
 * Les devises sont en ISO 4217. Les téléphones sont stockés au format E.164
 * (`{dialCode}{numéro}`, ex. `+243812345678`).
 */

export interface Country {
  /** ISO 3166-1 alpha-2 (ex. `CD`). */
  code: string;
  /** Nom en français. */
  name: string;
  /** Indicatif international (ex. `+243`). */
  dialCode: string;
  /** Drapeau emoji. */
  flag: string;
}

/** RDC en tête, puis Afrique et pays fréquents (ordre alphabétique par bloc). */
export const COUNTRIES: Country[] = [
  { code: 'CD', name: 'RD Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'ZA', name: 'Afrique du Sud', dialCode: '+27', flag: '🇿🇦' },
  { code: 'DZ', name: 'Algérie', dialCode: '+213', flag: '🇩🇿' },
  { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯' },
  { code: 'BW', name: 'Botswana', dialCode: '+267', flag: '🇧🇼' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', dialCode: '+257', flag: '🇧🇮' },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲' },
  { code: 'CV', name: 'Cap-Vert', dialCode: '+238', flag: '🇨🇻' },
  { code: 'CF', name: 'Centrafrique', dialCode: '+236', flag: '🇨🇫' },
  { code: 'KM', name: 'Comores', dialCode: '+269', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo-Brazzaville', dialCode: '+242', flag: '🇨🇬' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮' },
  { code: 'DJ', name: 'Djibouti', dialCode: '+253', flag: '🇩🇯' },
  { code: 'EG', name: 'Égypte', dialCode: '+20', flag: '🇪🇬' },
  { code: 'ER', name: 'Érythrée', dialCode: '+291', flag: '🇪🇷' },
  { code: 'SZ', name: 'Eswatini', dialCode: '+268', flag: '🇸🇿' },
  { code: 'ET', name: 'Éthiopie', dialCode: '+251', flag: '🇪🇹' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambie', dialCode: '+220', flag: '🇬🇲' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinée-Bissau', dialCode: '+245', flag: '🇬🇼' },
  { code: 'GQ', name: 'Guinée équatoriale', dialCode: '+240', flag: '🇬🇶' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'LS', name: 'Lesotho', dialCode: '+266', flag: '🇱🇸' },
  { code: 'LR', name: 'Libéria', dialCode: '+231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libye', dialCode: '+218', flag: '🇱🇾' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', dialCode: '+265', flag: '🇲🇼' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { code: 'MA', name: 'Maroc', dialCode: '+212', flag: '🇲🇦' },
  { code: 'MU', name: 'Maurice', dialCode: '+230', flag: '🇲🇺' },
  { code: 'MR', name: 'Mauritanie', dialCode: '+222', flag: '🇲🇷' },
  { code: 'MZ', name: 'Mozambique', dialCode: '+258', flag: '🇲🇿' },
  { code: 'NA', name: 'Namibie', dialCode: '+264', flag: '🇳🇦' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigéria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'UG', name: 'Ouganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼' },
  { code: 'ST', name: 'Sao Tomé-et-Principe', dialCode: '+239', flag: '🇸🇹' },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳' },
  { code: 'SC', name: 'Seychelles', dialCode: '+248', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', dialCode: '+232', flag: '🇸🇱' },
  { code: 'SO', name: 'Somalie', dialCode: '+252', flag: '🇸🇴' },
  { code: 'SD', name: 'Soudan', dialCode: '+249', flag: '🇸🇩' },
  { code: 'SS', name: 'Soudan du Sud', dialCode: '+211', flag: '🇸🇸' },
  { code: 'TZ', name: 'Tanzanie', dialCode: '+255', flag: '🇹🇿' },
  { code: 'TD', name: 'Tchad', dialCode: '+235', flag: '🇹🇩' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
  { code: 'TN', name: 'Tunisie', dialCode: '+216', flag: '🇹🇳' },
  { code: 'ZM', name: 'Zambie', dialCode: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼' },
  // Hors Afrique — fréquents.
  { code: 'DE', name: 'Allemagne', dialCode: '+49', flag: '🇩🇪' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'CN', name: 'Chine', dialCode: '+86', flag: '🇨🇳' },
  { code: 'AE', name: 'Émirats arabes unis', dialCode: '+971', flag: '🇦🇪' },
  { code: 'US', name: 'États-Unis', dialCode: '+1', flag: '🇺🇸' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IN', name: 'Inde', dialCode: '+91', flag: '🇮🇳' },
  { code: 'IT', name: 'Italie', dialCode: '+39', flag: '🇮🇹' },
  { code: 'LB', name: 'Liban', dialCode: '+961', flag: '🇱🇧' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'GB', name: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧' },
  { code: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭' },
  { code: 'TR', name: 'Turquie', dialCode: '+90', flag: '🇹🇷' },
];

/** Index par code ISO alpha-2. */
export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** Options pour un `mat-select` de pays (valeur = code ISO). */
export const COUNTRY_OPTIONS: EnumOption[] = COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.flag} ${c.name}`,
}));

/** Pays par défaut (RDC). */
export const DEFAULT_COUNTRY_CODE = 'CD';

/** Provinces par pays. Seule la RDC est couverte ; ailleurs → saisie libre. */
export const PROVINCES_BY_COUNTRY: Record<string, string[]> = {
  CD: [
    'Kinshasa',
    'Kongo-Central',
    'Kwango',
    'Kwilu',
    'Mai-Ndombe',
    'Kasaï',
    'Kasaï-Central',
    'Kasaï-Oriental',
    'Lomami',
    'Sankuru',
    'Maniema',
    'Sud-Kivu',
    'Nord-Kivu',
    'Ituri',
    'Haut-Uele',
    'Bas-Uele',
    'Tshopo',
    'Mongala',
    'Nord-Ubangi',
    'Sud-Ubangi',
    'Équateur',
    'Tshuapa',
    'Tanganyika',
    'Haut-Lomami',
    'Lualaba',
    'Haut-Katanga',
  ],
};

/** Provinces connues pour un pays (vide si non couvert → saisie libre). */
export function provincesFor(countryCode: string | null | undefined): string[] {
  return (countryCode && PROVINCES_BY_COUNTRY[countryCode]) || [];
}

export interface Currency {
  /** ISO 4217 (ex. `CDF`). */
  code: string;
  name: string;
  symbol: string;
}

/** Devises courantes en RDC et dans la région. */
export const CURRENCIES: Currency[] = [
  { code: 'CDF', name: 'Franc congolais', symbol: 'FC' },
  { code: 'USD', name: 'Dollar américain', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'XAF', name: 'Franc CFA (CEMAC)', symbol: 'FCFA' },
  { code: 'XOF', name: 'Franc CFA (UEMOA)', symbol: 'FCFA' },
  { code: 'RWF', name: 'Franc rwandais', symbol: 'FRw' },
  { code: 'UGX', name: 'Shilling ougandais', symbol: 'USh' },
  { code: 'KES', name: 'Shilling kényan', symbol: 'KSh' },
  { code: 'TZS', name: 'Shilling tanzanien', symbol: 'TSh' },
  { code: 'ZAR', name: 'Rand sud-africain', symbol: 'R' },
  { code: 'NGN', name: 'Naira nigérian', symbol: '₦' },
  { code: 'GBP', name: 'Livre sterling', symbol: '£' },
];

/** Index des devises par code ISO. */
export const CURRENCY_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

/** Symbole d'une devise (chaîne vide si inconnue). */
export function currencySymbolFor(code: string | null | undefined): string {
  return (code && CURRENCY_BY_CODE.get(code)?.symbol) || '';
}

/**
 * Fuseaux horaires usuels (RDC + Afrique + repères internationaux). Valeur =
 * identifiant IANA (stocké tel quel).
 */
export const TIMEZONE_OPTIONS: EnumOption[] = [
  { value: 'Africa/Kinshasa', label: 'Kinshasa (UTC+1)' },
  { value: 'Africa/Lubumbashi', label: 'Lubumbashi (UTC+2)' },
  { value: 'Africa/Brazzaville', label: 'Brazzaville (UTC+1)' },
  { value: 'Africa/Luanda', label: 'Luanda (UTC+1)' },
  { value: 'Africa/Lagos', label: 'Lagos (UTC+1)' },
  { value: 'Africa/Bangui', label: 'Bangui (UTC+1)' },
  { value: 'Africa/Douala', label: 'Douala (UTC+1)' },
  { value: 'Africa/Kigali', label: 'Kigali (UTC+2)' },
  { value: 'Africa/Bujumbura', label: 'Bujumbura (UTC+2)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (UTC+2)' },
  { value: 'Africa/Cairo', label: 'Le Caire (UTC+2)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (UTC+3)' },
  { value: 'Africa/Addis_Ababa', label: 'Addis-Abeba (UTC+3)' },
  { value: 'Africa/Abidjan', label: 'Abidjan (UTC+0)' },
  { value: 'Africa/Dakar', label: 'Dakar (UTC+0)' },
  { value: 'Africa/Casablanca', label: 'Casablanca (UTC+1)' },
  { value: 'Africa/Algiers', label: 'Alger (UTC+1)' },
  { value: 'Africa/Tunis', label: 'Tunis (UTC+1)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
  { value: 'Europe/Brussels', label: 'Bruxelles (UTC+1/+2)' },
  { value: 'Europe/London', label: 'Londres (UTC+0/+1)' },
  { value: 'America/New_York', label: 'New York (UTC−5/−4)' },
  { value: 'UTC', label: 'UTC' },
];

/** Langues d'enseignement proposées (valeur = code ISO 639-1). */
export const LANGUAGE_OF_INSTRUCTION_OPTIONS: EnumOption[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'pt', label: 'Portugais' },
  { value: 'es', label: 'Espagnol' },
];

/** Options pour un `mat-select` de devise (valeur = code ISO). */
export const CURRENCY_OPTIONS: EnumOption[] = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.name} (${c.symbol})`,
}));

/** Codes triés par longueur d'indicatif décroissante (pour le découpage E.164). */
const COUNTRIES_BY_DIAL_LENGTH = [...COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length,
);

/**
 * Découpe un numéro E.164 en `{ countryCode, national }`. À indicatif partagé
 * (ex. +1), renvoie le premier pays défini. Sans indicatif reconnu, retombe sur
 * la RDC et conserve les chiffres saisis.
 */
export function splitPhone(full: string | null | undefined): {
  countryCode: string;
  national: string;
} {
  const raw = (full ?? '').trim();
  if (!raw) return { countryCode: DEFAULT_COUNTRY_CODE, national: '' };
  if (raw.startsWith('+')) {
    const match = COUNTRIES_BY_DIAL_LENGTH.find((c) => raw.startsWith(c.dialCode));
    if (match) {
      return { countryCode: match.code, national: raw.slice(match.dialCode.length) };
    }
  }
  // Pas de `+` reconnu : on garde les chiffres et l'indicatif par défaut.
  return { countryCode: DEFAULT_COUNTRY_CODE, national: raw.replace(/^\+/, '') };
}

/**
 * Assemble un numéro E.164 à partir d'un code pays et d'un numéro national.
 * Numéro vide → chaîne vide (champ non renseigné).
 */
export function assemblePhone(countryCode: string, national: string): string {
  const digits = (national ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  const dial = COUNTRY_BY_CODE.get(countryCode)?.dialCode ?? '+243';
  return `${dial}${digits}`;
}

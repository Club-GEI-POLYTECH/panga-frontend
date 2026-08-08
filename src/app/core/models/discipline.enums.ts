import type { EnumOption } from './school.enums';

/** IncidentSeverity. */
export const INCIDENT_SEVERITY_OPTIONS: EnumOption[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Élevée' },
  { value: 'critical', label: 'Critique' },
];

/** IncidentType. */
export const INCIDENT_TYPE_OPTIONS: EnumOption[] = [
  { value: 'disruption', label: 'Perturbation en classe' },
  { value: 'disrespect', label: 'Manque de respect' },
  { value: 'fighting', label: 'Bagarre' },
  { value: 'bullying', label: 'Harcèlement' },
  { value: 'cheating', label: 'Tricherie' },
  { value: 'theft', label: 'Vol' },
  { value: 'vandalism', label: 'Vandalisme' },
  { value: 'drugs', label: 'Drogues' },
  { value: 'alcohol', label: 'Alcool' },
  { value: 'weapons', label: 'Armes' },
  { value: 'tardiness', label: 'Retards répétés' },
  { value: 'absenteeism', label: 'Absentéisme' },
  { value: 'dress_code', label: 'Non-respect du code vestimentaire' },
  { value: 'technology_misuse', label: 'Mauvaise utilisation de la technologie' },
  { value: 'other', label: 'Autre' },
];

/** IncidentStatus. */
export const INCIDENT_STATUS_OPTIONS: EnumOption[] = [
  { value: 'reported', label: 'Signalé' },
  { value: 'under_review', label: "En cours d'examen" },
  { value: 'resolved', label: 'Résolu' },
  { value: 'escalated', label: 'Escaladé' },
  { value: 'closed', label: 'Fermé' },
];

/** RecordType (discriminant des enregistrements disciplinaires). */
export const RECORD_TYPE_OPTIONS: EnumOption[] = [
  { value: 'incident', label: 'Incident' },
  { value: 'action', label: 'Action disciplinaire' },
  { value: 'sanction', label: 'Sanction' },
  { value: 'reward', label: 'Récompense' },
  { value: 'meeting', label: 'Réunion disciplinaire' },
];

/** ActionType. */
export const ACTION_TYPE_OPTIONS: EnumOption[] = [
  { value: 'warning', label: 'Avertissement' },
  { value: 'verbal_reprimand', label: 'Réprimande verbale' },
  { value: 'written_reprimand', label: 'Réprimande écrite' },
  { value: 'detention', label: 'Retenue' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'expulsion', label: 'Exclusion' },
  { value: 'community_service', label: 'Service communautaire' },
  { value: 'parent_meeting', label: 'Réunion avec les parents' },
  { value: 'counseling', label: 'Consultation' },
  { value: 'probation', label: 'Probation' },
  { value: 'other', label: 'Autre' },
];

/** ActionStatus. */
export const ACTION_STATUS_OPTIONS: EnumOption[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'active', label: 'Actif' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'appealed', label: 'Contesté' },
];

/** RewardType. */
export const REWARD_TYPE_OPTIONS: EnumOption[] = [
  { value: 'merit', label: 'Mérite' },
  { value: 'commendation', label: 'Félicitations' },
  { value: 'distinction', label: 'Distinction' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'prize', label: 'Prix' },
  { value: 'scholarship', label: 'Bourse' },
  { value: 'recognition', label: 'Reconnaissance' },
  { value: 'academic_excellence', label: 'Excellence académique' },
  { value: 'behavior_excellence', label: 'Excellence comportementale' },
  { value: 'attendance_excellence', label: "Excellence d'assiduité" },
  { value: 'service', label: 'Service communautaire' },
  { value: 'other', label: 'Autre' },
];

/** RewardLevel. */
export const REWARD_LEVEL_OPTIONS: EnumOption[] = [
  { value: 'class', label: 'Niveau classe' },
  { value: 'school', label: 'Niveau école' },
  { value: 'regional', label: 'Niveau régional' },
  { value: 'national', label: 'Niveau national' },
];

/** SanctionLevel. */
export const SANCTION_LEVEL_OPTIONS: EnumOption[] = [
  { value: 'minor', label: 'Mineure' },
  { value: 'moderate', label: 'Modérée' },
  { value: 'major', label: 'Majeure' },
  { value: 'severe', label: 'Sévère' },
];

/** SanctionCategory. */
export const SANCTION_CATEGORY_OPTIONS: EnumOption[] = [
  { value: 'academic', label: 'Académique' },
  { value: 'behavioral', label: 'Comportemental' },
  { value: 'attendance', label: 'Assiduité' },
  { value: 'dress_code', label: 'Code vestimentaire' },
  { value: 'technology', label: 'Technologie' },
  { value: 'safety', label: 'Sécurité' },
  { value: 'other', label: 'Autre' },
];

/** MeetingType (réunions disciplinaires — `/discipline/meetings`). */
export const DISCIPLINARY_MEETING_TYPE_OPTIONS: EnumOption[] = [
  { value: 'parent_teacher', label: 'Parent-Enseignant' },
  { value: 'disciplinary_committee', label: 'Comité disciplinaire' },
  { value: 'counseling', label: 'Consultation' },
  { value: 'mediation', label: 'Médiation' },
  { value: 'appeal', label: 'Appel' },
  { value: 'follow_up', label: 'Suivi' },
];

/** MeetingStatus. */
export const MEETING_STATUS_OPTIONS: EnumOption[] = [
  { value: 'scheduled', label: 'Planifié' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'rescheduled', label: 'Reprogrammé' },
];

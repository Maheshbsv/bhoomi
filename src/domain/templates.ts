export type TemplateKey =
  | 'SURVEY_VILLAGE_MISMATCH'
  | 'MULTIPLE_ENTRIES_NEED_FATHER_NAME'
  | 'RECORD_BRITTLE_SEARCH_ONGOING'
  | 'REQUEST_CLEARER_PHOTO';

/** Template text lives in messages under `templates.<KEY>`. */
export const CLARIFICATION_TEMPLATES: { key: TemplateKey; needsReply: boolean }[] = [
  { key: 'SURVEY_VILLAGE_MISMATCH', needsReply: true },
  { key: 'MULTIPLE_ENTRIES_NEED_FATHER_NAME', needsReply: true },
  { key: 'RECORD_BRITTLE_SEARCH_ONGOING', needsReply: false },
  { key: 'REQUEST_CLEARER_PHOTO', needsReply: true },
];

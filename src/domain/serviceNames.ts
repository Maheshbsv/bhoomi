import type { ServiceType } from "./types";

/** Service names in both languages, so client components do not import the full message catalogs. Kept in sync by tests/unit/messages.test.ts. */
export const SERVICE_NAMES: Record<ServiceType, { en: string; kn: string }> = {
  "OLD_RTC": {
    "en": "Old RTC (Pahani)",
    "kn": "ಹಳೆಯ ಪಹಣಿ"
  },
  "OLD_MR": {
    "en": "Old Mutation Register",
    "kn": "ಹಳೆಯ ಮ್ಯುಟೇಶನ್ ರಿಜಿಸ್ಟರ್"
  },
  "LND_FILE": {
    "en": "Land Grant File (Darkhast)",
    "kn": "ದರಖಾಸ್ತು ಕಡತ"
  },
  "LRF_FILE": {
    "en": "Land Reforms File",
    "kn": "ಭೂ ಸುಧಾರಣೆ ಕಡತ"
  },
  "RRT_FILE": {
    "en": "RRT Dispute File",
    "kn": "ಆರ್‌ಆರ್‌ಟಿ ವಿವಾದ ಕಡತ"
  }
};

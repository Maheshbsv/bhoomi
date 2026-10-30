import type { Location, Role, User } from '@/domain/types';

// Illustrative names only; not an authoritative location master.
type N = [en: string, kn: string];
type Hobli = { name: N; villages: N[] };
type Taluk = { name: N; hoblis: Hobli[] };
type District = { name: N; taluks: Taluk[] };

const DISTRICTS: District[] = [
  {
    name: ['Bengaluru Urban', 'ಬೆಂಗಳೂರು ನಗರ'],
    taluks: [
      {
        name: ['Yelahanka', 'ಯಲಹಂಕ'],
        hoblis: [
          {
            name: ['Jala', 'ಜಾಲ'],
            villages: [
              ['Bagalur', 'ಬಾಗಲೂರು'],
              ['Hunasamaranahalli', 'ಹುಣಸಮಾರನಹಳ್ಳಿ'],
              ['Bettahalasur', 'ಬೆಟ್ಟಹಲಸೂರು'],
            ],
          },
          {
            name: ['Hesaraghatta', 'ಹೆಸರಘಟ್ಟ'],
            villages: [
              ['Hesaraghatta', 'ಹೆಸರಘಟ್ಟ'],
              ['Rajanukunte', 'ರಾಜಾನುಕುಂಟೆ'],
            ],
          },
        ],
      },
      {
        name: ['Anekal', 'ಆನೇಕಲ್'],
        hoblis: [
          {
            name: ['Sarjapura', 'ಸರ್ಜಾಪುರ'],
            villages: [
              ['Sarjapura', 'ಸರ್ಜಾಪುರ'],
              ['Dommasandra', 'ದೊಮ್ಮಸಂದ್ರ'],
              ['Mugalur', 'ಮುಗಳೂರು'],
            ],
          },
        ],
      },
    ],
  },
  {
    name: ['Bengaluru Rural', 'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ'],
    taluks: [
      {
        name: ['Devanahalli', 'ದೇವನಹಳ್ಳಿ'],
        hoblis: [
          {
            name: ['Kasaba', 'ಕಸಬಾ'],
            villages: [
              ['Devanahalli', 'ದೇವನಹಳ್ಳಿ'],
              ['Avathi', 'ಆವತಿ'],
              ['Bidaluru', 'ಬಿದಲೂರು'],
            ],
          },
          {
            name: ['Kundana', 'ಕುಂದಾಣ'],
            villages: [
              ['Kundana', 'ಕುಂದಾಣ'],
              ['Bettakote', 'ಬೆಟ್ಟಕೋಟೆ'],
            ],
          },
        ],
      },
      {
        name: ['Hoskote', 'ಹೊಸಕೋಟೆ'],
        hoblis: [
          {
            name: ['Kasaba', 'ಕಸಬಾ'],
            villages: [
              ['Hoskote', 'ಹೊಸಕೋಟೆ'],
              ['Kambalipura', 'ಕಂಬಳಿಪುರ'],
            ],
          },
        ],
      },
    ],
  },
  {
    name: ['Mysuru', 'ಮೈಸೂರು'],
    taluks: [
      {
        name: ['Mysuru', 'ಮೈಸೂರು'],
        hoblis: [
          {
            name: ['Varuna', 'ವರುಣಾ'],
            villages: [
              ['Varuna', 'ವರುಣಾ'],
              ['Vajamangala', 'ವಜಮಂಗಲ'],
            ],
          },
        ],
      },
      {
        name: ['Nanjangud', 'ನಂಜನಗೂಡು'],
        hoblis: [
          {
            name: ['Kasaba', 'ಕಸಬಾ'],
            villages: [
              ['Nanjangud', 'ನಂಜನಗೂಡು'],
              ['Devarasanahalli', 'ದೇವರಸನಹಳ್ಳಿ'],
            ],
          },
        ],
      },
    ],
  },
  {
    name: ['Tumakuru', 'ತುಮಕೂರು'],
    taluks: [
      {
        name: ['Tumakuru', 'ತುಮಕೂರು'],
        hoblis: [
          {
            name: ['Kasaba', 'ಕಸಬಾ'],
            villages: [
              ['Kyatsandra', 'ಕ್ಯಾತ್ಸಂದ್ರ'],
              ['Hirehalli', 'ಹಿರೇಹಳ್ಳಿ'],
            ],
          },
        ],
      },
      {
        name: ['Tiptur', 'ತಿಪಟೂರು'],
        hoblis: [
          {
            name: ['Kasaba', 'ಕಸಬಾ'],
            villages: [
              ['Tiptur', 'ತಿಪಟೂರು'],
              ['Halkurke', 'ಹಾಲ್ಕುರಿಕೆ'],
            ],
          },
        ],
      },
    ],
  },
];

const PINCODES: Record<string, string> = {
  'Bengaluru Urban': '560064',
  'Bengaluru Rural': '562110',
  Mysuru: '570001',
  Tumakuru: '572101',
};

export function buildLocations(): Location[] {
  const out: Location[] = [];
  let id = 1;
  for (const d of DISTRICTS)
    for (const t of d.taluks)
      for (const h of t.hoblis)
        for (const v of h.villages)
          out.push({
            id: id++,
            districtEn: d.name[0],
            districtKn: d.name[1],
            talukEn: t.name[0],
            talukKn: t.name[1],
            hobliEn: h.name[0],
            hobliKn: h.name[1],
            villageEn: v[0],
            villageKn: v[1],
            pincode: PINCODES[d.name[0]],
            isActive: true,
          });
  return out;
}

export const USER_IDS = {
  ramesh: 'seed-user-ramesh',
  lakshmamma: 'seed-user-lakshmamma',
  imran: 'seed-user-imran',
  kavya: 'seed-user-kavya',
  suma: 'seed-user-suma',
  prakash: 'seed-user-prakash',
} as const;

export const MATTERS = ['Devanahalli 15-Acre Title Verification', 'Hoskote Layout Due Diligence'] as const;

export function buildUsers(now: Date): User[] {
  const createdAt = new Date(now.getTime() - 60 * 86_400_000).toISOString();
  const u = (id: string, phone: string, fullName: string, role: Role): User => ({
    id,
    phoneNumber: `+91${phone}`,
    fullName,
    role,
    createdAt,
  });
  return [
    u(USER_IDS.ramesh, '9876543210', 'Ramesh Gowda', 'CITIZEN'),
    u(USER_IDS.lakshmamma, '9000000003', 'Lakshmamma', 'CITIZEN'),
    u(USER_IDS.imran, '9000000004', 'Syed Imran', 'CITIZEN'),
    u(USER_IDS.kavya, '9000000005', 'Adv. Kavya Rao', 'ADVOCATE'),
    u(USER_IDS.suma, '9000000001', 'Operator Suma', 'OPERATOR'),
    u(USER_IDS.prakash, '9000000002', 'Operator Prakash', 'OPERATOR'),
  ];
}

export const RUNNERS = [
  'Nagaraj (Yelahanka)',
  'Mahadev (Devanahalli)',
  'Shivanna (Hoskote)',
  'Basavaraj (Mysuru)',
  'Ravi (Tumakuru)',
] as const;

export function runnerFor(loc: Location): string {
  if (loc.talukEn === 'Devanahalli') return RUNNERS[1];
  if (loc.talukEn === 'Hoskote') return RUNNERS[2];
  if (loc.districtEn === 'Mysuru') return RUNNERS[3];
  if (loc.districtEn === 'Tumakuru') return RUNNERS[4];
  return RUNNERS[0];
}

export const EN_NAMES = [
  'Venkatesh Reddy',
  'Narayanaswamy',
  'Gangamma',
  'Abdul Rahim',
  'Chikkathimmaiah',
  'Padmavathi',
  'Manjunath Gowda',
  'Muniyamma',
  'Krishnappa',
  'Sharifa Begum',
  'Lingaraju',
  'Honnamma',
];
export const KN_NAMES = [
  'ಮುನಿಯಪ್ಪ',
  'ಲಕ್ಷ್ಮಮ್ಮ ಕೋಂ ವೆಂಕಟಪ್ಪ',
  'ಚನ್ನಬಸಪ್ಪ',
  'ನಾರಾಯಣಸ್ವಾಮಿ',
  'ಹನುಮಂತರಾಯಪ್ಪ',
  'ಗೌರಮ್ಮ',
];
export const KN_REPLIES = ['ತಂದೆ: ಚಿಕ್ಕಣ್ಣ', 'ಸರ್ವೆ ನಂಬರ್ ಸರಿಯಾಗಿದೆ, ಗ್ರಾಮ ಬಾಗಲೂರು', 'ಸ್ಪಷ್ಟವಾದ ಫೋಟೋ ಕಳುಹಿಸಿದ್ದೇನೆ'];
export const EN_REPLIES = ['Father: Chikkanna', 'Survey number is correct; village is as selected.'];
export const SURVEY_NOS = ['45', '108/A', '23/2', '7', '311', '56/1B', '92', '14/3', '201', '68/A'];

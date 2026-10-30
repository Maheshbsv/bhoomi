export interface Dual {
  en: string;
  kn: string;
}

/** Field labels always show both languages, whatever the active locale. */
export const FIELD_LABELS = {
  surveyNo: { en: 'Survey No', kn: 'ಸರ್ವೆ ನಂಬರ್' },
  hissaNo: { en: 'Hissa No', kn: 'ಹಿಸ್ಸಾ ನಂಬರ್' },
  yearFrom: { en: 'From year', kn: 'ಆರಂಭ ವರ್ಷ' },
  yearTo: { en: 'To year', kn: 'ಕೊನೆಯ ವರ್ಷ' },
  khataNo: { en: 'Khata No', kn: 'ಖಾತಾ ನಂಬರ್' },
  recordedOwnerName: { en: 'Recorded owner name', kn: 'ದಾಖಲೆಯಲ್ಲಿರುವ ಮಾಲೀಕರ ಹೆಸರು' },
  mrNumber: { en: 'MR No', kn: 'ಎಂ.ಆರ್. ಸಂಖ್ಯೆ' },
  approxYear: { en: 'Approximate year', kn: 'ಅಂದಾಜು ವರ್ಷ' },
  natureOfAcquisition: { en: 'Nature of acquisition', kn: 'ಸ್ವಾಧೀನದ ಸ್ವರೂಪ' },
  partiesInvolved: { en: 'Parties involved', kn: 'ಸಂಬಂಧಿತ ಪಕ್ಷಗಳು' },
  granteeName: { en: 'Grantee name', kn: 'ಮಂಜೂರಾತಿದಾರರ ಹೆಸರು' },
  grantOrderNo: { en: 'Grant order No', kn: 'ಮಂಜೂರಾತಿ ಆದೇಶ ಸಂಖ್ಯೆ' },
  saguvaliChitNo: { en: 'Saguvali chit No', kn: 'ಸಾಗುವಳಿ ಚೀಟಿ ಸಂಖ್ಯೆ' },
  grantYear: { en: 'Grant year', kn: 'ಮಂಜೂರಾತಿ ವರ್ಷ' },
  period: { en: 'Year / period', kn: 'ವರ್ಷ / ಅವಧಿ' },
  formType: { en: 'Form type', kn: 'ನಮೂನೆಯ ಪ್ರಕಾರ' },
  applicantTenantName: { en: 'Applicant / tenant name', kn: 'ಅರ್ಜಿದಾರ / ಗೇಣಿದಾರರ ಹೆಸರು' },
  landlordName: { en: 'Landlord name', kn: 'ಭೂಮಾಲೀಕರ ಹೆಸರು' },
  tribunalCaseNo: { en: 'Tribunal case No', kn: 'ನ್ಯಾಯಮಂಡಳಿ ಪ್ರಕರಣ ಸಂಖ್ಯೆ' },
  courtLevel: { en: 'Court level', kn: 'ನ್ಯಾಯಾಲಯದ ಹಂತ' },
  disputeCaseNo: { en: 'Dispute case No', kn: 'ವಿವಾದ ಪ್ರಕರಣ ಸಂಖ್ಯೆ' },
  petitionerName: { en: 'Petitioner name', kn: 'ಅರ್ಜಿದಾರರ ಹೆಸರು' },
  respondentName: { en: 'Respondent name', kn: 'ಪ್ರತಿವಾದಿಯ ಹೆಸರು' },
  disputeYear: { en: 'Dispute year', kn: 'ವಿವಾದದ ವರ್ಷ' },
  district: { en: 'District', kn: 'ಜಿಲ್ಲೆ' },
  taluk: { en: 'Taluk', kn: 'ತಾಲ್ಲೂಕು' },
  hobli: { en: 'Hobli', kn: 'ಹೋಬಳಿ' },
  village: { en: 'Village', kn: 'ಗ್ರಾಮ' },
  addrName: { en: 'Full name', kn: 'ಪೂರ್ಣ ಹೆಸರು' },
  addrLine1: { en: 'Address line 1', kn: 'ವಿಳಾಸ ಸಾಲು 1' },
  addrLine2: { en: 'Address line 2', kn: 'ವಿಳಾಸ ಸಾಲು 2' },
  addrCity: { en: 'Town / city', kn: 'ಊರು / ನಗರ' },
  addrDistrict: { en: 'District', kn: 'ಜಿಲ್ಲೆ' },
  addrPincode: { en: 'Pincode', kn: 'ಪಿನ್‌ಕೋಡ್' },
  email: { en: 'Email', kn: 'ಇಮೇಲ್' },
  phone: { en: 'Mobile number', kn: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ' },
  otp: { en: 'OTP', kn: 'ಒಟಿಪಿ' },
} satisfies Record<string, Dual>;

export const OPTION_LABELS: Record<string, Dual> = {
  SALE: { en: 'Sale', kn: 'ಮಾರಾಟ' },
  INHERITANCE: { en: 'Inheritance', kn: 'ಪಿತ್ರಾರ್ಜಿತ' },
  PARTITION: { en: 'Partition', kn: 'ಪಾಲು ವಿಭಾಗ' },
  GIFT: { en: 'Gift', kn: 'ದಾನ' },
  COURT_ORDER: { en: 'Court order', kn: 'ನ್ಯಾಯಾಲಯದ ಆದೇಶ' },
  FORM_7: { en: 'Form 7', kn: 'ನಮೂನೆ 7' },
  FORM_7A: { en: 'Form 7A', kn: 'ನಮೂನೆ 7ಎ' },
  OCCUPANCY_CERT: { en: 'Occupancy certificate', kn: 'ಸ್ವಾಧೀನ ಹಕ್ಕು ಪ್ರಮಾಣಪತ್ರ' },
  TAHSILDAR: { en: 'Tahsildar', kn: 'ತಹಶೀಲ್ದಾರ್' },
  AC: { en: 'Assistant Commissioner', kn: 'ಸಹಾಯಕ ಆಯುಕ್ತರು' },
  DC: { en: 'Deputy Commissioner', kn: 'ಉಪ ಆಯುಕ್ತರು' },
};

export type FieldName = keyof typeof FIELD_LABELS;

export const dual = (d: Dual): string => `${d.en} / ${d.kn}`;

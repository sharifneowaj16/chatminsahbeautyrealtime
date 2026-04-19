const DEFAULT_CONTACT_EMAIL = 'sharifneowaz577@gmail.com';
const SITE_URL = 'https://minsahbeauty.cloud';
const FACEBOOK_SETTINGS_URL = 'https://www.facebook.com/settings?tab=applications';

function isUsableContactEmail(email?: string | null) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 && !normalized.startsWith('noreply@');
}

export function getPrivacyContactEmail() {
  const candidates = [
    process.env.PRIVACY_CONTACT_EMAIL,
    process.env.DATA_DELETION_EMAIL,
    process.env.SUPPORT_EMAIL,
    process.env.EMAIL_FROM,
  ];

  const configured = candidates.find(isUsableContactEmail);
  return configured ?? DEFAULT_CONTACT_EMAIL;
}

export function buildPublicUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export const LEGAL_EFFECTIVE_DATE = 'April 19, 2026';
export const PRIVACY_POLICY_URL = buildPublicUrl('/privacy-policy');
export const DELETE_DATA_PAGE_URL = buildPublicUrl('/delete-data');
export const DATA_DELETION_CALLBACK_URL = buildPublicUrl('/data-deletion');
export const FACEBOOK_APP_SETTINGS_URL = FACEBOOK_SETTINGS_URL;

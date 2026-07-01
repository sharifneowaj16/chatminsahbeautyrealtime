import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Privacy Policy | Minsah Beauty',
  description: 'Privacy Policy for Minsah Beauty covering account data, cookies, analytics, ads measurement, and customer rights.',
};

export default function PrivacyPage() {
  redirect('/privacy-policy');
}

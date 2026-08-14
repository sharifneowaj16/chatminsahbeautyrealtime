import { redirect } from 'next/navigation';
import { noindexMetadata } from '@/lib/metadata/noindex';

export const metadata = {
  ...noindexMetadata,
  title: 'Privacy Policy',
  description: 'Privacy Policy for Minsah Beauty covering account data, cookies, analytics, ads measurement, and customer rights.',
};

export default function PrivacyPage() {
  redirect('/privacy-policy');
}

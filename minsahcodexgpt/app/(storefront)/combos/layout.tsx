import { noindexMetadata } from '@/lib/metadata/noindex';

export const metadata = noindexMetadata;

export default function NoindexLayout({ children }: { children: React.ReactNode }) {
  return children;
}

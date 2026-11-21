import { noindexMetadata } from '@/lib/metadata/noindex';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = noindexMetadata;

export default function NoindexLayout({ children }: { children: React.ReactNode }) {
  return <div lang="en" className="contents">{children}</div>;
}

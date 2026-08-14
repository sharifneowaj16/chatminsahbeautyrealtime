import { noindexMetadata } from '@/lib/metadata/noindex';

export const metadata = noindexMetadata;

export default function NoindexLayout({ children }: { children: React.ReactNode }) {
  return <div lang="bn-BD" className="contents">{children}</div>;
}

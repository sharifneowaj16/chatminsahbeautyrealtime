import Link from 'next/link';

export default function RootNotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-12" aria-labelledby="not-found-title">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-minsah-secondary">Error 404</p>
        <h1 id="not-found-title" className="mt-3 text-4xl font-black text-minsah-dark sm:text-5xl">Page not found</h1>
        <p className="mx-auto mt-4 max-w-md text-minsah-secondary">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-minsah-primary px-7 py-3 font-bold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minsah-primary focus-visible:ring-offset-2"
        >
          Go back home
        </Link>
      </div>
    </main>
  );
}

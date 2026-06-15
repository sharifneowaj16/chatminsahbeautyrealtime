import HomeSearch from './HomeSearch';

export default function HomeHeader() {
  return (
    <header className="bg-minsah-dark text-minsah-light sticky top-0 z-50 shadow-md">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs">9:41</span>
          </div>
          <h1 className="text-xl font-bold">Home</h1>
          <div className="w-12"></div>
        </div>

        <HomeSearch />
      </div>
    </header>
  );
}

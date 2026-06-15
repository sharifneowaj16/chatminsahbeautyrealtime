'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

interface Suggestion {
  text: string;
  slug: string;
  productName: string;
  price: number;
  image?: string;
}

export default function HomeSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (q) {
      setShowSuggestions(false);
      router.push(`/shop?q=${encodeURIComponent(q)}`);
    }
  }, [searchQuery, router]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}&limit=6`);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setShowSuggestions(true);
      } catch {
        // Search suggestions are optional; the full search still works.
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative">
      <button
        onClick={handleSearch}
        className="absolute left-0 top-0 z-10 flex h-full min-h-11 w-11 items-center justify-center text-minsah-secondary"
        aria-label="Search"
      >
        <Search size={20} />
      </button>
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder="Search here"
        className="w-full pl-12 pr-4 py-3 bg-minsah-accent text-minsah-dark placeholder:text-minsah-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-minsah-primary"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-minsah-accent rounded-lg shadow-lg z-50 overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <li key={index}>
              <Link
                href={suggestion.slug ? `/products/${suggestion.slug}` : `/shop?q=${encodeURIComponent(suggestion.text)}`}
                onClick={() => setShowSuggestions(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-minsah-accent/50 transition-colors"
              >
                {suggestion.image && (
                  <img src={suggestion.image} alt={suggestion.productName} className="w-9 h-9 object-cover rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-minsah-dark truncate">
                    {suggestion.productName || suggestion.text}
                  </p>
                  {suggestion.price > 0 && (
                    <p className="text-xs text-minsah-secondary">৳{suggestion.price.toLocaleString()}</p>
                  )}
                </div>
                <Search size={14} className="text-minsah-secondary flex-shrink-0" />
              </Link>
            </li>
          ))}
          <li>
            <button
              onClick={handleSearch}
              className="w-full text-left px-4 py-2.5 text-sm text-minsah-primary font-medium hover:bg-minsah-accent/50 transition-colors border-t border-minsah-accent"
            >
              See all results for &ldquo;{searchQuery}&rdquo;
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

import React from 'react';
import { Search, X, Sparkles, Compass, Headphones } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectGenre: (genre: string) => void;
  activeGenre: string;
  onOpenStudio?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onSelectGenre,
  onOpenStudio,
}) => {
  return (
    <header className="site-header">
      <div className="container nav-wrapper">
        {/* Brand Identity */}
        <a href="#" className="brand-link" onClick={() => onSelectGenre('all')}>
          <div className="brand-mark">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#14181E" />
              <path d="M10 23V9l12 7z" fill="#E09F3E" />
              <circle cx="22" cy="16" r="3" fill="#FAF7F2" />
            </svg>
          </div>
          <div className="brand-title-group">
            <span className="brand-name">StoryCanvas</span>
            <span className="brand-tagline">Visual Stories & Narration</span>
          </div>
        </a>

        {/* Search Bar (Ref 1 & 2) */}
        <div className="nav-search-container">
          <input
            type="text"
            className="search-box"
            placeholder="Search stories, narrators, art styles..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <Search className="search-icon" size={17} />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Nav Actions */}
        <nav className="nav-actions">
          <a href="#curated-gallery" className="nav-link">
            <Compass size={16} />
            <span className="nav-link-text">Explore Stories</span>
          </a>
          <a href="#daily-vignettes" className="nav-link">
            <Headphones size={16} />
            <span className="nav-link-text">Daily Notes</span>
          </a>
          <button
            className="btn-primary-compact"
            onClick={onOpenStudio}
            title="Create or remix stories"
          >
            <Sparkles size={15} />
            <span>Studio Mode</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

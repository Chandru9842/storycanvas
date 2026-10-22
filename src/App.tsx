import { useState, useMemo, useEffect } from 'react';
import { featuredStory, curatedStories, dailyVignettes, genreCategories } from './data/stories';
import type { Story, DailyNote } from './types';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { Navbar } from './components/Navbar';
import { StoryHero } from './components/StoryHero';
import { StoryCard } from './components/StoryCard';
import { AudioVignettes } from './components/AudioVignettes';
import { AudioDock } from './components/AudioDock';
import { StoryModal } from './components/StoryModal';
import { StudioModal } from './components/StudioModal';
import { StoryReader } from './components/StoryReader';
import { ToastNotice } from './components/ToastNotice';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { Footer } from './components/Footer';
import { SearchX, Sparkles, RotateCcw } from 'lucide-react';
import { calibrateStoryChapters } from './utils/audioSync';

export function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('all');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isStudioOpen, setIsStudioOpen] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('studio') === 'true';
    } catch {
      return false;
    }
  });

  const [generatedStories, setGeneratedStories] = useState<Story[]>(() => {
    try {
      const saved = localStorage.getItem('storycanvas_generated_stories');
      if (!saved) return [];
      const parsed: Story[] = JSON.parse(saved);
      let needsSave = false;
      const sanitized = parsed.map((story) => {
        if (
          Array.isArray(story.chapters) &&
          story.chapters.length > 1 &&
          story.durationSec > 0
        ) {
          const lastChap = story.chapters[story.chapters.length - 1];
          if (lastChap.timeSec >= story.durationSec || story.chapters.some(c => c.timeSec >= story.durationSec)) {
            needsSave = true;
            return calibrateStoryChapters(story, story.durationSec);
          }
        }
        return story;
      });
      if (needsSave) {
        localStorage.setItem('storycanvas_generated_stories', JSON.stringify(sanitized));
      }
      return sanitized;
    } catch {
      return [];
    }
  });

  const [deletedStoryIds, setDeletedStoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('storycanvas_deleted_story_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allCuratedStories = useMemo(() => {
    return [...generatedStories, ...curatedStories].filter(
      (s) => !deletedStoryIds.includes(s.id)
    );
  }, [generatedStories, deletedStoryIds]);

  // Auto-dismiss custom toast after 4s
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const [activeReaderStory, setActiveReaderStory] = useState<Story | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const readId = params.get('read');
      if (readId === featuredStory.id) return featuredStory;
      if (readId) {
        const foundGen = generatedStories.find((s) => s.id === readId);
        if (foundGen) return foundGen;
        return curatedStories.find((s) => s.id === readId) || null;
      }
    } catch {
      // fallback
    }
    return null;
  });

  // Handle browser back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const readId = params.get('read');
        if (readId === featuredStory.id) {
          setActiveReaderStory(featuredStory);
        } else if (readId) {
          const found = allCuratedStories.find((s) => s.id === readId);
          setActiveReaderStory(found || null);
        } else {
          setActiveReaderStory(null);
        }
      } catch {
        // fallback
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allCuratedStories]);

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    noticeMessage,
    playTrack,
    togglePlay,
    seek,
    skip,
    setRate,
    setVolumeLevel,
    toggleMute,
    closePlayer,
    dismissNotice,
  } = useAudioPlayer();

  // Filter curated and generated stories by active genre and search query
  const filteredStories = useMemo(() => {
    return allCuratedStories.filter((story) => {
      // Genre filter
      const matchesGenre = activeGenre === 'all' || story.genre === activeGenre;

      // Search query filter
      if (!searchQuery.trim()) return matchesGenre;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        story.title.toLowerCase().includes(q) ||
        story.subtitle.toLowerCase().includes(q) ||
        story.author.toLowerCase().includes(q) ||
        story.narrator.toLowerCase().includes(q) ||
        story.synopsis.toLowerCase().includes(q) ||
        story.artStyle.toLowerCase().includes(q) ||
        story.tags.some((t) => t.toLowerCase().includes(q));

      return matchesGenre && matchesSearch;
    });
  }, [allCuratedStories, activeGenre, searchQuery]);

  // Handle newly synthesized AI story from Studio
  const handleStoryCreated = (newStory: Story) => {
    setGeneratedStories((prev) => {
      const updated = [newStory, ...prev];
      try {
        localStorage.setItem('storycanvas_generated_stories', JSON.stringify(updated));
      } catch {
        // fallback
      }
      return updated;
    });
    handleOpenReader(newStory);
  };

  // Open the dedicated story reader view
  const handleOpenReader = (story: Story) => {
    const calibrated = calibrateStoryChapters(story, story.durationSec);
    setActiveReaderStory(calibrated);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('read', story.id);
      window.history.pushState({}, '', url.toString());
    } catch {
      // fallback
    }
    if (calibrated.isPlayable) {
      playTrack(calibrated);
    }
  };

  const handleCloseReader = () => {
    setActiveReaderStory(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('read');
      window.history.pushState({}, '', url.toString());
    } catch {
      // fallback
    }
  };

  // Story deletion handlers (Ref Requirements 3, 4, 5, 6, 8)
  const handleDeleteRequest = (story: Story) => {
    setStoryToDelete(story);
  };

  const handleConfirmDelete = () => {
    if (!storyToDelete) return;
    try {
      const targetId = storyToDelete.id;

      // 1. If currently in reader, navigate back safely to archive
      if (activeReaderStory?.id === targetId) {
        handleCloseReader();
      }

      // 2. If playing or loaded in player, stop playback & close dock
      if (currentTrack?.id === targetId) {
        closePlayer();
      }

      // 3. If opened in story modal, close modal
      if (selectedStory?.id === targetId) {
        setSelectedStory(null);
      }

      // 4. Update generatedStories in state & localStorage if it was generated
      setGeneratedStories((prev) => {
        const filtered = prev.filter((s) => s.id !== targetId);
        try {
          localStorage.setItem('storycanvas_generated_stories', JSON.stringify(filtered));
        } catch {
          // fallback
        }
        return filtered;
      });

      // 5. Update deletedStoryIds in state & localStorage
      setDeletedStoryIds((prev) => {
        const updated = Array.from(new Set([...prev, targetId]));
        try {
          localStorage.setItem('storycanvas_deleted_story_ids', JSON.stringify(updated));
        } catch {
          // fallback
        }
        return updated;
      });

      // 6. Success notification
      setToastMessage(`"${storyToDelete.title}" was removed from your archive.`);
      setStoryToDelete(null);
    } catch (err: unknown) {
      console.error('Failed to delete story:', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to delete story.');
      setStoryToDelete(null);
    }
  };

  // Restore deleted default curated stories if requested
  const handleRestoreDefaults = () => {
    setDeletedStoryIds([]);
    try {
      localStorage.removeItem('storycanvas_deleted_story_ids');
    } catch {
      // fallback
    }
    setToastMessage('Default curated stories restored to archive.');
  };

  return (
    <div className="storycanvas-app">
      {/* Toast Notice for placeholders / status / delete notifications */}
      <ToastNotice
        message={toastMessage || noticeMessage}
        onDismiss={() => {
          setToastMessage(null);
          dismissNotice();
        }}
      />

      {/* Confirmation Dialog for Story Deletion (Ref Requirement 3) */}
      <ConfirmDeleteModal
        isOpen={Boolean(storyToDelete)}
        story={storyToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setStoryToDelete(null)}
      />

      {activeReaderStory ? (
        /* Dedicated Immersive Story Reader View (Phase 2) */
        <StoryReader
          story={activeReaderStory}
          onBack={handleCloseReader}
          isPlaying={isPlaying && currentTrack?.id === activeReaderStory.id}
          currentTime={currentTrack?.id === activeReaderStory.id ? currentTime : 0}
          duration={currentTrack?.id === activeReaderStory.id && duration > 0 ? duration : (activeReaderStory.durationSec || 0)}
          playbackRate={playbackRate}
          volume={volume}
          isMuted={isMuted}
          onPlay={playTrack}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onSkip={skip}
          onSetRate={setRate}
          onSetVolume={setVolumeLevel}
          onToggleMute={toggleMute}
        />
      ) : (
        /* Homepage View (Phase 1) */
        <>
          {/* Editorial Navbar */}
          <Navbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectGenre={setActiveGenre}
            activeGenre={activeGenre}
            onOpenStudio={() => setIsStudioOpen(true)}
          />

          <main>
            {/* Cinematic Featured Story Hero */}
            <StoryHero
              story={featuredStory}
              isPlaying={isPlaying}
              isCurrentTrack={currentTrack?.id === featuredStory.id}
              onPlay={playTrack}
              onOpenDetails={setSelectedStory}
              onOpenReader={handleOpenReader}
              onSelectChapter={(chap) => {
                handleOpenReader(featuredStory);
                setTimeout(() => seek(chap.timeSec), 150);
              }}
            />

            {/* Curated Story Gallery & Genre Filters */}
            <section id="curated-gallery" className="gallery-section">
              <div className="container">
                {/* Gallery Section Header */}
                <div className="gallery-header-row">
                  <div className="gallery-title-group">
                    <span className="gallery-eyebrow">The Curated Archive</span>
                    <h2 className="gallery-main-heading">Illustrated Literary Narratives</h2>
                    <p className="gallery-subheading">
                      Each story is illuminated by bespoke visual artwork and brought to life through immersive voice narration.
                    </p>
                  </div>
                </div>

                {/* Genre Filter Tabs */}
                <div className="genre-filter-bar">
                  {genreCategories.map((cat) => {
                    const isFeaturedIncluded = !deletedStoryIds.includes(featuredStory.id);
                    const count =
                      cat.id === 'all'
                        ? allCuratedStories.length + (isFeaturedIncluded ? 1 : 0)
                        : allCuratedStories.filter((s) => s.genre === cat.id).length +
                          (featuredStory.genre === cat.id && isFeaturedIncluded ? 1 : 0);
                    return (
                      <button
                        key={cat.id}
                        className={`genre-filter-btn ${activeGenre === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveGenre(cat.id)}
                      >
                        <span>{cat.label}</span>
                        <span className="genre-count-badge">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Query Feedback Pill */}
                {searchQuery && (
                  <div className="search-results-feedback">
                    <span>
                      Showing results for "<strong>{searchQuery}</strong>" (
                      {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'} found)
                    </span>
                    <span className="clear-search-link" onClick={() => setSearchQuery('')}>
                      Reset search
                    </span>
                  </div>
                )}

                {/* Story Grid */}
                {filteredStories.length > 0 ? (
                  <div className="story-grid">
                    {filteredStories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={story}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentTrack?.id === story.id}
                        onPlay={playTrack}
                        onOpenDetails={setSelectedStory}
                        onOpenReader={handleOpenReader}
                        onDelete={handleDeleteRequest}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      background: 'rgba(24, 30, 39, 0.4)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px dashed var(--border-medium)',
                      maxWidth: '540px',
                      margin: '0 auto',
                    }}
                  >
                    <SearchX size={36} style={{ color: 'var(--amber-primary)', margin: '0 auto 14px' }} />
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '8px' }}>
                      No Stories Found
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                      No stories match your current filter or search criteria for "{searchQuery}".
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn-primary-compact"
                        onClick={() => {
                          setSearchQuery('');
                          setActiveGenre('all');
                        }}
                      >
                        <Sparkles size={14} />
                        <span>View All Stories</span>
                      </button>

                      {deletedStoryIds.length > 0 && (
                        <button
                          className="btn-primary-compact"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                          onClick={handleRestoreDefaults}
                        >
                          <RotateCcw size={14} />
                          <span>Restore Default Archive</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Daily Notes & Audio Vignettes */}
            <AudioVignettes
              initialVignettes={dailyVignettes}
              isPlaying={isPlaying}
              currentTrackId={currentTrack?.id}
              onPlay={(vignette: DailyNote) => playTrack(vignette)}
              onStopPlaybackIfMatches={(noteId: string) => {
                if (currentTrack?.id === noteId) {
                  closePlayer();
                }
              }}
            />
          </main>

          {/* Footer Colophon */}
          <Footer />

          {/* Persistent Audio Dock (Ref 2 & 3 Tribute) */}
          <AudioDock
            track={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            playbackRate={playbackRate}
            volume={volume}
            isMuted={isMuted}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onSkip={skip}
            onSetRate={setRate}
            onSetVolume={setVolumeLevel}
            onToggleMute={toggleMute}
            onClose={closePlayer}
          />

          {/* Story Details & Preview Modal (Ref 6 & 7 Tribute) */}
          <StoryModal
            story={selectedStory}
            isOpen={Boolean(selectedStory)}
            isPlaying={isPlaying}
            isCurrentTrack={currentTrack?.id === selectedStory?.id}
            onClose={() => setSelectedStory(null)}
            onPlay={playTrack}
            onOpenReader={handleOpenReader}
            onSelectChapter={(chap) => {
              handleOpenReader(selectedStory!);
              setTimeout(() => seek(chap.timeSec), 150);
              setSelectedStory(null);
            }}
            onDelete={handleDeleteRequest}
          />

          {/* Studio Modal Creation Suite */}
          <StudioModal
            isOpen={isStudioOpen}
            onClose={() => setIsStudioOpen(false)}
            onStoryCreated={handleStoryCreated}
          />
        </>
      )}
    </div>
  );
}

export default App;

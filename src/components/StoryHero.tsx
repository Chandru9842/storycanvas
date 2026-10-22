import React from 'react';
import { Play, BookOpen, Clock, Volume2, Award } from 'lucide-react';
import type { Story, Chapter } from '../types';

interface StoryHeroProps {
  story: Story;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  onPlay: (story: Story) => void;
  onOpenDetails: (story: Story) => void;
  onOpenReader?: (story: Story) => void;
  onSelectChapter?: (chapter: Chapter) => void;
}

export const StoryHero: React.FC<StoryHeroProps> = ({
  story,
  isPlaying,
  isCurrentTrack,
  onPlay,
  onOpenDetails,
  onOpenReader,
  onSelectChapter,
}) => {
  const activeNow = isCurrentTrack && isPlaying;

  return (
    <section className="hero-section">
      <div className="hero-backdrop-glow" />

      <div className="container hero-container">
        <div className="hero-card">
          {/* Left Column: Story Editorial Details */}
          <div className="hero-content">
            <div className="hero-meta-strip">
              <span className="hero-featured-pill">Curator's Choice</span>
              <span className="hero-genre-pill">{story.genreLabel}</span>
              <span className="hero-duration-chip">
                <Clock size={13} />
                {story.duration}
              </span>
            </div>

            {/* Title & Author */}
            <h1 className="hero-title">{story.title}</h1>

            <div className="hero-author-narrator">
              <span className="hero-author">By {story.author}</span>
              <span className="hero-dot-separator">•</span>
              <span className="hero-narrator">
                <Volume2 size={15} />
                {story.narrator}
              </span>
            </div>

            {/* Laurel Rating Motif (Ref 1 Tribute) */}
            <div className="hero-laurel-rating">
              <Award className="laurel-icon" size={18} />
              <div className="rating-stars">★★★★★</div>
              <span className="rating-score">{story.rating.toFixed(2)}</span>
              <span className="rating-count">({story.reviewCount} literary reviews)</span>
            </div>

            {/* Synopsis */}
            <p className="hero-synopsis">{story.synopsis}</p>

            {/* Chapter Navigator Chips */}
            {story.chapters && story.chapters.length > 0 && (
              <div className="hero-chapters-preview">
                <span className="hero-chapters-label">Audio Chapters:</span>
                <div className="hero-chapters-list">
                  {story.chapters.map((chap) => (
                    <button
                      key={chap.id}
                      className="hero-chapter-pill"
                      onClick={() => onSelectChapter?.(chap)}
                      title={`Jump to ${chap.title} (${chap.time})`}
                    >
                      {chap.title} <span style={{ opacity: 0.65 }}>({chap.time})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="hero-actions-row">
              <button
                className="btn-hero-listen"
                onClick={() => (onOpenReader ? onOpenReader(story) : onPlay(story))}
                title="Open story reader and spoken narration"
              >
                <Play size={18} fill="currentColor" />
                <span>Listen & Read</span>
              </button>

              <button
                className="btn-hero-details"
                onClick={() => onOpenDetails(story)}
              >
                <BookOpen size={16} />
                <span>Story Details & Art</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Artwork Frame */}
          <div className="hero-artwork-frame" onClick={() => onOpenDetails(story)}>
            <img
              src={story.coverImage}
              alt={story.title}
              className="hero-artwork-img"
              loading="eager"
            />

            <div className="hero-artwork-overlay">
              <div className="hero-art-style-badge">
                {story.artStyle}
              </div>

              {/* Interactive Mini Waveform Preview */}
              <div className="hero-waveform-teaser">
                <div className="hero-waveform-bars">
                  {[40, 65, 85, 50, 95, 30, 75, 100, 60, 45, 80, 70, 90, 55, 35, 65, 85, 40, 75, 95, 60, 40, 70, 50].map(
                    (height, idx) => (
                      <span
                        key={idx}
                        className={`waveform-bar ${activeNow && idx < 12 ? 'active' : ''}`}
                        style={{
                          height: activeNow
                            ? `${Math.max(15, (height * (Math.sin(Date.now() / 300 + idx) + 1.2)) / 2)}%`
                            : `${height}%`,
                        }}
                      />
                    )
                  )}
                </div>
                <div className="hero-waveform-timer">
                  {activeNow ? 'Playing' : story.duration}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

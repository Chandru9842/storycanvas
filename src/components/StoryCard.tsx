import React from 'react';
import { Play, Pause, Volume2, Info, Star, Trash2 } from 'lucide-react';
import type { Story } from '../types';

interface StoryCardProps {
  story: Story;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  onPlay: (story: Story) => void;
  onOpenDetails: (story: Story) => void;
  onOpenReader?: (story: Story) => void;
  onDelete?: (story: Story) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  isPlaying,
  isCurrentTrack,
  onPlay,
  onOpenDetails,
  onOpenReader,
  onDelete,
}) => {
  const activeNow = isCurrentTrack && isPlaying;

  return (
    <article className={`story-card ${activeNow ? 'now-playing' : ''}`}>
      {/* Artwork Stage */}
      <div className="card-artwork-wrapper" onClick={() => onOpenDetails(story)}>
        <img
          src={story.coverImage}
          alt=""
          aria-hidden="true"
          className="card-artwork-ambient-bg"
          loading="lazy"
        />
        <img
          src={story.coverImage}
          alt={story.title}
          className="card-artwork-img"
          loading="lazy"
        />
        <div className="card-artwork-gradient" />

        {/* Top Floating Badges */}
        <div className="card-top-badges">
          <span className="card-genre-tag">{story.genreLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
            <span
              className={`card-audio-status-pill ${
                story.isPlayable ? 'playable' : 'placeholder'
              }`}
            >
              {story.isPlayable ? '▶ Spoken Audio' : 'Audio Pending'}
            </span>
            {onDelete && (
              <button
                type="button"
                className="btn-card-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(story);
                }}
                title={`Delete "${story.title}" from archive`}
                aria-label={`Delete "${story.title}"`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Hover Quick Actions */}
        <div className="card-hover-actions">
          <button
            className="btn-card-play"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(story);
            }}
            title={story.isPlayable ? (activeNow ? 'Pause' : 'Play Narration') : 'Audio in production'}
            aria-label={story.isPlayable ? (activeNow ? 'Pause' : 'Play Narration') : 'Audio in production'}
          >
            {activeNow ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" />
            )}
          </button>
          <button
            className="btn-card-details"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(story);
            }}
            aria-label={`Open details for ${story.title}`}
          >
            <Info size={15} />
            <span>Story Details</span>
          </button>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="card-content-body">
        <div className="card-title-group">
          <h2
            className="card-title"
            onClick={() => (onOpenReader ? onOpenReader(story) : onOpenDetails(story))}
            style={{ cursor: 'pointer' }}
            title="Open story in reader"
          >
            {story.title}
          </h2>
          <span className="card-subtitle">{story.subtitle}</span>
        </div>

        <p className="card-synopsis-snippet">{story.synopsis}</p>

        {/* Review Quote Snippet (Ref 1 Tribute) */}
        {story.reviewQuote && (
          <div className="card-quote-box">
            "{story.reviewQuote}"
          </div>
        )}

        {/* Card Footer */}
        <div className="card-footer-meta">
          <div className="card-narrator-credit">
            <Volume2 size={13} style={{ color: 'var(--amber-primary)' }} />
            <span>{story.narrator}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--gold-leaf)', fontSize: '0.75rem' }}>
              <Star size={11} fill="currentColor" />
              {story.rating.toFixed(2)}
            </span>
            <span className="card-duration-badge">{story.duration}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

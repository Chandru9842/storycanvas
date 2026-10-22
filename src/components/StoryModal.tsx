import React, { useEffect } from 'react';
import { X, Play, Pause, Award, Clock, Volume2, Palette, Bookmark, Trash2 } from 'lucide-react';
import type { Story, Chapter } from '../types';

interface StoryModalProps {
  story: Story | null;
  isOpen: boolean;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  onClose: () => void;
  onPlay: (story: Story) => void;
  onOpenReader?: (story: Story) => void;
  onSelectChapter?: (chapter: Chapter) => void;
  onDelete?: (story: Story) => void;
}

export const StoryModal: React.FC<StoryModalProps> = ({
  story,
  isOpen,
  isPlaying,
  isCurrentTrack,
  onClose,
  onPlay,
  onOpenReader,
  onSelectChapter,
  onDelete,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !story) return null;

  const activeNow = isCurrentTrack && isPlaying;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className="btn-modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Left Column: Artwork Frame & Play Trigger */}
        <div className="modal-artwork-col">
          <img
            src={story.coverImage}
            alt={story.title}
            className="modal-artwork-img"
          />
          <div className="modal-artwork-overlay">
            <span className="modal-style-chip">
              <Palette size={12} style={{ display: 'inline', marginRight: 4 }} />
              {story.artStyle}
            </span>

            <div className="modal-left-footer">
              <button
                className="btn-modal-play-story"
                onClick={() => {
                  if (onOpenReader) {
                    onOpenReader(story);
                    onClose();
                  } else {
                    onPlay(story);
                  }
                }}
              >
                {activeNow ? (
                  <>
                    <Pause size={18} fill="currentColor" />
                    <span>Pause Narration</span>
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    <span>
                      {story.isPlayable ? 'Listen & Read Story' : 'Read Story'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Editorial Synopsis & Chapter List */}
        <div className="modal-details-col">
          <span className="modal-genre-badge">{story.genreLabel}</span>

          <h2 className="modal-story-title">{story.title}</h2>

          <div className="modal-author-row">
            <span>Written by <strong>{story.author}</strong></span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--amber-primary)' }}>
              <Volume2 size={14} />
              {story.narrator}
            </span>
          </div>

          {/* Laurel Rating Motif */}
          <div className="hero-laurel-rating" style={{ margin: '4px 0' }}>
            <Award className="laurel-icon" size={16} />
            <div className="rating-stars">★★★★★</div>
            <span className="rating-score">{story.rating.toFixed(2)}</span>
            <span className="rating-count">({story.reviewCount} reviews)</span>
          </div>

          <p className="modal-synopsis-text">{story.synopsis}</p>

          {/* Chapters List */}
          {story.chapters && story.chapters.length > 0 && (
            <div className="modal-chapters-card">
              <span className="modal-chapters-title">
                <Bookmark size={13} style={{ display: 'inline', marginRight: 4 }} />
                Story Chapters & Timelines
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {story.chapters.map((chap) => (
                  <div
                    key={chap.id}
                    className="modal-chapter-item"
                    onClick={() => onSelectChapter?.(chap)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>{chap.title}</span>
                    <span className="modal-chapter-time">{chap.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Story Tags */}
          <div className="modal-tags-row">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <Clock size={12} />
              {story.duration}
            </span>
            {story.tags.map((tag) => (
              <span key={tag} className="modal-tag-pill">
                #{tag}
              </span>
            ))}
          </div>

          {/* Delete Story Action (Ref Requirement 2) */}
          {onDelete && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-modal-delete-story"
                onClick={() => {
                  onDelete(story);
                }}
                title="Delete this story from your archive"
              >
                <Trash2 size={14} />
                <span>Delete Story</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

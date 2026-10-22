import React, { useState } from 'react';
import {
  Radio,
  Play,
  Pause,
  Mic,
  Plus,
  BookOpen,
  Edit3,
  Trash2,
  Volume2,
  Loader2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DailyNote } from '../types';
import { DailyNoteModal } from './DailyNoteModal';
import { ReadNoteModal } from './ReadNoteModal';
import { DeleteNoteConfirmModal } from './DeleteNoteConfirmModal';

interface AudioVignettesProps {
  initialVignettes: DailyNote[];
  isPlaying: boolean;
  currentTrackId?: string;
  onPlay: (vignette: DailyNote) => void;
  onStopPlaybackIfMatches?: (noteId: string) => void;
}

const STORAGE_KEY = 'storycanvas_daily_notes';

export const AudioVignettes: React.FC<AudioVignettesProps> = ({
  initialVignettes,
  isPlaying,
  currentTrackId,
  onPlay,
  onStopPlaybackIfMatches,
}) => {
  // Load user-created notes from localStorage
  const [userNotes, setUserNotes] = useState<DailyNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved daily notes:', e);
    }
    return [];
  });

  // Curated sample demonstrations
  const [demonstrations] = useState<DailyNote[]>(initialVignettes);
  const [showDemonstrations, setShowDemonstrations] = useState(true);

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DailyNote | null>(null);
  const [readingNote, setReadingNote] = useState<DailyNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<DailyNote | null>(null);

  // Generation state tracker
  const [generatingNoteId, setGeneratingNoteId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Persist user notes to localStorage
  const persistNotes = (notes: DailyNote[]) => {
    setUserNotes(notes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.warn('Failed to save daily notes to localStorage:', e);
    }
  };

  // Generate narration audio using existing backend TTS endpoint
  const handleGenerateNarration = async (targetNote: DailyNote): Promise<void> => {
    setGlobalError(null);
    setGeneratingNoteId(targetNote.id);

    // Update note status to 'generating' immediately
    const updatingNotes = userNotes.map((n) =>
      n.id === targetNote.id ? { ...n, status: 'generating' as const, errorMessage: undefined } : n
    );
    persistNotes(updatingNotes);

    if (readingNote?.id === targetNote.id) {
      setReadingNote((prev) => (prev ? { ...prev, status: 'generating', errorMessage: undefined } : null));
    }

    try {
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: targetNote.id,
          title: targetNote.title,
          isNote: true,
          chapters: [
            {
              id: 'chap-1',
              title: targetNote.title,
              content: [targetNote.content || ''],
            },
          ],
          narrator: targetNote.narrator,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.audioUrl) {
        throw new Error(data.error || 'Failed to synthesize narration audio.');
      }

      // Successful narration synthesis
      const updatedList = userNotes.map((n) => {
        if (n.id === targetNote.id) {
          return {
            ...n,
            status: 'ready' as const,
            audioUrl: data.audioUrl,
            duration: data.duration || '02:00',
            durationSec: data.durationSec || 120,
            isPlayable: true,
            errorMessage: undefined,
          };
        }
        return n;
      });

      persistNotes(updatedList);

      if (readingNote?.id === targetNote.id) {
        setReadingNote((prev) =>
          prev
            ? {
                ...prev,
                status: 'ready',
                audioUrl: data.audioUrl,
                duration: data.duration || '02:00',
                durationSec: data.durationSec || 120,
                isPlayable: true,
                errorMessage: undefined,
              }
            : null
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Narration synthesis failed.';
      console.error('Narration generation error:', err);

      const failedList = userNotes.map((n) => {
        if (n.id === targetNote.id) {
          return {
            ...n,
            status: 'error' as const,
            isPlayable: false,
            errorMessage: message,
          };
        }
        return n;
      });

      persistNotes(failedList);

      if (readingNote?.id === targetNote.id) {
        setReadingNote((prev) =>
          prev ? { ...prev, status: 'error', isPlayable: false, errorMessage: message } : null
        );
      }
    } finally {
      setGeneratingNoteId(null);
    }
  };

  // Save new note or update existing note
  const handleSaveNote = async (
    noteData: Partial<DailyNote>,
    shouldGenerateAudio: boolean
  ): Promise<void> => {
    let savedNote: DailyNote;

    if (editingNote) {
      // Editing existing note
      const updated = userNotes.map((n) => {
        if (n.id === editingNote.id) {
          savedNote = {
            ...n,
            ...noteData,
            updatedAt: Date.now(),
          };
          return savedNote;
        }
        return n;
      });
      persistNotes(updated);
    } else {
      // Creating brand new note
      const now = new Date();
      const dateStr = `Today • ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(now)}`;

      savedNote = {
        id: `note-${Date.now()}`,
        date: dateStr,
        title: noteData.title || 'Untitled Note',
        content: noteData.content || '',
        narrator: noteData.narrator || 'Eleanor Vance',
        category: noteData.category || 'Daily Reflection',
        duration: '--:--',
        durationSec: 0,
        audioUrl: undefined,
        isPlayable: false,
        status: shouldGenerateAudio ? 'generating' : 'draft',
        createdAt: Date.now(),
        isDemonstration: false,
      };

      persistNotes([savedNote, ...userNotes]);
    }

    if (shouldGenerateAudio) {
      // Trigger background narration generation
      setTimeout(() => {
        handleGenerateNarration(savedNote);
      }, 100);
    }
  };

  // Delete note
  const handleConfirmDelete = () => {
    if (!deletingNote) return;

    // Stop audio playback if currently active
    if (onStopPlaybackIfMatches) {
      onStopPlaybackIfMatches(deletingNote.id);
    }

    const filtered = userNotes.filter((n) => n.id !== deletingNote.id);
    persistNotes(filtered);

    if (readingNote?.id === deletingNote.id) {
      setReadingNote(null);
    }
    setDeletingNote(null);
  };

  return (
    <section id="daily-vignettes" className="vignettes-section">
      <div className="container">
        {/* Editorial Header */}
        <div className="vignettes-header-center">
          <div className="vignettes-brand-chip">
            <Radio size={22} />
          </div>
          <h2 className="vignettes-title">Daily Notes & Audio Vignettes</h2>
          <p className="vignettes-subtitle">
            Personal narrative reflections, philosophical observations, and spoken ambient fragments.
            Draft your chronicle and voice it with master AI narrators.
          </p>

          <button
            type="button"
            className="btn-create-daily-note"
            onClick={() => {
              setEditingNote(null);
              setIsEditorOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Create Daily Note</span>
          </button>
        </div>

        {globalError && (
          <div className="vignettes-error-banner">
            <AlertCircle size={16} />
            <span>{globalError}</span>
          </div>
        )}

        {/* ==================================================================
            Section 1: User Created Daily Notes
           ================================================================== */}
        <div className="notes-group-container">
          <div className="notes-group-header">
            <div className="group-header-left">
              <span className="group-header-title">
                <FileText size={15} />
                Your Daily Notes ({userNotes.length})
              </span>
              <span className="group-header-subtitle">
                Personal entries saved to your local StoryCanvas archive
              </span>
            </div>
          </div>

          {userNotes.length === 0 ? (
            /* Empty State */
            <div className="notes-empty-state">
              <div className="empty-icon-wrap">
                <FileText size={32} />
              </div>
              <h3 className="empty-state-title">No Daily Notes Yet</h3>
              <p className="empty-state-desc">
                Capture an observation, poem, or philosophical fragment. Synthesize natural spoken voice narration with Eleanor, Julian, or Morwenna in seconds.
              </p>
              <button
                type="button"
                className="btn-empty-create-note"
                onClick={() => {
                  setEditingNote(null);
                  setIsEditorOpen(true);
                }}
              >
                <Plus size={15} />
                <span>Create Your First Daily Note</span>
              </button>
            </div>
          ) : (
            /* User Notes List */
            <div className="vignettes-list-container">
              {userNotes.map((item) => {
                const isActive = currentTrackId === item.id;
                const activeNow = isActive && isPlaying;
                const isGenerating = item.status === 'generating' || generatingNoteId === item.id;
                const isReady = item.status === 'ready' && item.isPlayable && !!item.audioUrl;
                const isDraft = item.status === 'draft' || (!isReady && !isGenerating && item.status !== 'error');
                const isError = item.status === 'error';

                return (
                  <div
                    key={item.id}
                    className={`vignette-row-item ${isActive ? 'is-active' : ''}`}
                  >
                    {/* Left: Date, Title, Snippet, Narrator & Category */}
                    <div className="vignette-left-info">
                      <span className="vignette-date-badge">{item.date}</span>

                      <div className="vignette-details">
                        <div className="vignette-title-line">
                          <h3
                            className="vignette-title"
                            title={item.title}
                            onClick={() => setReadingNote(item)}
                          >
                            {item.title}
                          </h3>
                        </div>

                        {item.content && (
                          <p
                            className="vignette-snippet"
                            onClick={() => setReadingNote(item)}
                            title="Click to read full note text"
                          >
                            {item.content}
                          </p>
                        )}

                        <div className="vignette-narrator-credit">
                          <Mic size={12} style={{ color: 'var(--amber-primary)' }} />
                          <span>{item.narrator}</span>
                          <span style={{ opacity: 0.35 }}>•</span>
                          <span className="vignette-category-tag">{item.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Truthful Status Badge & Interactive Actions */}
                    <div className="vignette-right-actions">
                      {/* Truthful Status Badge */}
                      {isReady && (
                        <span className="vignette-status-badge ready">
                          ● Ready
                        </span>
                      )}
                      {isGenerating && (
                        <span className="vignette-status-badge generating">
                          <Loader2 size={11} className="spinner" />
                          Generating...
                        </span>
                      )}
                      {isDraft && (
                        <span className="vignette-status-badge draft">
                          Draft • No Audio
                        </span>
                      )}
                      {isError && (
                        <span
                          className="vignette-status-badge error"
                          title={item.errorMessage || 'Audio generation failed'}
                        >
                          <AlertCircle size={11} />
                          Failed
                        </span>
                      )}

                      {/* Playback or Narration Synthesis CTA */}
                      {isReady ? (
                        <button
                          type="button"
                          className={`vignette-play-btn ${activeNow ? 'playing' : ''}`}
                          onClick={() => onPlay(item)}
                          title={activeNow ? 'Pause playback' : `Play narration (${item.duration})`}
                        >
                          {activeNow ? (
                            <Pause size={13} fill="currentColor" />
                          ) : (
                            <Play size={13} fill="currentColor" />
                          )}
                          <span>{item.duration}</span>
                        </button>
                      ) : isGenerating ? (
                        <button
                          type="button"
                          className="vignette-play-btn disabled"
                          disabled
                          title="Voice narration is currently being synthesized"
                        >
                          <Loader2 size={13} className="spinner" />
                          <span>Synthesizing</span>
                        </button>
                      ) : isError ? (
                        <button
                          type="button"
                          className="btn-action-retry"
                          onClick={() => handleGenerateNarration(item)}
                          title="Retry voice narration synthesis"
                        >
                          <RotateCcw size={12} />
                          <span>Retry</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-action-generate"
                          onClick={() => handleGenerateNarration(item)}
                          title="Synthesize AI spoken voice narration for this note"
                        >
                          <Volume2 size={12} />
                          <span>Voice Note</span>
                        </button>
                      )}

                      {/* Read Full Text */}
                      <button
                        type="button"
                        className="btn-note-icon-action"
                        onClick={() => setReadingNote(item)}
                        title="Read full note text"
                        aria-label="Read full note"
                      >
                        <BookOpen size={14} />
                      </button>

                      {/* Edit Note */}
                      <button
                        type="button"
                        className="btn-note-icon-action"
                        onClick={() => {
                          setEditingNote(item);
                          setIsEditorOpen(true);
                        }}
                        title="Edit note title, content, or narrator"
                        aria-label="Edit note"
                      >
                        <Edit3 size={14} />
                      </button>

                      {/* Delete Note */}
                      <button
                        type="button"
                        className="btn-note-icon-action btn-note-delete"
                        onClick={() => setDeletingNote(item)}
                        title="Delete this note"
                        aria-label="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================================
            Section 2: Curated Spoken Demonstrations (Clearly Separated)
           ================================================================== */}
        <div className="demonstrations-group-container">
          <div
            className="demonstrations-toggle-header"
            onClick={() => setShowDemonstrations(!showDemonstrations)}
          >
            <div className="demos-header-left">
              <span className="demos-badge">
                <Sparkles size={12} />
                Demonstrations Archive
              </span>
              <span className="demos-title">
                Curated Spoken Vignettes ({demonstrations.length})
              </span>
              <span className="demos-desc">
                Sample editorial recordings for voice artist demonstrations
              </span>
            </div>

            <button
              type="button"
              className="btn-toggle-demos"
              aria-label={showDemonstrations ? 'Hide demonstrations' : 'Show demonstrations'}
            >
              {showDemonstrations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {showDemonstrations && (
            <div className="vignettes-list-container demos-list">
              {demonstrations.map((item) => {
                const isActive = currentTrackId === item.id;
                const activeNow = isActive && isPlaying;

                return (
                  <div
                    key={item.id}
                    className={`vignette-row-item demo-row ${isActive ? 'is-active' : ''}`}
                  >
                    <div className="vignette-left-info">
                      <span className="vignette-date-badge">{item.date}</span>

                      <div className="vignette-details">
                        <div className="vignette-title-line">
                          <h3
                            className="vignette-title"
                            title={item.title}
                            onClick={() => setReadingNote(item)}
                          >
                            {item.title}
                          </h3>
                          <span className="badge-demo-chip">Demo</span>
                        </div>

                        {item.content && (
                          <p
                            className="vignette-snippet"
                            onClick={() => setReadingNote(item)}
                            title="Click to read full demonstration"
                          >
                            {item.content}
                          </p>
                        )}

                        <div className="vignette-narrator-credit">
                          <Mic size={12} style={{ color: 'var(--amber-primary)' }} />
                          <span>{item.narrator}</span>
                          <span style={{ opacity: 0.35 }}>•</span>
                          <span className="vignette-category-tag">{item.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="vignette-right-actions">
                      <span className={`vignette-status-badge ${item.isPlayable ? 'ready' : 'draft'}`}>
                        {item.isPlayable ? '● Sample Audio' : 'Draft Archive'}
                      </span>

                      <button
                        type="button"
                        className={`vignette-play-btn ${activeNow ? 'playing' : ''} ${
                          !item.isPlayable ? 'disabled' : ''
                        }`}
                        onClick={() => onPlay(item)}
                        title={
                          item.isPlayable
                            ? activeNow
                              ? 'Pause'
                              : `Play demonstration (${item.duration})`
                            : 'Demonstration archive sample'
                        }
                      >
                        {activeNow ? (
                          <Pause size={13} fill="currentColor" />
                        ) : (
                          <Play size={13} fill="currentColor" />
                        )}
                        <span>{item.duration}</span>
                      </button>

                      <button
                        type="button"
                        className="btn-note-icon-action"
                        onClick={() => setReadingNote(item)}
                        title="Read demonstration text"
                        aria-label="Read demonstration text"
                      >
                        <BookOpen size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal for Create / Edit */}
      <DailyNoteModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        initialNote={editingNote}
        isGeneratingAudio={!!generatingNoteId}
      />

      {/* Full Prose Reading Modal */}
      <ReadNoteModal
        note={readingNote}
        isOpen={!!readingNote}
        onClose={() => setReadingNote(null)}
        isPlaying={isPlaying && currentTrackId === readingNote?.id}
        onPlay={(note) => onPlay(note)}
        onEdit={(note) => {
          setReadingNote(null);
          setEditingNote(note);
          setIsEditorOpen(true);
        }}
        onGenerateAudio={(note) => handleGenerateNarration(note)}
        isGeneratingAudio={generatingNoteId === readingNote?.id}
      />

      {/* Delete Confirmation Modal */}
      <DeleteNoteConfirmModal
        isOpen={!!deletingNote}
        noteTitle={deletingNote?.title || ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingNote(null)}
      />
    </section>
  );
};

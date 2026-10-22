import React from 'react';
import {
  X,
  Play,
  Pause,
  Mic,
  Tag,
  Calendar,
  Volume2,
  Edit3,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { DailyNote } from '../types';

interface ReadNoteModalProps {
  note: DailyNote | null;
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onPlay: (note: DailyNote) => void;
  onEdit: (note: DailyNote) => void;
  onGenerateAudio: (note: DailyNote) => void;
  isGeneratingAudio?: boolean;
}

export const ReadNoteModal: React.FC<ReadNoteModalProps> = ({
  note,
  isOpen,
  onClose,
  isPlaying,
  onPlay,
  onEdit,
  onGenerateAudio,
  isGeneratingAudio = false,
}) => {
  if (!isOpen || !note) return null;

  const isPlayable = note.isPlayable && !!note.audioUrl;
  const isGenerating = note.status === 'generating' || isGeneratingAudio;
  const isDraft = note.status === 'draft' || (!isPlayable && !isGenerating);
  const isError = note.status === 'error';

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-dialog read-note-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-modal-close"
          onClick={onClose}
          aria-label="Close Note Reader"
        >
          <X size={18} />
        </button>

        {/* Note Reader Header */}
        <div className="read-note-header">
          <div className="read-note-meta-row">
            <span className="read-date-chip">
              <Calendar size={12} />
              {note.date}
            </span>
            <span className="read-category-chip">
              <Tag size={12} />
              {note.category}
            </span>
            {note.isDemonstration && (
              <span className="badge-demo-tag">
                Curated Demo
              </span>
            )}
          </div>

          <h2 className="read-note-title">{note.title}</h2>

          <div className="read-note-narrator-row">
            <div className="read-narrator-credit">
              <Mic size={13} style={{ color: 'var(--amber-primary)' }} />
              <span>Narrator: <strong>{note.narrator}</strong></span>
            </div>

            {/* Truthful Status Badge */}
            <div className="read-status-indicator">
              {note.status === 'ready' && isPlayable && (
                <span className="status-chip ready">
                  <CheckCircle2 size={12} />
                  Ready ({note.duration})
                </span>
              )}
              {isGenerating && (
                <span className="status-chip generating">
                  <Loader2 size={12} className="spinner" />
                  Generating Narration...
                </span>
              )}
              {isDraft && (
                <span className="status-chip draft">
                  Draft • No Audio
                </span>
              )}
              {isError && (
                <span className="status-chip error">
                  <AlertCircle size={12} />
                  Generation Failed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Narrative Prose Body */}
        <div className="read-note-content-body">
          {note.content ? (
            note.content.split('\n\n').map((para, idx) => (
              <p key={idx} className="read-note-paragraph">
                {para}
              </p>
            ))
          ) : (
            <p className="read-note-paragraph" style={{ fontStyle: 'italic', opacity: 0.6 }}>
              No text content available for this note.
            </p>
          )}
        </div>

        {/* Error notice if generation failed */}
        {isError && note.errorMessage && (
          <div className="note-error-banner" style={{ margin: '16px 28px 0 28px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{note.errorMessage}</span>
          </div>
        )}

        {/* Footer Action Bar */}
        <div className="read-note-footer">
          <div className="read-footer-left">
            {!note.isDemonstration && (
              <button
                type="button"
                className="btn-edit-note-reader"
                onClick={() => {
                  onClose();
                  onEdit(note);
                }}
              >
                <Edit3 size={14} />
                <span>Edit Note</span>
              </button>
            )}
          </div>

          <div className="read-footer-right">
            {isPlayable ? (
              <button
                type="button"
                className={`btn-reader-play ${isPlaying ? 'playing' : ''}`}
                onClick={() => onPlay(note)}
              >
                {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                <span>{isPlaying ? 'Pause Narration' : `Listen (${note.duration})`}</span>
              </button>
            ) : isGenerating ? (
              <button type="button" className="btn-reader-play disabled" disabled>
                <Loader2 size={15} className="spinner" />
                <span>Synthesizing Audio...</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-reader-generate"
                onClick={() => onGenerateAudio(note)}
                title="Generate AI voice narration for this note"
              >
                <Volume2 size={15} />
                <span>Generate Narration</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

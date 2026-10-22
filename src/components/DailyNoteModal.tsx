import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Volume2,
  Mic,
  Tag,
  Loader2,
  AlertCircle,
  FileText,
  Save,
} from 'lucide-react';
import type { DailyNote } from '../types';

interface DailyNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: Partial<DailyNote>, shouldGenerateAudio: boolean) => Promise<void> | void;
  initialNote?: DailyNote | null;
  isGeneratingAudio?: boolean;
}

const NARRATORS = [
  { name: 'Eleanor Vance', desc: 'Warm Contralto • Poetic & Intimate' },
  { name: 'Julian Vane', desc: 'Scholarly Baritone • Atmospheric' },
  { name: 'Morwenna Crow', desc: 'Dramatic Alto • Mythic Cadence' },
];

const CATEGORIES = [
  'Daily Reflection',
  'Ambient Note',
  'Field Journal',
  'Atelier Note',
  'Midnight Chronicle',
  'Poetic Fragment',
];

export const DailyNoteModal: React.FC<DailyNoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote,
  isGeneratingAudio = false,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [narrator, setNarrator] = useState(NARRATORS[0].name);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialNote) {
      setTitle(initialNote.title || '');
      setContent(initialNote.content || '');
      setCategory(initialNote.category || CATEGORIES[0]);
      setNarrator(initialNote.narrator || NARRATORS[0].name);
    } else {
      setTitle('');
      setContent('');
      setCategory(CATEGORIES[0]);
      setNarrator(NARRATORS[0].name);
    }
    setValidationError(null);
    setIsSubmitting(false);
  }, [initialNote, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (generateAudio: boolean) => {
    setValidationError(null);
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle) {
      setValidationError('Please provide a title for your note.');
      return;
    }

    if (!cleanContent) {
      setValidationError('Please enter some narrative text or reflection.');
      return;
    }

    if (cleanContent.length < 15) {
      setValidationError('Please write at least 15 characters to synthesize natural spoken narration.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(
        {
          title: cleanTitle,
          content: cleanContent,
          category,
          narrator,
        },
        generateAudio
      );
      onClose();
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const isEditing = !!initialNote;

  return (
    <div className="modal-backdrop" onClick={!isSubmitting ? onClose : undefined} role="dialog" aria-modal="true">
      <div
        className="modal-dialog note-editor-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-modal-close"
          onClick={onClose}
          disabled={isSubmitting || isGeneratingAudio}
          aria-label="Close Note Editor"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="note-editor-header">
          <div className="note-header-mark">
            <Radio size={20} style={{ color: 'var(--amber-primary)' }} />
          </div>
          <div>
            <h3 className="note-editor-title">
              {isEditing ? 'Edit Daily Note' : 'Compose Daily Note'}
            </h3>
            <p className="note-editor-subtitle">
              Draft your personal narrative reflection & synthesize spoken audio narration
            </p>
          </div>
        </div>

        {validationError && (
          <div className="note-error-banner">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Form Controls */}
        <div className="note-editor-form">
          {/* Note Title */}
          <div className="note-form-group">
            <label className="note-form-label" htmlFor="note-title-input">
              <FileText size={13} />
              <span>Note Title</span>
            </label>
            <input
              id="note-title-input"
              type="text"
              className="note-text-input"
              placeholder="e.g. Whispers of Frost on the Solitary Parapet"
              value={title}
              maxLength={120}
              disabled={isSubmitting}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Metadata Row: Category & Narrator */}
          <div className="note-meta-grid">
            {/* Category */}
            <div className="note-form-group">
              <label className="note-form-label" htmlFor="note-category-select">
                <Tag size={13} />
                <span>Note Category</span>
              </label>
              <select
                id="note-category-select"
                className="note-select-input"
                value={category}
                disabled={isSubmitting}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Narrator */}
            <div className="note-form-group">
              <label className="note-form-label" htmlFor="note-narrator-select">
                <Mic size={13} />
                <span>Spoken Narrator</span>
              </label>
              <select
                id="note-narrator-select"
                className="note-select-input"
                value={narrator}
                disabled={isSubmitting}
                onChange={(e) => setNarrator(e.target.value)}
              >
                {NARRATORS.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
              <span className="note-narrator-chip">
                {NARRATORS.find((n) => n.name === narrator)?.desc}
              </span>
            </div>
          </div>

          {/* Narrative Content Textarea */}
          <div className="note-form-group">
            <div className="note-label-row">
              <label className="note-form-label" htmlFor="note-content-input">
                <FileText size={13} />
                <span>Narrative Text</span>
              </label>
              <span className="note-counter-chip">
                {wordCount} words • {content.length} chars
              </span>
            </div>
            <textarea
              id="note-content-input"
              className="note-textarea-input"
              rows={7}
              placeholder="Write your observation, philosophical reflection, or ambient vignette. Describe the setting, atmosphere, and sensory nuances..."
              value={content}
              disabled={isSubmitting}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="note-editor-actions">
          <button
            type="button"
            className="btn-note-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <div className="note-primary-actions">
            <button
              type="button"
              className="btn-save-draft"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              onClick={() => handleSubmit(false)}
              title="Save text as draft without synthesizing spoken audio"
            >
              <Save size={14} />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              className="btn-save-generate"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              onClick={() => handleSubmit(true)}
              title="Save text and immediately synthesize spoken voice narration"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Volume2 size={15} />
                  <span>Save & Generate Narration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

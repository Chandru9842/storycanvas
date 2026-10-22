import React, { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import type { Story } from '../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  story: Story | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  story,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !story) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div
        className="modal-dialog confirm-delete-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-modal-close"
          onClick={onCancel}
          aria-label="Cancel deletion"
        >
          <X size={18} />
        </button>

        <div className="confirm-delete-body">
          <div className="confirm-delete-icon-wrap">
            <Trash2 size={24} />
          </div>

          <h3 id="delete-dialog-title" className="confirm-delete-heading">
            Delete Story
          </h3>

          <p className="confirm-delete-warning">
            Are you sure you want to delete this story? This action cannot be undone.
          </p>

          <div className="confirm-delete-preview">
            <img
              src={story.coverImage}
              alt={story.title}
              className="confirm-preview-thumb"
            />
            <div className="confirm-preview-meta">
              <span className="confirm-story-title">{story.title}</span>
              <span className="confirm-story-author">
                by {story.author} • {story.genreLabel}
              </span>
            </div>
          </div>

          <div className="confirm-dialog-actions">
            <button className="btn-confirm-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn-confirm-delete" onClick={onConfirm}>
              <Trash2 size={15} />
              <span>Delete Story</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

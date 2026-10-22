import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteNoteConfirmModalProps {
  isOpen: boolean;
  noteTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteNoteConfirmModal: React.FC<DeleteNoteConfirmModalProps> = ({
  isOpen,
  noteTitle,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div
        className="modal-dialog delete-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-modal-close"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <div className="delete-confirm-header">
          <div className="delete-confirm-icon-wrap">
            <AlertTriangle size={24} />
          </div>
          <h3 className="delete-confirm-title">Delete Daily Note</h3>
        </div>

        <p className="delete-confirm-message">
          Are you sure you want to delete this note? This action cannot be undone.
        </p>

        {noteTitle && (
          <div className="delete-note-target-title">
            &ldquo;{noteTitle}&rdquo;
          </div>
        )}

        <div className="delete-confirm-actions">
          <button
            type="button"
            className="btn-delete-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-delete-confirm-danger"
            onClick={onConfirm}
          >
            Delete Note
          </button>
        </div>
      </div>
    </div>
  );
};

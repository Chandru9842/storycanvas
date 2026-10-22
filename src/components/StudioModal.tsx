import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sliders,
  Volume2,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Layers,
} from 'lucide-react';
import type { Story } from '../types';

interface StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: (story: Story) => void;
}

type GenerationStage = 'idle' | 'analyzing' | 'drafting' | 'illustrating' | 'voicing' | 'complete' | 'error';

interface UploadedImageItem {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
  name: string;
  size: number;
}

const ART_MOVEMENTS = [
  'Classical Chiaroscuro Oil',
  'Edo Woodblock & Oil',
  'Storm Chiaroscuro',
  'Solarpunk Odyssey',
  'Victorian Atelier',
  'Luminescent Fresco',
];

const GENRES: Array<{ id: Story['genre']; label: string }> = [
  { id: 'auto', label: '✦ Auto-detect from Images' },
  { id: 'mythology', label: 'Mythic Cosmos' },
  { id: 'scifi', label: 'Solarpunk Sci-Fi' },
  { id: 'folklore', label: 'Dark Folklore' },
  { id: 'victorian', label: 'Victorian Atelier' },
  { id: 'mystery', label: 'Gothic Mystery' },
];

const NARRATORS = [
  { name: 'Eleanor Vance', desc: 'Warm Contralto • Poetic & Intimate' },
  { name: 'Julian Vane', desc: 'Scholarly Baritone • Atmospheric' },
  { name: 'Morwenna Crow', desc: 'Dramatic Alto • Mythic Cadence' },
];

export const StudioModal: React.FC<StudioModalProps> = ({ isOpen, onClose, onStoryCreated }) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Genre defaults to 'auto' for intelligent image-adaptive detection
  const [genre, setGenre] = useState<Story['genre']>('auto');
  const [artStyle, setArtStyle] = useState<string>(ART_MOVEMENTS[0]);
  const [narrator, setNarrator] = useState<string>(NARRATORS[0].name);
  const [addExtraScene, setAddExtraScene] = useState<boolean>(false);

  const [stage, setStage] = useState<GenerationStage>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendConfigured, setBackendConfigured] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);

  // Check backend health and API key configuration on modal open
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setBackendConfigured(data.configured?.hasGeminiKey ?? false);
      })
      .catch(() => {
        setBackendConfigured(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // Process multiple files with validation (max 5 images, 5MB each, JPEG/PNG/WebP)
  const processFiles = (files: FileList | File[]) => {
    setValidationError(null);
    setErrorMessage(null);

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const currentCount = uploadedImages.length;
    if (currentCount >= 5) {
      setValidationError('Maximum of 5 images allowed per story.');
      return;
    }

    const availableSlots = 5 - currentCount;
    const filesToProcess = fileArray.slice(0, availableSlots);
    const overflow = fileArray.length - availableSlots;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxBytes = 5 * 1024 * 1024; // 5MB

    const errors: string[] = [];
    const validFiles: File[] = [];

    for (const file of filesToProcess) {
      if (!validTypes.includes(file.type)) {
        errors.push(`"${file.name}": Unsupported format. Please upload JPEG, PNG, or WebP.`);
        continue;
      }
      if (file.size > maxBytes) {
        errors.push(`"${file.name}": Exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
        continue;
      }
      validFiles.push(file);
    }

    if (overflow > 0) {
      errors.push(`Only up to 5 images can be included. ${overflow} additional image(s) skipped.`);
    }

    if (errors.length > 0) {
      setValidationError(errors.join(' '));
    }

    if (validFiles.length === 0) return;

    let completed = 0;
    const newItems: UploadedImageItem[] = [];

    validFiles.forEach((file) => {
      const objectUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        newItems.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          previewUrl: objectUrl,
          base64: reader.result as string,
          mimeType: file.type,
          name: file.name,
          size: file.size,
        });

        completed++;
        if (completed === validFiles.length) {
          setUploadedImages((prev) => [...prev, ...newItems].slice(0, 5));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => {
      const updated = [...prev];
      const removed = updated.splice(index, 1);
      if (removed[0]?.previewUrl) {
        URL.revokeObjectURL(removed[0].previewUrl);
      }
      return updated;
    });
    setValidationError(null);
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    setUploadedImages((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const updated = [...prev];
      const [item] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, item);
      return updated;
    });
  };

  const handleClearAllImages = () => {
    uploadedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setUploadedImages([]);
    setValidationError(null);
    setErrorMessage(null);
  };

  // Full multi-stage AI generation pipeline supporting multi-image grounding
  const handleGenerateStory = async () => {
    if (uploadedImages.length === 0) {
      setValidationError('Please upload at least one image to begin story generation.');
      return;
    }

    setErrorMessage(null);

    try {
      // Stage 1 & 2: Multimodal Gemini Vision Story Generation
      setStage('analyzing');
      const storyRes = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: uploadedImages.map((img, idx) => ({
            imageBase64: img.base64,
            mimeType: img.mimeType,
            name: img.name,
            order: idx,
          })),
          genre,
          artStyle,
          narrator,
          generateAdditionalScenes: addExtraScene,
        }),
      });

      const storyJson = await storyRes.json();
      if (!storyRes.ok || !storyJson.success) {
        throw new Error(storyJson.error || 'Gemini story generation failed.');
      }

      const generatedStory: Story = storyJson.story;

      // Stage 3: Scene Illustration Synthesis
      setStage('illustrating');
      const imageRes = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: generatedStory.id,
          chapters: generatedStory.chapters,
          artStyle,
          seedCoverImage: generatedStory.coverImage,
        }),
      });

      const imageJson = await imageRes.json();
      if (imageRes.ok && imageJson.success && Array.isArray(imageJson.chapters)) {
        generatedStory.chapters = imageJson.chapters;
      }

      // Stage 4: Spoken Narration Audio (Gemini TTS with Synchronized Scene Timestamps)
      setStage('voicing');
      const speechRes = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: generatedStory.id,
          title: generatedStory.title,
          synopsis: generatedStory.synopsis,
          chapters: generatedStory.chapters,
          narrator,
        }),
      });

      const speechJson = await speechRes.json();
      if (!speechRes.ok || !speechJson.success || !speechJson.audioUrl) {
        throw new Error(
          speechJson.error || 'Spoken narration generation failed to produce complete audio.'
        );
      }

      generatedStory.audioUrl = speechJson.audioUrl;
      generatedStory.isPlayable = true;
      if (speechJson.duration) {
        generatedStory.duration = speechJson.duration;
      }
      if (speechJson.durationSec) {
        generatedStory.durationSec = speechJson.durationSec;
      }
      if (Array.isArray(speechJson.chapters)) {
        // Merge exact narration synchronization timestamps
        generatedStory.chapters = generatedStory.chapters.map((chap, idx) => ({
          ...chap,
          time: speechJson.chapters[idx]?.time ?? chap.time,
          timeSec: speechJson.chapters[idx]?.timeSec ?? chap.timeSec,
        }));
      }

      // Completion
      setStage('complete');

      // Hand off to parent app and launch reader
      setTimeout(() => {
        if (onStoryCreated) {
          onStoryCreated(generatedStory);
        }
        onClose();
      }, 900);
    } catch (err: unknown) {
      console.error('Generation pipeline error:', err);
      setStage('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during story generation.'
      );
    }
  };

  const isGenerating = stage !== 'idle' && stage !== 'complete' && stage !== 'error';
  const imageCount = uploadedImages.length;
  const sceneCount = addExtraScene ? imageCount + 1 : imageCount;

  return (
    <div className="modal-backdrop" onClick={!isGenerating ? onClose : undefined} role="dialog">
      <div
        className="modal-dialog studio-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-modal-close"
          onClick={onClose}
          disabled={isGenerating}
          aria-label="Close Studio"
        >
          <X size={18} />
        </button>

        {/* Studio Header */}
        <div className="studio-header">
          <div className="studio-title-group">
            <div className="brand-mark">
              <Sparkles size={20} style={{ color: 'var(--amber-primary)' }} />
            </div>
            <div>
              <h3 className="studio-title">StoryCanvas AI Studio</h3>
              <p className="studio-subtitle">
                Synthesize original illustrated narratives & spoken literature from 1 to 5 sequential images
              </p>
            </div>
          </div>
        </div>

        {/* Missing API Key Notice */}
        {backendConfigured === false && (
          <div className="studio-error-banner" style={{ background: 'rgba(224, 159, 62, 0.1)', borderColor: 'rgba(224, 159, 62, 0.35)', color: 'var(--amber-primary)' }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, marginBottom: '2px' }}>
                Gemini API Key Required
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Please configure <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>GEMINI_API_KEY</code> in your local <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>.env</code> file to enable live AI multimodal story generation and Gemini TTS.
              </p>
            </div>
          </div>
        )}

        {/* Multi-Image Sequence Section */}
        {imageCount === 0 ? (
          <div
            className={`studio-dropzone ${isDragActive ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: 'none' }}
            />
            <div className="dropzone-icon">
              <Upload size={24} />
            </div>
            <div className="dropzone-prompt">Choose 1 to 5 images or drop them here</div>
            <p className="dropzone-hint">
              Select multiple files or drag them in. Supports JPEG, PNG, or WebP up to 5MB each.
              Gemini Vision will sequence your images into connected narrative scenes.
            </p>
          </div>
        ) : (
          <div className="studio-multi-image-container">
            <div className="studio-sequence-header">
              <div className="sequence-header-left">
                <span className="sequence-title">
                  <Layers size={14} />
                  Narrative Image Sequence ({imageCount} of 5 images)
                </span>
                <span className="sequence-note">
                  Each image anchors a corresponding story scene in this exact order.
                </span>
              </div>
              <div className="sequence-header-right">
                {imageCount < 5 && !isGenerating && (
                  <button
                    type="button"
                    className="btn-add-more-images"
                    onClick={() => addMoreInputRef.current?.click()}
                  >
                    <Plus size={13} />
                    <span>Add Images</span>
                  </button>
                )}
                {!isGenerating && (
                  <button
                    type="button"
                    className="btn-clear-images"
                    onClick={handleClearAllImages}
                    title="Remove all uploaded images"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Hidden file input for adding more images */}
            <input
              type="file"
              ref={addMoreInputRef}
              onChange={handleFileInputChange}
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: 'none' }}
            />

            {/* Ordered List of Uploaded Images */}
            <div className="studio-image-items-list">
              {uploadedImages.map((img, idx) => (
                <div key={img.id} className="studio-image-item">
                  <div className="studio-item-badge">
                    <span className="badge-scene-num">Scene {idx + 1}</span>
                    {idx === 0 && <span className="badge-cover-tag">Cover</span>}
                  </div>

                  <div className="studio-item-thumb-wrapper">
                    <img src={img.previewUrl} alt={`Scene ${idx + 1} seed`} className="studio-item-thumb" />
                  </div>

                  <div className="studio-item-info">
                    <span className="studio-item-name" title={img.name}>
                      {img.name}
                    </span>
                    <span className="studio-item-size">
                      {(img.size / (1024 * 1024)).toFixed(2)} MB • Visual Anchor {idx + 1}
                    </span>
                  </div>

                  {!isGenerating && (
                    <div className="studio-item-actions">
                      <button
                        type="button"
                        className="btn-reorder"
                        disabled={idx === 0}
                        onClick={() => handleMoveImage(idx, 'up')}
                        title="Move Earlier in Story"
                        aria-label={`Move image ${idx + 1} earlier`}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-reorder"
                        disabled={idx === uploadedImages.length - 1}
                        onClick={() => handleMoveImage(idx, 'down')}
                        title="Move Later in Story"
                        aria-label={`Move image ${idx + 1} later`}
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-remove-thumb"
                        onClick={() => handleRemoveImage(idx)}
                        title="Remove image from story"
                        aria-label={`Remove image ${idx + 1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Additional Concluding Scene Option */}
            <div className="studio-extra-scene-toggle">
              <label className="studio-checkbox-label">
                <input
                  type="checkbox"
                  checked={addExtraScene}
                  disabled={isGenerating}
                  onChange={(e) => setAddExtraScene(e.target.checked)}
                />
                <div className="checkbox-text-group">
                  <span className="checkbox-title">
                    Generate an additional concluding scene illustration
                  </span>
                  <span className="checkbox-subtitle">
                    Synthesizes an AI-illustrated final scene (+1 scene) to resolve the narrative arc beyond the uploaded images.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Validation Error Message */}
        {validationError && (
          <div className="studio-error-banner" style={{ marginTop: '8px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Creative Controls: 3-Column Responsive Grid (Genre with Auto-detect, Narrator, Art Movement) */}
        <div className="studio-controls-container">
          {/* Section 1: Literary Genre */}
          <div className="studio-control-section">
            <label className="studio-section-label" htmlFor="studio-genre-select">
              <Sliders size={13} />
              <span>Literary Genre</span>
            </label>
            <select
              id="studio-genre-select"
              className="studio-select-input"
              value={genre}
              disabled={isGenerating}
              onChange={(e) => setGenre(e.target.value as Story['genre'])}
            >
              {GENRES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            <span className="narrator-subtitle-chip">
              {genre === 'auto'
                ? 'Gemini infers genre from visual mood & content'
                : 'Prose & atmosphere tinted by chosen genre'}
            </span>
          </div>

          {/* Section 2: Spoken Narrator */}
          <div className="studio-control-section">
            <label className="studio-section-label" htmlFor="studio-narrator-select">
              <Volume2 size={13} />
              <span>Spoken Narrator</span>
            </label>
            <select
              id="studio-narrator-select"
              className="studio-select-input"
              value={narrator}
              disabled={isGenerating}
              onChange={(e) => setNarrator(e.target.value)}
            >
              {NARRATORS.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
            <span
              className="narrator-subtitle-chip"
              title={NARRATORS.find((n) => n.name === narrator)?.desc}
            >
              {NARRATORS.find((n) => n.name === narrator)?.desc || 'AI Voice Model'}
            </span>
          </div>

          {/* Section 3: Artistic Movement Direction */}
          <div className="studio-control-section art-movement-section">
            <label className="studio-section-label">
              <Sparkles size={13} />
              <span>Artistic Movement Direction</span>
            </label>
            <div className="studio-pills-row">
              {ART_MOVEMENTS.map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`studio-pill-btn ${artStyle === style ? 'active' : ''}`}
                  disabled={isGenerating}
                  onClick={() => setArtStyle(style)}
                  title={`Art Movement: ${style}`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Multi-Phase Generation Progress Tracker */}
        {isGenerating && (
          <div className="studio-progress-card">
            <div className="progress-header">
              <div className="progress-status-title">
                <Loader2 size={18} className="progress-spinner" />
                <span>
                  {stage === 'analyzing' && `Analyzing ${imageCount} Visual Anchors & Synthesizing Genre...`}
                  {stage === 'drafting' && `Composing ${sceneCount}-Scene Connected Chronicle...`}
                  {stage === 'illustrating' && 'Synchronizing Scene Illustrations & Lighting...'}
                  {stage === 'voicing' && `Mastering Spoken Voice Narration with ${narrator}...`}
                </span>
              </div>
            </div>

            <div className="progress-steps-list">
              <div
                className={`progress-step-item ${
                  stage === 'analyzing'
                    ? 'active'
                    : ['drafting', 'illustrating', 'voicing'].includes(stage)
                    ? 'completed'
                    : ''
                }`}
              >
                <div className="step-indicator-circle">
                  {['drafting', 'illustrating', 'voicing'].includes(stage) ? '✓' : '1'}
                </div>
                <span>Multimodal Vision Grounding & Auto Genre Inference</span>
              </div>

              <div
                className={`progress-step-item ${
                  stage === 'drafting'
                    ? 'active'
                    : ['illustrating', 'voicing'].includes(stage)
                    ? 'completed'
                    : ''
                }`}
              >
                <div className="step-indicator-circle">
                  {['illustrating', 'voicing'].includes(stage) ? '✓' : '2'}
                </div>
                <span>{sceneCount}-Scene Sequential Narrative Composition</span>
              </div>

              <div
                className={`progress-step-item ${
                  stage === 'illustrating'
                    ? 'active'
                    : stage === 'voicing'
                    ? 'completed'
                    : ''
                }`}
              >
                <div className="step-indicator-circle">
                  {stage === 'voicing' ? '✓' : '3'}
                </div>
                <span>Visual Anchor Preservation & Scene Continuity</span>
              </div>

              <div
                className={`progress-step-item ${stage === 'voicing' ? 'active' : ''}`}
              >
                <div className="step-indicator-circle">4</div>
                <span>Spoken Audio Narration Production (Synchronized Scene Timestamps)</span>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {stage === 'complete' && (
          <div className="studio-progress-card" style={{ borderColor: '#70B87A' }}>
            <div className="progress-status-title" style={{ color: '#70B87A' }}>
              <CheckCircle2 size={20} />
              <span>Chronicle Illuminated & Mastered! Opening Reader...</span>
            </div>
          </div>
        )}

        {/* Error Banner with Retry */}
        {stage === 'error' && (
          <div className="studio-error-banner">
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>Generation Encountered an Error</p>
              <p>{errorMessage}</p>
              <button className="btn-retry-generation" onClick={handleGenerateStory}>
                <RefreshCw size={12} style={{ display: 'inline', marginRight: '6px' }} />
                Retry Synthesis
              </button>
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="studio-action-row">
          <button
            className="btn-replace-image"
            onClick={onClose}
            disabled={isGenerating}
            style={{ margin: 0 }}
          >
            Cancel
          </button>
          <button
            className="btn-synthesize-story"
            onClick={handleGenerateStory}
            disabled={imageCount === 0 || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="progress-spinner" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <BookOpen size={16} />
                <span>
                  {imageCount > 0
                    ? `Synthesize ${sceneCount}-Scene Story & Narration`
                    : 'Upload Images to Synthesize'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Radio,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Bookmark,
} from 'lucide-react';
import type { Story, Chapter } from '../types';

import { calibrateStoryChapters } from '../utils/audioSync';

interface StoryReaderProps {
  story: Story;
  onBack: () => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  onPlay: (story: Story, startTime?: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onSetRate: (rate: number) => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
}

export const StoryReader: React.FC<StoryReaderProps> = ({
  story,
  onBack,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  volume,
  isMuted,
  onPlay,
  onTogglePlay,
  onSeek,
  onSkip,
  onSetRate,
  onSetVolume,
  onToggleMute,
}) => {
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [imageError, setImageError] = useState<boolean>(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(1); // 0 = standard, 1 = comfortable, 2 = large
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isArtworkZoomed, setIsArtworkZoomed] = useState<boolean>(false);
  const [artworkFitMode, setArtworkFitMode] = useState<'contain' | 'cover'>('contain');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const narrativeContainerRef = useRef<HTMLDivElement | null>(null);
  const isManualSeekRef = useRef<boolean>(false);
  const manualSeekTimerRef = useRef<number | null>(null);

  const effectiveDuration = (duration > 0 && isFinite(duration)) ? duration : (story.durationSec || 0);

  // Auto-calibrate chapters to ensure all timestamps are valid and strictly less than real duration
  const chapters: Chapter[] = useMemo(() => {
    const raw = story.chapters && story.chapters.length > 0 ? story.chapters : [];
    if (raw.length === 0) {
      return [
        {
          id: 'ch-default',
          title: 'I. Complete Chronicle',
          time: '00:00',
          timeSec: 0,
          content: [story.synopsis],
          sceneImage: story.coverImage,
          artMovement: story.artStyle,
        },
      ];
    }
    const calibratedStory = calibrateStoryChapters(story, effectiveDuration);
    return calibratedStory.chapters;
  }, [story, effectiveDuration]);

  const currentChapter = chapters[activeChapterIndex] || chapters[0];
  // Scene 1 uses the uploaded seed image; Scenes 2-4 require their own generated image or render an honest fallback
  const activeImage = activeChapterIndex === 0
    ? (currentChapter.sceneImage || story.coverImage)
    : currentChapter.sceneImage;
  const hasImage = Boolean(activeImage && !imageError);

  // Reset image error state when scene changes
  useEffect(() => {
    setImageError(false);
  }, [activeChapterIndex]);

  // Scroll to top of narrative container when chapter changes
  useEffect(() => {
    if (narrativeContainerRef.current) {
      narrativeContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeChapterIndex]);

  // Synchronize active chapter with audio playback time ONLY when actively playing
  useEffect(() => {
    // If not playing or user manually selected a chapter, do NOT let currentTime revert the active chapter
    if (!isPlaying || isManualSeekRef.current) return;
    if (!story.isPlayable || effectiveDuration <= 0) return;

    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime >= chapters[i].timeSec - 0.25) {
        if (activeChapterIndex !== i) {
          setActiveChapterIndex(i);
        }
        break;
      }
    }
  }, [currentTime, isPlaying, story.isPlayable, effectiveDuration, chapters, activeChapterIndex]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;
  const storyProgressPercent = Math.round(((activeChapterIndex + 1) / chapters.length) * 100);

  // Handle scrubber click to seek audio
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || effectiveDuration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickFraction = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(clickFraction * effectiveDuration);
  };

  // Chapter navigation actions
  const goToChapter = (index: number) => {
    if (index >= 0 && index < chapters.length) {
      // 1. Immediately update displayed scene heading, illustration, and text together
      setActiveChapterIndex(index);

      // 2. Lock manual selection to prevent audio sync race conditions
      isManualSeekRef.current = true;
      if (manualSeekTimerRef.current) window.clearTimeout(manualSeekTimerRef.current);
      manualSeekTimerRef.current = window.setTimeout(() => {
        isManualSeekRef.current = false;
      }, 1500);

      // 3. Seek audio to that chapter's actual timeSec
      if (story.isPlayable) {
        const targetTime = chapters[index].timeSec;
        onPlay(story, targetTime);
        onSeek(targetTime);
      }
    }
  };

  const handleRegenerateNarration = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          title: story.title,
          synopsis: story.synopsis,
          chapters: story.chapters,
          narrator: story.narrator,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.audioUrl) {
        throw new Error(data.error || 'Failed to regenerate narration audio.');
      }

      story.audioUrl = data.audioUrl;
      story.duration = data.duration;
      story.durationSec = data.durationSec;
      story.chapters = story.chapters.map((ch, idx) => ({
        ...ch,
        time: data.chapters[idx]?.time ?? ch.time,
        timeSec: data.chapters[idx]?.timeSec ?? ch.timeSec,
      }));

      // Update localStorage if it's a generated story
      try {
        const saved = localStorage.getItem('storycanvas_generated_stories');
        if (saved) {
          const list: Story[] = JSON.parse(saved);
          const updated = list.map((s) => (s.id === story.id ? { ...story } : s));
          localStorage.setItem('storycanvas_generated_stories', JSON.stringify(updated));
        }
      } catch {
        // fallback
      }

      // Start playing the newly generated audio
      onPlay(story, 0);
    } catch (e: unknown) {
      console.error('Speech regeneration failed:', e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePrevScene = () => {
    if (activeChapterIndex > 0) {
      goToChapter(activeChapterIndex - 1);
    }
  };

  const handleNextScene = () => {
    if (activeChapterIndex < chapters.length - 1) {
      goToChapter(activeChapterIndex + 1);
    }
  };

  // Cycle playback speed
  const handleCycleRate = () => {
    const rates = [1, 1.25, 1.5, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    onSetRate(rates[nextIndex]);
  };

  // Font size multiplier
  const fontSizes = ['1rem', '1.125rem', '1.25rem'];

  return (
    <div className={`story-reader-view ${isFocusMode ? 'focus-mode' : ''}`}>
      {/* Top Navigation Bar */}
      <header className="reader-top-bar">
        <button
          className="reader-back-btn"
          onClick={onBack}
          aria-label="Return to curated gallery"
        >
          <ArrowLeft size={16} />
          <span>Return to Salon</span>
        </button>

        <div className="reader-header-meta">
          <span className="reader-progress-chip">
            Scene {activeChapterIndex + 1} of {chapters.length} • {storyProgressPercent}% Read
          </span>
        </div>

        <div className="reader-top-controls">
          {/* Font Size Adjusters */}
          <button
            className="reader-tool-btn"
            onClick={() => setFontSizeLevel((prev) => (prev > 0 ? prev - 1 : 0))}
            title="Decrease font size"
            disabled={fontSizeLevel === 0}
          >
            A-
          </button>
          <button
            className="reader-tool-btn"
            onClick={() => setFontSizeLevel((prev) => (prev < 2 ? prev + 1 : 2))}
            title="Increase font size"
            disabled={fontSizeLevel === 2}
          >
            A+
          </button>

          {/* Focus Mode Toggle */}
          <button
            className={`reader-tool-btn ${isFocusMode ? 'active' : ''}`}
            onClick={() => setIsFocusMode(!isFocusMode)}
            title={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
          >
            {isFocusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span style={{ display: 'none' }}>Focus</span>
          </button>
        </div>
      </header>

      {/* Split Screen Layout */}
      <div className="reader-split-layout">
        {/* Left Pane: Cinematic Artwork Stage */}
        <section
          className={`reader-artwork-pane ${artworkFitMode === 'cover' ? 'fit-cover' : 'fit-contain'}`}
          aria-label="Scene Illustration"
        >
          {/* Ambient Blurred Backdrop so full-fit images have a rich atmospheric stage */}
          {hasImage && (
            <img
              src={activeImage}
              alt=""
              aria-hidden="true"
              className="reader-artwork-ambient-bg"
            />
          )}
          <div className="reader-artwork-gradient" />

          {/* Artwork Top Overlay Badges */}
          <div className="reader-artwork-top-overlay">
            <span className="reader-art-movement-tag">
              <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
              {currentChapter.artMovement || story.artStyle}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="reader-scene-badge">
                Scene {activeChapterIndex + 1}/{chapters.length}
              </span>
              <button
                className="reader-tool-btn"
                style={{ padding: '4px 9px', fontSize: '0.7rem' }}
                onClick={() => setArtworkFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                title={artworkFitMode === 'contain' ? 'Switch to Fill frame' : 'Switch to Fit full image'}
              >
                {artworkFitMode === 'contain' ? 'Fill' : 'Fit'}
              </button>
              <button
                className="reader-tool-btn"
                style={{ padding: '4px 8px' }}
                onClick={() => setIsArtworkZoomed(!isArtworkZoomed)}
                title="Expand artwork"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          <div className="reader-artwork-wrapper">
            {hasImage ? (
              <img
                src={activeImage}
                alt={currentChapter.title}
                className={`reader-artwork-image ${artworkFitMode === 'cover' ? 'is-cover' : 'is-contain'}`}
                onClick={() => setIsArtworkZoomed(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              /* Graceful Image Fallback */
              <div className="reader-artwork-fallback">
                <div className="reader-fallback-icon">
                  <ImageIcon size={30} />
                </div>
                <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  {story.title}
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Scene illustration: {currentChapter.title}
                </p>
                {activeChapterIndex > 0 && !currentChapter.sceneImage && (
                  <span style={{ fontSize: '0.74rem', color: 'var(--amber-primary)', marginTop: '4px', opacity: 0.9 }}>
                    Visual generation paused (provider rate limit: 1 image/45s) • Editorial plate active
                  </span>
                )}
                <span className="reader-art-movement-tag" style={{ marginTop: '8px' }}>
                  {currentChapter.artMovement || story.artStyle}
                </span>
              </div>
            )}
          </div>

          {/* Artwork Bottom Caption & Scene Dots */}
          <div className="reader-artwork-bottom-overlay">
            {currentChapter.imageCaption && (
              <p className="reader-image-caption">
                "{currentChapter.imageCaption}"
              </p>
            )}

            {/* Scene Dots Strip */}
            <div className="reader-scene-dots-strip" role="tablist" aria-label="Scene selector">
              {chapters.map((chap, idx) => (
                <button
                  key={chap.id}
                  className={`scene-dot-btn ${activeChapterIndex === idx ? 'active' : ''}`}
                  onClick={() => goToChapter(idx)}
                  title={`${chap.title} (${chap.time})`}
                  aria-label={`Jump to ${chap.title}`}
                  role="tab"
                  aria-selected={activeChapterIndex === idx}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Right Pane: Narrative & Spoken Narration Controls */}
        <section
          className="reader-narrative-pane"
          ref={narrativeContainerRef}
          aria-label="Story Narrative and Narration Controls"
        >
          {/* Story Meta Header */}
          <div className="reader-story-meta-header">
            <div className="reader-breadcrumbs">
              <span className="reader-breadcrumb-link" onClick={onBack}>
                StoryCanvas
              </span>
              <span>›</span>
              <span>{story.genreLabel}</span>
              <span>›</span>
              <span style={{ color: 'var(--text-primary)' }}>{story.title}</span>
            </div>

            <h1 className="reader-story-title">{story.title}</h1>
            <p className="reader-story-subtitle">{story.subtitle}</p>

            <div className="reader-narrator-bar">
              <span className="reader-author-name">
                Written by <strong>{story.author}</strong>
              </span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span className="reader-narrator-name">
                <Radio size={13} />
                {story.narrator}
              </span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ color: 'var(--text-muted)' }}>{story.duration}</span>
            </div>
          </div>

          {/* Integrated Narration Controls Card */}
          {story.isPlayable ? (
            <div className="reader-narration-card">
              <div className="narration-header-row">
                <div className="narration-label-group">
                  {isPlaying && <span className="narration-icon-pulse" />}
                  <span className="narration-card-title">Spoken Narration Engine</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="reader-tool-btn"
                    onClick={handleRegenerateNarration}
                    disabled={isRegenerating}
                    title="Regenerate narration audio for all scenes"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RotateCcw size={12} className={isRegenerating ? 'spin' : ''} />
                    <span>{isRegenerating ? 'Synthesizing...' : 'Regenerate Audio'}</span>
                  </button>
                  <span className="narration-card-status">
                    {isPlaying ? 'Active Audio Narration' : 'Paused'}
                  </span>
                </div>
              </div>

              {/* Scrubber Row */}
              <div className="reader-scrubber-row">
                <span className="time-stamp current">{formatTime(currentTime)}</span>

                <div
                  className="scrubber-track"
                  ref={scrubberRef}
                  onClick={handleScrubberClick}
                  role="slider"
                  aria-valuenow={currentTime}
                  aria-valuemin={0}
                  aria-valuemax={effectiveDuration}
                  aria-label="Narration scrubber"
                >
                  <div
                    className="scrubber-progress"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <div
                    className="scrubber-thumb"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>

                <span className="time-stamp">{formatTime(effectiveDuration)}</span>
              </div>

              {/* Controls Actions Row */}
              <div className="reader-controls-actions">
                <div className="reader-transport-group">
                  {/* Skip -15s */}
                  <button
                    className="btn-transport-secondary"
                    onClick={() => onSkip(-15)}
                    title="Jump back 15 seconds"
                    aria-label="Jump back 15 seconds"
                  >
                    <RotateCcw size={18} />
                    <span className="transport-badge-num">15</span>
                  </button>

                  {/* Play / Pause Main Button */}
                  <button
                    className="btn-reader-play"
                    onClick={onTogglePlay}
                    title={isPlaying ? 'Pause Narration' : 'Play Narration'}
                    aria-label={isPlaying ? 'Pause Narration' : 'Play Narration'}
                  >
                    {isPlaying ? (
                      <Pause size={20} fill="currentColor" />
                    ) : (
                      <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
                    )}
                  </button>

                  {/* Skip +15s */}
                  <button
                    className="btn-transport-secondary"
                    onClick={() => onSkip(15)}
                    title="Jump forward 15 seconds"
                    aria-label="Jump forward 15 seconds"
                  >
                    <RotateCw size={18} />
                    <span className="transport-badge-num">15</span>
                  </button>

                  {/* Speed Toggle */}
                  <button
                    className="btn-speed-toggle"
                    onClick={handleCycleRate}
                    title="Toggle playback rate"
                  >
                    {playbackRate}x
                  </button>
                </div>

                {/* Volume Utilities */}
                <div className="reader-volume-group">
                  <button
                    className="btn-transport-secondary"
                    onClick={onToggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onSetVolume(parseFloat(e.target.value))}
                    className="volume-slider"
                    title="Volume"
                    aria-label="Volume slider"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Graceful Missing Audio Fallback Notice */
            <div className="reader-placeholder-banner">
              <Info size={18} style={{ color: 'var(--amber-primary)', flexShrink: 0 }} />
              <div>
                <strong>Spoken Narration in Production</strong> — Full vocal performance and musical score are in progress for this story. The complete literary prose and chapter scenes are available below for reading.
              </div>
            </div>
          )}

          {/* Chapter Selector Tabs Strip */}
          <div className="reader-chapters-tabs">
            <span className="reader-chapters-label">Chapters & Scene Index:</span>
            <div className="reader-chapters-list">
              {chapters.map((chap, idx) => (
                <button
                  key={chap.id}
                  className={`reader-chapter-tab ${activeChapterIndex === idx ? 'active' : ''}`}
                  onClick={() => goToChapter(idx)}
                >
                  <Bookmark size={11} />
                  <span>{chap.title}</span>
                  <span style={{ opacity: 0.6 }}>({chap.time})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Editorial Prose Section */}
          <article className="reader-prose-container">
            <h2 className="reader-chapter-heading">{currentChapter.title}</h2>

            {currentChapter.content && currentChapter.content.length > 0 ? (
              currentChapter.content.map((paragraph, pIdx) => (
                <p
                  key={pIdx}
                  className={`reader-paragraph ${pIdx === 0 ? 'dropcap' : ''}`}
                  style={{ fontSize: fontSizes[fontSizeLevel] }}
                >
                  {paragraph}
                </p>
              ))
            ) : (
              <p
                className="reader-paragraph dropcap"
                style={{ fontSize: fontSizes[fontSizeLevel] }}
              >
                {story.synopsis}
              </p>
            )}
          </article>

          {/* Bottom Scene Stepper Bar */}
          <div className="reader-scene-stepper">
            <button
              className="btn-scene-step"
              onClick={handlePrevScene}
              disabled={activeChapterIndex === 0}
              aria-label="Previous scene"
            >
              <ChevronLeft size={16} />
              <span>Previous Scene</span>
            </button>

            <div className="scene-step-progress-indicator">
              <span className="scene-step-text">
                Scene {activeChapterIndex + 1} of {chapters.length} ({storyProgressPercent}%)
              </span>
              <div className="scene-progress-bar-track">
                <div
                  className="scene-progress-bar-fill"
                  style={{ width: `${storyProgressPercent}%` }}
                />
              </div>
            </div>

            {activeChapterIndex < chapters.length - 1 ? (
              <button
                className="btn-scene-step"
                onClick={handleNextScene}
                aria-label="Next scene"
              >
                <span>Next Scene</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                className="btn-scene-step"
                style={{ borderColor: 'var(--border-amber)', color: 'var(--amber-primary)' }}
                onClick={onBack}
              >
                <span>Complete Story</span>
                <Sparkles size={14} />
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Artwork Zoom Modal Overlay */}
      {isArtworkZoomed && (
        <div
          className="modal-backdrop"
          onClick={() => setIsArtworkZoomed(false)}
          role="dialog"
          aria-label="Artwork Fullscreen View"
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage}
              alt={currentChapter.title}
              style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '88vh' }}
            />
            <button
              className="btn-modal-close"
              onClick={() => setIsArtworkZoomed(false)}
              aria-label="Close zoomed artwork"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

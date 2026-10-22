import React, { useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
  Radio,
} from 'lucide-react';
import type { Story, AudioVignette } from '../types';

interface AudioDockProps {
  track: Story | AudioVignette | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onSetRate: (rate: number) => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
  onClose: () => void;
}

export const AudioDock: React.FC<AudioDockProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  volume,
  isMuted,
  onTogglePlay,
  onSeek,
  onSkip,
  onSetRate,
  onSetVolume,
  onToggleMute,
  onClose,
}) => {
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  if (!track) return null;

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Handle clicking on the scrubber bar to seek
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickFraction = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(clickFraction * duration);
  };

  // Cycle playback speed
  const handleCycleRate = () => {
    const rates = [1, 1.25, 1.5, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    onSetRate(rates[nextIndex]);
  };

  // Get cover image or placeholder
  const isStory = 'coverImage' in track;
  const coverImage = isStory ? (track as Story).coverImage : '/images/hero-observatory.jpg';

  return (
    <div className="audio-dock-container" role="region" aria-label="Audio player">
      <div className="container audio-dock-inner">
        {/* Left: Track Information */}
        <div className="dock-track-info">
          <div className="dock-thumb-frame">
            <img src={coverImage} alt={track.title} className="dock-thumb-img" />
            {isPlaying && (
              <div className="dock-playing-indicator">
                <span className="indicator-bar" />
                <span className="indicator-bar" />
                <span className="indicator-bar" />
              </div>
            )}
          </div>

          <div className="dock-meta-text">
            <div className="dock-track-title" title={track.title}>
              {track.title}
            </div>
            <div className="dock-track-narrator">
              <Radio size={11} />
              <span>{track.narrator}</span>
            </div>
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="dock-center-controls">
          {/* Buttons Row (Ref 2 Voicenotes Style) */}
          <div className="dock-buttons-row">
            {/* Skip Back 15s */}
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
              className="btn-play-pause-main"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
              )}
            </button>

            {/* Skip Forward 15s */}
            <button
              className="btn-transport-secondary"
              onClick={() => onSkip(15)}
              title="Jump forward 15 seconds"
              aria-label="Jump forward 15 seconds"
            >
              <RotateCw size={18} />
              <span className="transport-badge-num">15</span>
            </button>

            {/* Speed Toggle (Ref 2 Style) */}
            <button
              className="btn-speed-toggle"
              onClick={handleCycleRate}
              title="Change playback speed"
            >
              {playbackRate}x
            </button>
          </div>

          {/* Scrubber Progress Bar (Ref 2 & 3) */}
          <div className="dock-scrubber-row">
            <span className="time-stamp current">{formatTime(currentTime)}</span>

            <div
              className="scrubber-track"
              ref={scrubberRef}
              onClick={handleScrubberClick}
              role="slider"
              aria-valuenow={currentTime}
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-label="Audio scrubber"
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

            <span className="time-stamp">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Volume & Dismiss */}
        <div className="dock-right-utilities">
          <div className="volume-control-group">
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
              title="Volume control"
              aria-label="Volume slider"
            />
          </div>

          <button
            className="btn-dock-close"
            onClick={onClose}
            title="Close audio player"
            aria-label="Close audio player"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    </div>
  );
};

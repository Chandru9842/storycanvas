import { useState, useRef, useEffect, useCallback } from 'react';
import type { Story, AudioVignette } from '../types';

export function useAudioPlayer() {
  const [currentTrack, setCurrentTrack] = useState<Story | AudioVignette | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const isSeekingRef = useRef<boolean>(false);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      // Only update currentTime from audio element if we don't have a pending seek or in-flight seeking
      if (pendingSeekRef.current === null && !isSeekingRef.current && !audio.seeking) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleSeeking = () => {
      isSeekingRef.current = true;
    };

    const handleSeeked = () => {
      isSeekingRef.current = false;
      setCurrentTime(audio.currentTime);
    };

    const handleDurationUpdate = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);

        // Apply queued seek as soon as duration and metadata become available
        if (pendingSeekRef.current !== null) {
          const target = pendingSeekRef.current;
          pendingSeekRef.current = null;
          const safeMax = audio.duration > 1 ? audio.duration - 0.05 : audio.duration;
          const clamped = Math.max(0, Math.min(target, safeMax));
          isSeekingRef.current = true;
          audio.currentTime = clamped;
          setCurrentTime(clamped);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Keep currentTime at the end of the track so the final chapter remains active
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setCurrentTime(audio.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('loadedmetadata', handleDurationUpdate);
    audio.addEventListener('durationchange', handleDurationUpdate);
    audio.addEventListener('canplay', handleDurationUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('loadedmetadata', handleDurationUpdate);
      audio.removeEventListener('durationchange', handleDurationUpdate);
      audio.removeEventListener('canplay', handleDurationUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update volume and mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Auto-dismiss notice
  useEffect(() => {
    if (noticeMessage) {
      const timer = setTimeout(() => setNoticeMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [noticeMessage]);

  const playTrack = useCallback((track: Story | AudioVignette, startTime?: number) => {
    if (!track.isPlayable || !track.audioUrl) {
      if ('status' in track && track.status === 'generating') {
        setNoticeMessage(`"${track.title}" narration is currently being synthesized...`);
      } else if ('status' in track && track.status === 'draft') {
        setNoticeMessage(`"${track.title}" is in draft status. Click "Generate Narration" to synthesize spoken audio.`);
      } else if ('status' in track && track.status === 'error') {
        setNoticeMessage(`"${track.title}" narration failed. Please retry generation.`);
      } else {
        setNoticeMessage(`"${track.title}" audio is not ready for playback.`);
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    const targetTime = typeof startTime === 'number' && !isNaN(startTime) && startTime >= 0
      ? startTime
      : 0;

    if (currentTrack?.id === track.id) {
      if (typeof startTime === 'number') {
        const maxDur = (audio.duration && isFinite(audio.duration) && audio.duration > 0)
          ? audio.duration
          : (duration || track.durationSec || targetTime);
        const safeMax = maxDur > 1 ? maxDur - 0.05 : maxDur;
        const clamped = Math.max(0, Math.min(targetTime, safeMax));
        pendingSeekRef.current = null;
        isSeekingRef.current = true;
        audio.currentTime = clamped;
        setCurrentTime(clamped);
        if (audio.paused) {
          audio.play().catch(e => console.warn('Audio play error:', e));
        }
      } else {
        if (audio.paused) {
          audio.play().catch(e => console.warn('Audio play error:', e));
        } else {
          audio.pause();
        }
      }
      return;
    }

    // New track
    setCurrentTrack(track);
    if (track.durationSec && track.durationSec > 0) {
      setDuration(track.durationSec);
    }
    pendingSeekRef.current = targetTime;
    setCurrentTime(targetTime);
    audio.src = track.audioUrl;
    audio.play().catch(e => console.warn('Audio play error:', e));
  }, [currentTrack, duration]);

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (audio.paused) {
      audio.play().catch(e => console.warn('Audio play error:', e));
    } else {
      audio.pause();
    }
  }, [currentTrack]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const maxDur = (audio.duration && isFinite(audio.duration) && audio.duration > 0)
      ? audio.duration
      : (duration || 0);

    if (audio.readyState < 1 || maxDur <= 0) {
      pendingSeekRef.current = time;
      setCurrentTime(time);
      return;
    }

    const safeMax = maxDur > 1 ? maxDur - 0.05 : maxDur;
    const clamped = Math.max(0, Math.min(time, safeMax));
    pendingSeekRef.current = null;
    isSeekingRef.current = true;
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const maxDur = (audio.duration && isFinite(audio.duration) && audio.duration > 0)
      ? audio.duration
      : (duration || 0);
    const newTime = Math.max(0, maxDur > 0 ? Math.min(audio.currentTime + seconds, maxDur) : audio.currentTime + seconds);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const setRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
  }, []);

  const setVolumeLevel = useCallback((vol: number) => {
    setVolume(vol);
    if (isMuted && vol > 0) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    noticeMessage,
    playTrack,
    pauseTrack,
    togglePlay,
    seek,
    skip,
    setRate,
    setVolumeLevel,
    toggleMute,
    closePlayer,
    dismissNotice: () => setNoticeMessage(null),
  };
}

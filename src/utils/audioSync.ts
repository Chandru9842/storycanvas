import type { Story, Chapter } from '../types';

/**
 * Calibrate chapter timestamps if they exceed the real audio duration
 * (e.g. from the legacy 4000 divisor bug where chapter intervals were doubled).
 */
export function calibrateStoryChapters(story: Story, realDuration?: number): Story {
  if (!story || !Array.isArray(story.chapters) || story.chapters.length <= 1) {
    return story;
  }

  const effectiveDur = typeof realDuration === 'number' && realDuration > 0
    ? realDuration
    : (story.durationSec > 0 ? story.durationSec : 0);

  if (effectiveDur <= 0) return story;

  const rawChapters = story.chapters;
  const lastChap = rawChapters[rawChapters.length - 1];

  // Check if chapters need recalibration (last chapter >= duration or any timestamp >= duration)
  const isMismatched = lastChap.timeSec >= effectiveDur || rawChapters.some(c => c.timeSec >= effectiveDur);

  if (!isMismatched) {
    return story;
  }

  // Calculate proportional intervals to preserve relative scene lengths
  const intervals: number[] = [];
  for (let i = 0; i < rawChapters.length; i++) {
    if (i < rawChapters.length - 1) {
      intervals.push(Math.max(5, rawChapters[i + 1].timeSec - rawChapters[i].timeSec));
    } else {
      intervals.push(intervals[intervals.length - 1] || 25);
    }
  }

  const totalIntervals = intervals.reduce((a, b) => a + b, 0);
  const scale = totalIntervals > 0 ? effectiveDur / totalIntervals : 1;

  let currentSec = 0;
  const updatedChapters: Chapter[] = rawChapters.map((chap, idx) => {
    const startSec = idx === 0 ? 0 : Math.round(currentSec * 10) / 10;
    currentSec += intervals[idx] * scale;
    const mins = Math.floor(startSec / 60);
    const secs = Math.floor(startSec % 60);
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    return {
      ...chap,
      timeSec: startSec,
      time: timeStr,
    };
  });

  return {
    ...story,
    durationSec: Math.round(effectiveDur * 10) / 10,
    duration: `${Math.ceil(effectiveDur / 60)} min listen`,
    chapters: updatedChapters,
  };
}

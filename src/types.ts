export interface Chapter {
  id: string;
  title: string;
  time: string;
  timeSec: number;
  content: string[];
  sceneImage?: string;
  imageCaption?: string;
  artMovement?: string;
  imageIndex?: number;
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  synopsis: string;
  author: string;
  narrator: string;
  genre: 'all' | 'auto' | 'mythology' | 'scifi' | 'folklore' | 'victorian' | 'mystery';
  genreLabel: string;
  artStyle: string;
  duration: string;
  durationSec: number;
  coverImage: string;
  rating: number;
  reviewCount: number;
  reviewQuote?: string;
  reviewAuthor?: string;
  audioUrl?: string;
  isPlayable: boolean;
  tags: string[];
  chapters: Chapter[];
  featured?: boolean;
}

export interface AudioVignette {
  id: string;
  date: string;
  title: string;
  content?: string;
  narrator: string;
  duration: string;
  durationSec: number;
  category: string;
  audioUrl?: string;
  isPlayable: boolean;
  status?: 'ready' | 'generating' | 'draft' | 'error';
  errorMessage?: string;
  createdAt?: number;
  updatedAt?: number;
  isDemonstration?: boolean;
  storyRefId?: string;
}

export type DailyNote = AudioVignette;

export interface AudioPlayerState {
  currentTrack: Story | AudioVignette | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  playTrack: (track: Story | AudioVignette, startTime?: number) => void;
  pauseTrack: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
  setRate: (rate: number) => void;
  setVolumeLevel: (volume: number) => void;
  toggleMute: () => void;
  closePlayer: () => void;
}

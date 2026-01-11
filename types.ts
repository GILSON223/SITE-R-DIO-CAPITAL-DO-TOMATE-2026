
export interface SongInfo {
  title: string;
  artist: string;
  albumArt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export enum PlayerStatus {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LOADING = 'LOADING',
  ERROR = 'ERROR'
}

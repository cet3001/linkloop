export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureData {
  msg: 'capture';
  x: number;
  y: number;
  complete: number;
  windowWidth: number;
  totalWidth: number;
  totalHeight: number;
  devicePixelRatio: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  success: boolean;
  error?: string;
}

export interface AIResult {
  summary?: string;
  success: boolean;
  status?: 'Active' | 'Ghost' | 'Error' | 'LimitReached';
  error?: string;
}

export type MessageType = 
  | 'START_SELECTION'
  | 'CAPTURE_REGION'
  | 'SCROLL_PAGE'
  | 'STITCH_IMAGE'
  | 'AI_PROCESS'
  | 'SHOW_RESULTS'
  | 'OPEN_OPTIONS';

export interface Message {
  type: MessageType;
  data?: any;
}

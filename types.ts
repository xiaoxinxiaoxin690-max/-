export enum TranslationMode {
  TRANSCRIPT_ONLY = '保持原语言 (仅转录)',
  TO_ENGLISH = '翻译为英文 (English)',
  TO_CHINESE = '翻译为中文 (简体)',
  BILINGUAL_CN_EN = '双语字幕 (中文 + 英文)'
}

export interface AudioState {
  file: File | Blob | null;
  url: string | null;
  name: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: string; // "Uploading", "Thinking", "Done"
  error: string | null;
}
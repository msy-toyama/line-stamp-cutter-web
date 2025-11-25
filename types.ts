export interface Sticker {
  id: number;
  originalIndex: number; // 0-39
  dataUrl: string; // Base64
  isMain: boolean;
}

// For JSZip and FileSaver global access
declare global {
  interface Window {
    JSZip: any;
    saveAs: any;
  }
}
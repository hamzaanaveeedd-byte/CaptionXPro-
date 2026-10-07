export type WordToken = {
  id: string;
  text: string;
  punctuated: string;
  start: number;
  end: number;
  confidence?: number;
};

export type Caption = {
  id: string;
  start: number;
  end: number;
  text: string;
  words: WordToken[];
  styleId?: string;
};

export type CaptionStyle = {
  fontSize: number;
  fontWeight: 400 | 600 | 700 | 800;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  positionY: number;
  maxWidth: number;
  textAlign: "left" | "center" | "right";
  italic: boolean;
  uppercase: boolean;
  shadow: boolean;
};

export type MediaInfo = {
  name: string;
  kind: "audio" | "video";
  mimeType: string;
  size: number;
  duration: number;
  objectUrl: string;
};

export type ProjectSnapshot = {
  title: string;
  language: string;
  captions: Caption[];
  style: CaptionStyle;
  updatedAt: string;
};

export type DeepgramWord = {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
  confidence?: number;
};

export type DeepgramResponse = {
  metadata?: { duration?: number };
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: DeepgramWord[];
      }>;
    }>;
  };
};

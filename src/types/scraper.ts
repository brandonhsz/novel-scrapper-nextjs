export interface ScrapeResult {
  chapterTitle: string;
  content: string;
  url: string;
}

export interface ScrapeMultipleResult {
  successful: number;
  failed: number;
  chapters: ScrapeResult[];
  errors: Array<{ counter: number; url: string; error: string }>;
}

export interface Chapter {
  chapterNumber: number;
  chapterTitle: string;
  url: string;
  content: string;
}

export interface NovelData {
  novelName: string;
  chapters: Chapter[];
}


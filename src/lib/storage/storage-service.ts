import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Chapter, NovelData } from '@/types/scraper';

export class StorageService {
  private readonly dataDir = join(process.cwd(), 'data');

  constructor() {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getNovelFilePath(novelName: string): string {
    const sanitizedFileName = novelName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return join(this.dataDir, `${sanitizedFileName}.json`);
  }

  private readNovelFile(novelName: string): NovelData | null {
    const filePath = this.getNovelFilePath(novelName);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent) as NovelData;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  private writeNovelFile(data: NovelData): void {
    const filePath = this.getNovelFilePath(data.novelName);
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  saveChapter(
    novelName: string,
    chapterTitle: string,
    url: string,
    content: string,
  ): { chapterNumber: number; novelData: NovelData } {
    let novelData = this.readNovelFile(novelName);

    if (!novelData) {
      novelData = {
        novelName,
        chapters: [],
      };
    }

    const nextChapterNumber =
      novelData.chapters.length > 0
        ? Math.max(...novelData.chapters.map((ch) => ch.chapterNumber)) + 1
        : 1;

    const newChapter: Chapter = {
      chapterNumber: nextChapterNumber,
      chapterTitle,
      url,
      content,
    };

    novelData.chapters.push(newChapter);
    this.writeNovelFile(novelData);

    return {
      chapterNumber: nextChapterNumber,
      novelData,
    };
  }

  getNovelData(novelName: string): NovelData | null {
    return this.readNovelFile(novelName);
  }

  saveMultipleChapters(
    novelName: string,
    chapters: Array<{ chapterTitle: string; url: string; content: string }>,
  ): { saved: number; novelData: NovelData } {
    let novelData = this.readNovelFile(novelName);

    if (!novelData) {
      novelData = {
        novelName,
        chapters: [],
      };
    }

    let nextChapterNumber =
      novelData.chapters.length > 0
        ? Math.max(...novelData.chapters.map((ch) => ch.chapterNumber)) + 1
        : 1;

    const newChapters: Chapter[] = chapters.map((chapter) => ({
      chapterNumber: nextChapterNumber++,
      chapterTitle: chapter.chapterTitle,
      url: chapter.url,
      content: chapter.content,
    }));

    novelData.chapters.push(...newChapters);
    this.writeNovelFile(novelData);

    return {
      saved: newChapters.length,
      novelData,
    };
  }
}


import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Chapter, NovelData } from '@/types/scraper';

export class StorageService {
  private readonly dataDir = join(process.cwd(), 'data');
  private readonly failedDir = join(process.cwd(), 'data', 'failed');

  constructor() {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    if (!existsSync(this.failedDir)) {
      mkdirSync(this.failedDir, { recursive: true });
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
    // NO guardar en disco - solo retornar los datos en memoria
    // this.writeNovelFile(novelData);

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
    chapters: Array<{ chapterTitle: string; url: string; content: string; counter?: number }>,
  ): { saved: number; novelData: NovelData } {
    let novelData = this.readNovelFile(novelName);

    if (!novelData) {
      novelData = {
        novelName,
        chapters: [],
      };
    }

    const newChapters: Chapter[] = chapters.map((chapter) => {
      // Si tiene counter, usarlo como chapterNumber
      // Si no, usar el método antiguo (para compatibilidad con scraping individual)
      let chapterNumber: number;
      
      if (chapter.counter !== undefined) {
        chapterNumber = chapter.counter;
      } else {
        // Fallback para compatibilidad: calcular basándose en el máximo existente
        chapterNumber =
          novelData.chapters.length > 0
            ? Math.max(...novelData.chapters.map((ch) => ch.chapterNumber)) + 1
            : 1;
      }

      return {
        chapterNumber,
        chapterTitle: chapter.chapterTitle,
        url: chapter.url,
        content: chapter.content,
      };
    });

    // Verificar si hay capítulos duplicados (mismo chapterNumber) y reemplazarlos
    // en lugar de agregarlos
    newChapters.forEach((newChapter) => {
      const existingIndex = novelData.chapters.findIndex(
        (ch) => ch.chapterNumber === newChapter.chapterNumber,
      );
      
      if (existingIndex >= 0) {
        // Reemplazar el capítulo existente
        novelData.chapters[existingIndex] = newChapter;
      } else {
        // Agregar nuevo capítulo
        novelData.chapters.push(newChapter);
      }
    });

    // Ordenar capítulos por chapterNumber
    novelData.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

    // NO guardar en disco - solo retornar los datos en memoria
    // this.writeNovelFile(novelData);

    return {
      saved: newChapters.length,
      novelData,
    };
  }

  /**
   * Genera el JSON de NovelData en memoria sin guardarlo en disco
   */
  generateNovelDataJSON(novelData: NovelData): string {
    return JSON.stringify(novelData, null, 2);
  }

  saveFailedChapters(
    novelName: string,
    errors: Array<{ counter: number; url: string; error: string }>,
  ): { failedData: { novelName: string; errors: Array<{ counter: number; url: string; error: string }>; timestamp: string }; json: string } | null {
    if (errors.length === 0) {
      return null;
    }

    const failedData = {
      novelName,
      errors,
      timestamp: new Date().toISOString(),
    };

    const json = JSON.stringify(failedData, null, 2);

    // NO guardar en disco - solo retornar los datos en memoria
    // writeFileSync(failedFilePath, json, 'utf-8');

    return {
      failedData,
      json,
    };
  }

  /**
   * Genera el JSON de errores en memoria sin guardarlo en disco
   */
  generateFailedChaptersJSON(
    novelName: string,
    errors: Array<{ counter: number; url: string; error: string }>,
  ): string | null {
    if (errors.length === 0) {
      return null;
    }

    const failedData = {
      novelName,
      errors,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(failedData, null, 2);
  }

  getFailedChapters(novelName: string): Array<{ counter: number; url: string; error: string }> | null {
    // Ya no leemos de archivo, pero mantenemos el método para compatibilidad
    // Si se necesita leer de archivos existentes, se puede implementar
    const failedFilePath = join(
      this.failedDir,
      `${novelName.replace(/[^a-zA-Z0-9-_]/g, '_')}_failed.json`,
    );

    if (!existsSync(failedFilePath)) {
      return null;
    }

    try {
      const fileContent = readFileSync(failedFilePath, 'utf-8');
      const failedData = JSON.parse(fileContent) as {
        novelName: string;
        errors: Array<{ counter: number; url: string; error: string }>;
        timestamp: string;
      };
      return failedData.errors;
    } catch (error) {
      console.error(`Error reading failed file ${failedFilePath}:`, error);
      return null;
    }
  }
}


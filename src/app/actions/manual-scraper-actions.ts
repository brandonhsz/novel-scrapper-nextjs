'use server';

import { z } from 'zod';
import { ScraperService } from '@/lib/scraper/scraper-service';
import { StorageService } from '@/lib/storage/storage-service';

const manualScrapeSchema = z.object({
  novelName: z.string().min(1, 'El nombre de la novela es obligatorio'),
  urls: z.array(z.string().url('URL inválida')).min(1, 'Debes proporcionar al menos una URL'),
  titleSelector: z.string().min(1, 'El selector de título es obligatorio'),
  contentSelector: z
    .string()
    .min(1, 'El selector de contenido es obligatorio'),
});

export async function scrapeManualUrlsAction(formData: FormData) {
  try {
    const novelName = formData.get('novelName') as string;
    const urlsJson = formData.get('urls') as string;
    const titleSelector = formData.get('titleSelector') as string;
    const contentSelector = formData.get('contentSelector') as string;

    let urls: string[];
    try {
      urls = JSON.parse(urlsJson);
    } catch {
      return {
        success: false,
        error: 'Formato de URLs inválido',
      };
    }

    const data = manualScrapeSchema.parse({
      novelName,
      urls,
      titleSelector,
      contentSelector,
    });

    const scraperService = new ScraperService();
    const storageService = new StorageService();

    // Obtener errores guardados para mapear URLs a counters
    const failedChapters = storageService.getFailedChapters(data.novelName);
    const urlToCounterMap = new Map<string, number>();
    
    if (failedChapters) {
      failedChapters.forEach((error) => {
        urlToCounterMap.set(error.url, error.counter);
      });
    }

    const chapters: Array<{ chapterTitle: string; url: string; content: string; counter?: number }> = [];
    const errors: Array<{ url: string; error: string }> = [];

    // Procesar URLs en paralelo con concurrencia de 5
    const { processInParallel } = await import('@/lib/scraper/parallel-scraper');
    
    const urlItems = data.urls.map((url, index) => ({ url, index }));
    const results = await processInParallel(
      urlItems,
      async ({ url }) => {
        try {
          const result = await scraperService.scrapeChapter(
            url,
            data.titleSelector,
            data.contentSelector,
          );
          
          // Obtener el counter original del error si existe
          const originalCounter = urlToCounterMap.get(url);
          
          return {
            success: true,
            chapterTitle: result.chapterTitle,
            url: result.url,
            content: result.content,
            counter: originalCounter,
            error: null,
          };
        } catch (error) {
          return {
            success: false,
            chapterTitle: '',
            url,
            content: '',
            counter: undefined,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      5, // Concurrencia: 5 requests simultáneos
    );

    // Separar éxitos y errores
    for (const { result } of results) {
      if (result && result.success) {
        chapters.push({
          chapterTitle: result.chapterTitle,
          url: result.url,
          content: result.content,
          counter: result.counter,
        });
      } else if (result) {
        errors.push({
          url: result.url,
          error: result.error || 'Error desconocido',
        });
      }
    }

    // Generar datos en memoria (no guardar en disco)
    let novelJSON: string | null = null;
    let failedJSON: string | null = null;

    if (chapters.length > 0) {
      const { novelData } = storageService.saveMultipleChapters(data.novelName, chapters);
      novelJSON = storageService.generateNovelDataJSON(novelData);
    }

    // Generar JSON de errores si los hay
    if (errors.length > 0) {
      const errorData = errors.map((e, index) => ({
        counter: index + 1,
        url: e.url,
        error: e.error,
      }));
      const failedResult = storageService.saveFailedChapters(data.novelName, errorData);
      if (failedResult) {
        failedJSON = failedResult.json;
      }
    }

    let message = `Se scrapearon ${chapters.length} capítulo(s) exitosamente`;
    if (errors.length > 0) {
      message += `. ${errors.length} capítulo(s) fallaron`;
    }

    return {
      success: true,
      message,
      saved: chapters.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      novelJSON,
      failedJSON,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(', '),
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error inesperado al realizar el scraping manual',
    };
  }
}


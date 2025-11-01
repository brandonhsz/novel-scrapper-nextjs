'use server';

import { z } from 'zod';
import { ScraperService } from '@/lib/scraper/scraper-service';
import { StorageService } from '@/lib/storage/storage-service';

const scrapeChapterSchema = z.object({
  novelName: z.string().min(1, 'El nombre de la novela es obligatorio'),
  url: z.string().url('URL inválida').optional(),
  urlFormula: z.string().optional(),
  stopCondition: z.string().optional(),
  titleSelector: z.string().min(1, 'El selector de título es obligatorio'),
  contentSelector: z
    .string()
    .min(1, 'El selector de contenido es obligatorio'),
});

export async function scrapeChapterAction(formData: FormData) {
  try {
    const rawData = {
      novelName: formData.get('novelName'),
      url: formData.get('url'),
      urlFormula: formData.get('urlFormula'),
      stopCondition: formData.get('stopCondition'),
      titleSelector: formData.get('titleSelector'),
      contentSelector: formData.get('contentSelector'),
    };

    const data = scrapeChapterSchema.parse(rawData);

    if (!data.novelName || !data.titleSelector || !data.contentSelector) {
      return {
        success: false,
        error:
          'Nombre de novela, selector de título y selector de contenido son obligatorios',
      };
    }

    const scraperService = new ScraperService();
    const storageService = new StorageService();

    // Verificar si es scraping múltiple o individual
    if (data.urlFormula && data.stopCondition) {
      // Scraping múltiple
      const result = await scraperService.scrapeMultipleChapters(
        data.urlFormula,
        data.stopCondition,
        data.titleSelector,
        data.contentSelector,
      );

      if (result.chapters.length === 0) {
        return {
          success: false,
          error:
            'No se pudo scrapear ningún capítulo. Verifica la fórmula de URL y la condición de parada.',
        };
      }

      const { saved } = storageService.saveMultipleChapters(
        data.novelName,
        result.chapters.map((ch) => ({
          chapterTitle: ch.chapterTitle,
          url: ch.url,
          content: ch.content,
          counter: ch.counter, // Incluir el counter para mantener el número correcto
        })),
      );

      let message = `Se scrapearon ${saved} capítulos exitosamente`;
      if (result.failed > 0) {
        message += ` (${result.failed} fallaron)`;
      }

      return {
        success: true,
        message,
      };
    } else if (data.url) {
      // Scraping individual
      const { chapterTitle, content } = await scraperService.scrapeChapter(
        data.url,
        data.titleSelector,
        data.contentSelector,
      );

      const { chapterNumber } = storageService.saveChapter(
        data.novelName,
        chapterTitle,
        data.url,
        content,
      );

      return {
        success: true,
        message: `Capítulo ${chapterNumber} "${chapterTitle}" guardado exitosamente`,
      };
    } else {
      return {
        success: false,
        error:
          'Debes proporcionar una URL individual o una fórmula de URL con condición de parada',
      };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error inesperado al realizar el scraping',
    };
  }
}


import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapeResult, ScrapeMultipleResult } from '@/types/scraper';
import { processInParallel } from './parallel-scraper';

export class ScraperService {
  async scrapeChapter(
    url: string,
    titleSelector: string,
    contentSelector: string,
  ): Promise<ScrapeResult> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);

      const chapterTitle = $(titleSelector).first().text().trim();
      const content = $(contentSelector).first().text().trim();

      if (!chapterTitle) {
        throw new Error(
          `No se pudo encontrar el título del capítulo con el selector: ${titleSelector}`,
        );
      }

      if (!content) {
        throw new Error(
          `No se pudo encontrar el contenido del capítulo con el selector: ${contentSelector}`,
        );
      }

      return {
        chapterTitle,
        content,
        url,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Error al obtener la página: ${error.message}`);
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        `Error al realizar el scraping: ${String(error)}`,
      );
    }
  }

  async scrapeMultipleChapters(
    urlFormula: string,
    stopCondition: string,
    titleSelector: string,
    contentSelector: string,
    onProgress?: (counter: number, chapterTitle: string, url: string) => void,
    concurrency: number = 5,
  ): Promise<ScrapeMultipleResult> {
    if (!urlFormula.includes('${counter}')) {
      throw new Error('La fórmula de URL debe contener ${counter}');
    }

    if (!stopCondition.trim()) {
      throw new Error('La condición de parada es obligatoria');
    }

    // Crear función segura para evaluar la condición
    const evaluateCondition = (
      condition: string,
      counterValue: number,
    ): boolean => {
      try {
        // Reemplazar 'counter' en la condición por el valor actual
        const safeCondition = condition.replace(
          /counter/g,
          counterValue.toString(),
        );
        // Crear función que evalúe la condición de forma segura
        const func = new Function('return ' + safeCondition);
        return func();
      } catch (error) {
        throw new Error(
          `Condición de parada inválida: ${stopCondition}. Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    };

    // Primero, generar todas las URLs que necesitamos scrapear
    const urlsToScrape: Array<{ counter: number; url: string }> = [];
    let counter = 1;
    let shouldContinue = true;

    // Validar que la condición inicial sea válida
    try {
      shouldContinue = evaluateCondition(stopCondition, counter);
    } catch (error) {
      throw new Error(
        `Error al evaluar la condición de parada: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // Generar lista de URLs
    while (shouldContinue) {
      const url = urlFormula.replace('${counter}', counter.toString());
      urlsToScrape.push({ counter, url });

      counter++;

      try {
        shouldContinue = evaluateCondition(stopCondition, counter);
      } catch (error) {
        // Si hay error evaluando la condición, detener
        break;
      }

      // Límite de seguridad para evitar loops infinitos
      if (counter > 10000) {
        throw new Error(
          'Se alcanzó el límite máximo de iteraciones (10000). Verifica tu condición de parada.',
        );
      }
    }

    // Procesar URLs en paralelo
    const results = await processInParallel(
      urlsToScrape,
      async ({ counter, url }) => {
        try {
          const result = await this.scrapeChapter(
            url,
            titleSelector,
            contentSelector,
          );
          return {
            counter,
            url,
            result: { ...result, counter },
            error: null,
          };
        } catch (error) {
          return {
            counter,
            url,
            result: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      concurrency,
      (index, itemResult) => {
        // Callback de progreso cuando se completa un capítulo
        // itemResult es el objeto completo retornado por el processor
        if (itemResult && itemResult.result && onProgress) {
          onProgress(itemResult.counter, itemResult.result.chapterTitle, itemResult.url);
        }
      },
    );

    // Separar éxitos y errores
    const chapters: ScrapeResult[] = [];
    const errors: Array<{ counter: number; url: string; error: string }> = [];

    for (const itemResult of results) {
      // itemResult tiene la estructura: { item, result: R | null, error: string | null, index }
      // donde R es el objeto retornado por el processor: { counter, url, result: ScrapeResult, error: null }
      const processorResult = itemResult.result;
      
      if (processorResult && processorResult.result && !processorResult.error) {
        // processorResult.result es el ScrapeResult con chapterTitle, content, etc.
        chapters.push(processorResult.result);
      } else if (processorResult) {
        // Hubo un error en el processor
        errors.push({
          counter: processorResult.counter,
          url: processorResult.url,
          error: processorResult.error || 'Error desconocido',
        });
      } else if (itemResult.error) {
        // Error al procesar el item (falló el processor mismo)
        const item = itemResult.item as { counter: number; url: string };
        errors.push({
          counter: item.counter,
          url: item.url,
          error: itemResult.error,
        });
      }
    }

    return {
      successful: chapters.length,
      failed: errors.length,
      chapters,
      errors,
    };
  }
}


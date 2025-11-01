import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapeResult, ScrapeMultipleResult } from '@/types/scraper';

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
  ): Promise<ScrapeMultipleResult> {
    if (!urlFormula.includes('${counter}')) {
      throw new Error('La fórmula de URL debe contener ${counter}');
    }

    if (!stopCondition.trim()) {
      throw new Error('La condición de parada es obligatoria');
    }

    const chapters: ScrapeResult[] = [];
    const errors: Array<{ counter: number; url: string; error: string }> = [];
    let counter = 1;
    let shouldContinue = true;

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

    while (shouldContinue) {
      const url = urlFormula.replace('${counter}', counter.toString());

      try {
        const result = await this.scrapeChapter(
          url,
          titleSelector,
          contentSelector,
        );
        chapters.push(result);
        if (onProgress) {
          onProgress(counter, result.chapterTitle, url);
        }
      } catch (error) {
        errors.push({
          counter,
          url,
          error: error instanceof Error ? error.message : String(error),
        });

        // Si hay un error, continuar con el siguiente capítulo
        // pero si hay demasiados errores consecutivos, podríamos detener
      }

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

    return {
      successful: chapters.length,
      failed: errors.length,
      chapters,
      errors,
    };
  }
}


import { NextRequest } from 'next/server';
import { ScraperService } from '@/lib/scraper/scraper-service';
import { StorageService } from '@/lib/storage/storage-service';
import { calculateProgress } from '@/lib/scraper/progress-calculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      urlFormula,
      stopCondition,
      novelName,
      titleSelector,
      contentSelector,
    } = body;

    if (
      !novelName ||
      !titleSelector ||
      !contentSelector ||
      !urlFormula ||
      !stopCondition
    ) {
      return new Response(
        JSON.stringify({
          error: 'Todos los campos son obligatorios para scraping múltiple',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Crear un ReadableStream para SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const scraperService = new ScraperService();
        const storageService = new StorageService();

        const sendEvent = (type: string, data: unknown) => {
          const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          const chapters: Array<{
            chapterTitle: string;
            url: string;
            content: string;
          }> = [];

          const result = await scraperService.scrapeMultipleChapters(
            urlFormula,
            stopCondition,
            titleSelector,
            contentSelector,
            (counter: number, chapterTitle: string, url: string) => {
              const progressPercent = calculateProgress(counter, stopCondition);
              sendEvent('progress', {
                counter,
                chapterTitle,
                url,
                progress: progressPercent,
              });
            },
          );

          // Guardar todos los capítulos con su counter
          chapters.push(
            ...result.chapters.map((ch) => ({
              chapterTitle: ch.chapterTitle,
              url: ch.url,
              content: ch.content,
              counter: ch.counter, // Incluir el counter para mantener el número correcto
            })),
          );

          const { saved } = storageService.saveMultipleChapters(
            novelName,
            chapters,
          );

          // Guardar capítulos fallidos
          if (result.errors.length > 0) {
            storageService.saveFailedChapters(novelName, result.errors);
          }

          // Obtener URLs fallidas para mostrar en el modal
          const failedUrls = result.errors.map((e) => e.url);

          sendEvent('complete', {
            success: true,
            saved,
            failed: result.failed,
            message: `Se scrapearon ${saved} capítulos exitosamente${
              result.failed > 0 ? ` (${result.failed} fallaron)` : ''
            }`,
            novelName,
            titleSelector,
            contentSelector,
            failedUrls,
          });

          controller.close();
        } catch (error) {
          sendEvent('error', {
            error:
              error instanceof Error
                ? error.message
                : 'Error inesperado al realizar el scraping',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Error al iniciar el scraping',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}


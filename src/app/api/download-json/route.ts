import { NextRequest } from 'next/server';
import { StorageService } from '@/lib/storage/storage-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const novelName = searchParams.get('novelName');
    const type = searchParams.get('type'); // 'novel' or 'failed'

    if (!novelName || !type) {
      return new Response(
        JSON.stringify({
          error: 'El nombre de la novela y el tipo son obligatorios',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const storageService = new StorageService();

    if (type === 'novel') {
      const novelData = storageService.getNovelData(novelName);
      
      if (!novelData) {
        return new Response(
          JSON.stringify({
            error: 'No se encontraron datos para esta novela',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      const json = storageService.generateNovelDataJSON(novelData);
      const sanitizedFileName = novelName.replace(/[^a-zA-Z0-9-_]/g, '_');

      return new Response(json, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${sanitizedFileName}.json"`,
        },
      });
    } else if (type === 'failed') {
      const failedChapters = storageService.getFailedChapters(novelName);
      
      if (!failedChapters || failedChapters.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'No se encontraron errores para esta novela',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      const json = storageService.generateFailedChaptersJSON(novelName, failedChapters);
      
      if (!json) {
        return new Response(
          JSON.stringify({
            error: 'No se pudo generar el JSON de errores',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      const sanitizedFileName = novelName.replace(/[^a-zA-Z0-9-_]/g, '_');

      return new Response(json, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${sanitizedFileName}_failed.json"`,
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          error: 'Tipo inválido. Use "novel" o "failed"',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Error al generar el JSON para descarga',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

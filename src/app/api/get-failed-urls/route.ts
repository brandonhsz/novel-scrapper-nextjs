import { NextRequest } from 'next/server';
import { StorageService } from '@/lib/storage/storage-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const novelName = searchParams.get('novelName');

    if (!novelName) {
      return new Response(
        JSON.stringify({
          error: 'El nombre de la novela es obligatorio',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const storageService = new StorageService();
    const failedChapters = storageService.getFailedChapters(novelName);

    if (!failedChapters || failedChapters.length === 0) {
      return new Response(
        JSON.stringify({
          urls: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const urls = failedChapters.map((e) => e.url);

    return new Response(
      JSON.stringify({
        urls,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Error al obtener las URLs fallidas',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}


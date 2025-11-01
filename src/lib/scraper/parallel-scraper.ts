/**
 * Utilidad para procesar tareas en paralelo con límite de concurrencia
 */
export async function processInParallel<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 5,
  onProgress?: (index: number, result: R) => void,
): Promise<Array<{ item: T; result: R | null; error: string | null; index: number }>> {
  const results: Array<{ item: T; result: R | null; error: string | null; index: number }> = [];
  let currentIndex = 0;
  const resultsMap = new Map<number, { item: T; result: R | null; error: string | null; index: number }>();

  // Función para procesar un lote de items
  const processBatch = async (): Promise<void> => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      if (index >= items.length) break;

      const item = items[index];
      try {
        const result = await processor(item, index);
        const resultData = { item, result, error: null, index };
        resultsMap.set(index, resultData);
        if (onProgress) {
          onProgress(index, result);
        }
      } catch (error) {
        const resultData = {
          item,
          result: null,
          error: error instanceof Error ? error.message : String(error),
          index,
        };
        resultsMap.set(index, resultData);
        // No llamar onProgress para errores
      }
    }
  };

  // Crear workers concurrentes
  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency && i < items.length; i++) {
    workers.push(processBatch());
  }

  // Esperar a que todos los workers terminen
  await Promise.all(workers);

  // Ordenar resultados por índice original y agregar a array
  for (let i = 0; i < items.length; i++) {
    const result = resultsMap.get(i);
    if (result) {
      results.push(result);
    }
  }

  return results;
}


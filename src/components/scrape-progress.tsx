'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type ScrapeProgress =
  | {
      type: 'progress';
      counter: number;
      chapterTitle: string;
      url: string;
    }
  | {
      type: 'complete';
      message: string;
      saved: number;
      failed?: number;
    }
  | {
      type: 'error';
      error: string;
    };

interface ScrapeProgressProps {
  progress: ScrapeProgress | null;
}

export function ScrapeProgressComponent({ progress }: ScrapeProgressProps) {
  if (!progress) {
    return null;
  }

  if (progress.type === 'error') {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{progress.error}</p>
        </CardContent>
      </Card>
    );
  }

  if (progress.type === 'progress') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scrapeando...</CardTitle>
          <CardDescription>
            Procesando capítulo {progress.counter}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Capítulo {progress.counter}</span>
              <span className="text-muted-foreground">En progreso...</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{progress.chapterTitle}</p>
            <p className="text-xs text-muted-foreground break-all">
              {progress.url}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (progress.type === 'complete') {
    return (
      <Card className="border-green-500 dark:border-green-600">
        <CardHeader>
          <CardTitle className="text-green-600 dark:text-green-500">
            Completado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-2">{progress.message}</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Capítulos guardados: {progress.saved}</p>
            {progress.failed && progress.failed > 0 && (
              <p className="text-destructive">
                Capítulos fallidos: {progress.failed}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}


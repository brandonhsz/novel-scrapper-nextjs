'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileJson } from 'lucide-react';

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 8,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Círculo de fondo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted"
        />
        {/* Círculo de progreso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300"
        />
      </svg>
      {/* Porcentaje en el centro */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-foreground">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

export type ScrapeProgressModalData =
  | {
      type: 'progress';
      counter: number;
      chapterTitle: string;
      url: string;
      progress: number;
    }
  | {
      type: 'complete';
      message: string;
      saved: number;
      failed?: number;
      novelName?: string;
      titleSelector?: string;
      contentSelector?: string;
      failedUrls?: string[];
      novelJSON?: string;
      failedJSON?: string | null;
    }
  | {
      type: 'error';
      error: string;
    };

interface ScrapeProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: ScrapeProgressModalData | null;
}

export function ScrapeProgressModal({
  open,
  onOpenChange,
  progress,
}: ScrapeProgressModalProps) {
  if (!progress) {
    return null;
  }

  if (progress.type === 'error') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Error</DialogTitle>
            <DialogDescription>{progress.error}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  if (progress.type === 'complete') {
    // Debug: verificar que los JSONs lleguen
    console.log('Progress complete:', {
      hasNovelJSON: !!progress.novelJSON,
      hasFailedJSON: !!progress.failedJSON,
      novelJSONLength: progress.novelJSON?.length,
      failedJSONLength: progress.failedJSON?.length,
    });

    const handleDownloadJSON = (json: string, filename: string) => {
      try {
        console.log('Iniciando descarga:', filename, 'Size:', json.length);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        // Esperar un poco antes de remover
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        console.log('Descarga iniciada:', filename);
      } catch (error) {
        console.error('Error al descargar:', error);
      }
    };

    const handleDownloadNovel = () => {
      if (progress.novelJSON) {
        const sanitizedFileName = (progress.novelName || 'novel').replace(/[^a-zA-Z0-9-_]/g, '_');
        handleDownloadJSON(progress.novelJSON, `${sanitizedFileName}.json`);
      } else {
        console.error('No hay novelJSON disponible');
      }
    };

    const handleDownloadFailed = () => {
      if (progress.failedJSON) {
        const sanitizedFileName = (progress.novelName || 'novel').replace(/[^a-zA-Z0-9-_]/g, '_');
        handleDownloadJSON(progress.failedJSON, `${sanitizedFileName}_failed.json`);
      } else {
        console.error('No hay failedJSON disponible');
      }
    };

    const handleDownloadAll = () => {
      if (progress.novelJSON) {
        handleDownloadNovel();
      }
      if (progress.failedJSON) {
        // Pequeño delay para evitar que el navegador bloquee múltiples descargas
        setTimeout(() => {
          handleDownloadFailed();
        }, 300);
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600 dark:text-green-500">
              Completado
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>{progress.message}</p>
              <div className="space-y-1 text-sm">
                <p>Capítulos guardados: {progress.saved}</p>
                {progress.failed && progress.failed > 0 && (
                  <p className="text-destructive">
                    Capítulos fallidos: {progress.failed}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            {progress.novelJSON && (
              <Button
                onClick={handleDownloadNovel}
                variant="outline"
                className="w-full justify-start"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar JSON de Capítulos
              </Button>
            )}
            {progress.failedJSON && (
              <Button
                onClick={handleDownloadFailed}
                variant="outline"
                className="w-full justify-start"
              >
                <FileJson className="mr-2 h-4 w-4" />
                Descargar JSON de Errores
              </Button>
            )}
            {progress.novelJSON && progress.failedJSON && (
              <Button
                onClick={handleDownloadAll}
                variant="default"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar Ambos JSONs
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const canClose = progress.type !== 'progress';

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // No permitir cerrar mientras está en progreso
      if (!newOpen && !canClose) {
        return;
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-md" showCloseButton={canClose}>
        <DialogHeader>
          <DialogTitle>Scrapeando...</DialogTitle>
          <DialogDescription>
            Procesando capítulos en progreso
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-6 py-6">
          <CircularProgress progress={progress.progress} />
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">
              Capítulo {progress.counter}
            </p>
            <p className="text-sm text-muted-foreground font-medium">
              {progress.chapterTitle}
            </p>
            <p className="text-xs text-muted-foreground break-all max-w-md">
              {progress.url}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


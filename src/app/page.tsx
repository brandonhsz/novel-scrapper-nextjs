'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScraperForm } from '@/components/scraper-form';
import { ScrapeProgressComponent } from '@/components/scrape-progress';
import type { ScrapeProgress } from '@/components/scrape-progress';

export default function Home() {
  const [progress, setProgress] = useState<ScrapeProgress | null>(null);

  const handleProgressChange = (newProgress: ScrapeProgress | null) => {
    setProgress(newProgress);
  };

  const handleSuccess = (message: string) => {
    toast.success(message);
    // Limpiar progreso después de un momento
    setTimeout(() => {
      setProgress(null);
    }, 3000);
  };

  const handleError = (error: string) => {
    toast.error(error);
    // Limpiar progreso después de un momento
    setTimeout(() => {
      setProgress(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            📚 Scraper de Novelas Ligeras
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Extrae capítulos de novelas ligeras desde páginas web
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Configuración de Scraping</CardTitle>
            <CardDescription>
              Completa el formulario para scrapear capítulos individuales o
              múltiples
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScraperForm
              onProgressChange={handleProgressChange}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </CardContent>
        </Card>

        {progress && (
          <ScrapeProgressComponent progress={progress} />
        )}
      </div>
    </div>
  );
}

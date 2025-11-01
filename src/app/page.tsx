'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScraperForm } from '@/components/scraper-form';
import { ScrapeProgressModal } from '@/components/scrape-progress-modal';
import { ThemeToggle } from '@/components/theme-toggle';
import type { ScrapeProgressModalData } from '@/components/scrape-progress-modal';

export default function Home() {
  const [progress, setProgress] = useState<ScrapeProgressModalData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleProgressChange = (newProgress: ScrapeProgressModalData | null) => {
    setProgress(newProgress);
    if (newProgress) {
      setModalOpen(true);
    }
  };

  const handleSuccess = (message: string) => {
    toast.success(message);
    // Cerrar modal después de un momento
    setTimeout(() => {
      setModalOpen(false);
      setProgress(null);
    }, 3000);
  };

  const handleError = (error: string) => {
    toast.error(error);
    // Cerrar modal después de un momento
    setTimeout(() => {
      setModalOpen(false);
      setProgress(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div className="text-center space-y-2 flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              📚 Scraper de Novelas Ligeras
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Extrae capítulos de novelas ligeras desde páginas web
            </p>
          </div>
          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>
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

      </div>

      <ScrapeProgressModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        progress={progress}
      />
    </div>
  );
}

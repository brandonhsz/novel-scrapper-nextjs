'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScraperForm } from '@/components/scraper-form';
import { ScrapeProgressModal } from '@/components/scrape-progress-modal';
import { ThemeToggle } from '@/components/theme-toggle';
import { FloatingManualButton } from '@/components/floating-manual-button';
import type { ScrapeProgressModalData } from '@/components/scrape-progress-modal';

export default function Home() {
  const [progress, setProgress] = useState<ScrapeProgressModalData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [failedData, setFailedData] = useState<{
    novelName: string;
    titleSelector: string;
    contentSelector: string;
    failedUrls: string[];
  } | null>(null);

  const handleProgressChange = (newProgress: ScrapeProgressModalData | null) => {
    setProgress(newProgress);
    
    // Si inicia un nuevo scraping (progreso), ocultar el botón flotante
    if (newProgress?.type === 'progress') {
      setShowFloatingButton(false);
      setFailedData(null);
    }
    
    if (newProgress) {
      setModalOpen(true);
      
      // Si hay errores en el progreso completado, mostrar botón flotante
      if (
        newProgress.type === 'complete' &&
        newProgress.failed &&
        newProgress.failed > 0 &&
        newProgress.novelName &&
        newProgress.titleSelector &&
        newProgress.contentSelector
      ) {
        setShowFloatingButton(true);
        setFailedData({
          novelName: newProgress.novelName,
          titleSelector: newProgress.titleSelector,
          contentSelector: newProgress.contentSelector,
          failedUrls: newProgress.failedUrls || [],
        });
      } else if (newProgress.type === 'complete') {
        // Si completó sin errores, ocultar el botón
        setShowFloatingButton(false);
        setFailedData(null);
      }
    } else {
      // Si no hay progreso, ocultar el botón
      setShowFloatingButton(false);
      setFailedData(null);
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

      {showFloatingButton && failedData && (
        <FloatingManualButton
          novelName={failedData.novelName}
          titleSelector={failedData.titleSelector}
          contentSelector={failedData.contentSelector}
          failedUrls={failedData.failedUrls}
        />
      )}
    </div>
  );
}

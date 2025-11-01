'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { scrapeChapterAction } from '@/app/actions/scraper-actions';
import type { ScrapeProgressModalData } from './scrape-progress-modal';

const scraperFormSchema = z
  .object({
    novelName: z.string().min(1, 'El nombre de la novela es obligatorio'),
    url: z.string().url('URL inválida').optional().or(z.literal('')),
    multiple: z.boolean(),
    enableParallelism: z.boolean(),
    urlFormula: z.string().optional().or(z.literal('')),
    stopCondition: z.string().optional().or(z.literal('')),
    titleSelector: z.string().min(1, 'El selector de título es obligatorio'),
    contentSelector: z
      .string()
      .min(1, 'El selector de contenido es obligatorio'),
  })
  .refine(
    (data) => {
      if (data.multiple) {
        return data.urlFormula && data.stopCondition;
      }
      return data.url;
    },
    {
      message:
        'Debes proporcionar URL individual o fórmula de URL con condición de parada',
      path: ['url'],
    },
  );

type ScraperFormValues = z.infer<typeof scraperFormSchema>;

interface ScraperFormProps {
  onProgressChange?: (progress: ScrapeProgressModalData | null) => void;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function ScraperForm({
  onProgressChange,
  onSuccess,
  onError,
}: ScraperFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMultiple, setIsMultiple] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ScraperFormValues>({
    resolver: zodResolver(scraperFormSchema),
    defaultValues: {
      novelName: '',
      url: '',
      multiple: false,
      enableParallelism: true,
      urlFormula: '',
      stopCondition: '',
      titleSelector: '',
      contentSelector: '',
    },
  });

  const multipleValue = watch('multiple');

  useEffect(() => {
    setIsMultiple(multipleValue);
  }, [multipleValue]);

  const toggleMultiple = (checked: boolean) => {
    setValue('multiple', checked);
    setIsMultiple(checked);
  };

  const onSubmit = async (data: ScraperFormValues) => {
    setIsSubmitting(true);

    try {
      if (data.multiple) {
        // Scraping múltiple con SSE
        const response = await fetch('/api/scrape-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            urlFormula: data.urlFormula,
            stopCondition: data.stopCondition,
            novelName: data.novelName,
            titleSelector: data.titleSelector,
            contentSelector: data.contentSelector,
            enableParallelism: data.enableParallelism,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al iniciar el scraping');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No se pudo obtener el stream de respuesta');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') {
              // Línea vacía indica fin de evento
              if (currentEvent && currentData) {
                try {
                  const eventData = JSON.parse(currentData);

                  if (eventData.counter && eventData.chapterTitle) {
                    onProgressChange?.({
                      type: 'progress',
                      counter: eventData.counter,
                      chapterTitle: eventData.chapterTitle,
                      url: eventData.url,
                      progress: eventData.progress || 0,
                    });
                  } else if (eventData.success !== undefined) {
                    onProgressChange?.({
                      type: 'complete',
                      message: eventData.message || 'Scraping completado',
                      saved: eventData.saved,
                      failed: eventData.failed,
                      novelName: data.novelName,
                      titleSelector: data.titleSelector,
                      contentSelector: data.contentSelector,
                      failedUrls: eventData.failedUrls || [],
                    });
                    onSuccess?.(eventData.message || 'Scraping completado');
                    setIsSubmitting(false);
                  } else if (eventData.error) {
                    onProgressChange?.({
                      type: 'error',
                      error: eventData.error,
                    });
                    onError?.(eventData.error);
                    setIsSubmitting(false);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
                currentEvent = '';
                currentData = '';
              }
            } else if (line.startsWith('event: ')) {
              currentEvent = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData = line.substring(6).trim();
            }
          }
        }
      } else {
        // Scraping individual con Server Action
        const formData = new FormData();
        formData.append('novelName', data.novelName);
        formData.append('url', data.url || '');
        formData.append('titleSelector', data.titleSelector);
        formData.append('contentSelector', data.contentSelector);

        const result = await scrapeChapterAction(formData);

        if (result.success) {
          onSuccess?.(result.message || 'Capítulo scrapeado exitosamente');
        } else {
          onError?.(result.error || 'Error al scrapear el capítulo');
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error inesperado';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="novelName">Nombre de la Novela *</Label>
        <Input
          id="novelName"
          {...register('novelName')}
          placeholder="Ej: Mi Novela Favorita"
        />
        {errors.novelName && (
          <p className="text-sm text-destructive">{errors.novelName.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Este nombre se usará para organizar los archivos JSON
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL del Capítulo</Label>
        <div className="flex items-center gap-3">
          <Input
            id="url"
            className="flex-1"
            {...register('url')}
            placeholder="https://ejemplo.com/capitulo-1"
            disabled={isMultiple}
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="multiple"
              checked={multipleValue}
              onCheckedChange={(checked) => toggleMultiple(checked === true)}
            />
            <Label
              htmlFor="multiple"
              className="cursor-pointer font-normal text-primary"
            >
              Múltiple
            </Label>
          </div>
        </div>
        {errors.url && (
          <p className="text-sm text-destructive">{errors.url.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          URL completa de la página del capítulo a scrapear (solo para scraping
          individual)
        </p>
      </div>

      {isMultiple && (
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableParallelism"
              checked={watch('enableParallelism')}
              onCheckedChange={(checked) =>
                setValue('enableParallelism', checked === true)
              }
            />
            <Label
              htmlFor="enableParallelism"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Activar procesamiento paralelo (más rápido)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urlFormula">
              Fórmula de URL para Múltiples Capítulos
            </Label>
            <Input
              id="urlFormula"
              {...register('urlFormula')}
              placeholder="https://novelhi.com/s/Stellar-Transformation/${counter}"
            />
            {errors.urlFormula && (
              <p className="text-sm text-destructive">
                {errors.urlFormula.message}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Fórmula con ${'{'}counter{'}'} para iterar múltiples capítulos. Ej:
              https://ejemplo.com/novela/${'{'}counter{'}'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stopCondition">Condición de Parada</Label>
            <Input
              id="stopCondition"
              {...register('stopCondition')}
              placeholder="counter < 600"
            />
            {errors.stopCondition && (
              <p className="text-sm text-destructive">
                {errors.stopCondition.message}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Condición JavaScript para detener la iteración. Ej: counter &lt;
              600, counter &lt;= 100, counter &gt; 50
            </p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="titleSelector">Selector CSS para el Título *</Label>
        <Input
          id="titleSelector"
          {...register('titleSelector')}
          placeholder="Ej: h1.title, .chapter-title, #main-title"
        />
        {errors.titleSelector && (
          <p className="text-sm text-destructive">
            {errors.titleSelector.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Selector CSS para encontrar el título del capítulo en la página
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contentSelector">
          Selector CSS para el Contenido *
        </Label>
        <Input
          id="contentSelector"
          {...register('contentSelector')}
          placeholder="Ej: .content, #chapter-text, article p"
        />
        {errors.contentSelector && (
          <p className="text-sm text-destructive">
            {errors.contentSelector.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Selector CSS para encontrar el contenido del capítulo
        </p>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Scrapeando...' : 'Scrapear Capítulo(s)'}
      </Button>
    </form>
  );
}


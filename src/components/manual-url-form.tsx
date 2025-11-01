'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { scrapeManualUrlsAction } from '@/app/actions/manual-scraper-actions';
import { toast } from 'sonner';

const manualUrlFormSchema = z.object({
  urls: z.string().min(1, 'Debes proporcionar al menos una URL'),
});

type ManualUrlFormValues = z.infer<typeof manualUrlFormSchema>;

interface ManualUrlFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novelName: string;
  titleSelector: string;
  contentSelector: string;
  initialUrls?: string[];
  onSuccess?: (message: string) => void;
}

export function ManualUrlForm({
  open,
  onOpenChange,
  novelName,
  titleSelector,
  contentSelector,
  initialUrls = [],
  onSuccess,
}: ManualUrlFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urls, setUrls] = useState<string[]>(initialUrls);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ManualUrlFormValues>({
    resolver: zodResolver(manualUrlFormSchema),
    defaultValues: {
      urls: initialUrls.join('\n'),
    },
  });

  useEffect(() => {
    if (initialUrls.length > 0) {
      setUrls(initialUrls);
      setValue('urls', initialUrls.join('\n'));
    } else {
      // Intentar cargar URLs desde el archivo de errores
      fetch(`/api/get-failed-urls?novelName=${encodeURIComponent(novelName)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.urls && data.urls.length > 0) {
            setUrls(data.urls);
            setValue('urls', data.urls.join('\n'));
          }
        })
        .catch((error) => {
          console.error('Error loading failed URLs:', error);
        });
    }
  }, [initialUrls, setValue, novelName]);

  const onSubmit = async (data: ManualUrlFormValues) => {
    // Prevenir el comportamiento por defecto del formulario
    setIsSubmitting(true);

    try {
      // Parsear URLs (una por línea)
      const urlList = data.urls
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      if (urlList.length === 0) {
        toast.error('Debes proporcionar al menos una URL válida');
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('novelName', novelName);
      formData.append('urls', JSON.stringify(urlList));
      formData.append('titleSelector', titleSelector);
      formData.append('contentSelector', contentSelector);

      const result = await scrapeManualUrlsAction(formData);

      if (result.success) {
        toast.success(result.message);
        // No llamar a onSuccess que podría cerrar el modal
        // Limpiar el formulario para permitir agregar más URLs si es necesario
        setValue('urls', '');
        setUrls([]);
      } else {
        toast.error(result.error || 'Error al scrapear las URLs');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error inesperado';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Permitir abrir
      if (newOpen) {
        onOpenChange(newOpen);
      }
      // NO permitir cerrar desde onOpenChange - solo desde el botón Cancelar
      // Esto evita que el modal se cierre por movimientos del cursor o clicks fuera
    }}>
      <DialogContent 
        className="sm:max-w-2xl"
        onInteractOutside={(e) => {
          // Bloquear completamente el cierre por click fuera
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Permitir cerrar con Escape solo si no está procesando
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          // Bloquear completamente el cierre por click fuera
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Agregar URLs Manualmente</DialogTitle>
          <DialogDescription>
            Ingresa las URLs de los capítulos que fallaron (una por línea)
          </DialogDescription>
        </DialogHeader>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)(e);
          }} 
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="urls">URLs (una por línea) *</Label>
            <textarea
              id="urls"
              {...register('urls')}
              rows={10}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="https://ejemplo.com/capitulo-1&#10;https://ejemplo.com/capitulo-2&#10;https://ejemplo.com/capitulo-3"
            />
            {errors.urls && (
              <p className="text-sm text-destructive">{errors.urls.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Puedes pegar múltiples URLs, una por línea. Las URLs que ya están
              cargadas aparecen arriba.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scrapeando...' : 'Scrapear URLs'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


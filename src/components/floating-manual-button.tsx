'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { ManualUrlForm } from '@/components/manual-url-form';

interface FloatingManualButtonProps {
  novelName: string;
  titleSelector: string;
  contentSelector: string;
  failedUrls?: string[];
}

export function FloatingManualButton({
  novelName,
  titleSelector,
  contentSelector,
  failedUrls = [],
}: FloatingManualButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          onClick={() => setModalOpen(true)}
          aria-label="Agregar URLs manualmente"
        >
          <PlusIcon className="h-6 w-6" />
        </Button>
      </div>
      <ManualUrlForm
        open={modalOpen}
        onOpenChange={setModalOpen}
        novelName={novelName}
        titleSelector={titleSelector}
        contentSelector={contentSelector}
        initialUrls={failedUrls}
      />
    </>
  );
}


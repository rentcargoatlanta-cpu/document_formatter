'use client';

import { useState, useRef, useCallback } from 'react';
import { DocumentForm } from '@/app/components/document-form';
import type { DocumentTemplate } from '@/lib/documents/types';

interface DocumentViewerProps {
  template: DocumentTemplate;
}

export function DocumentViewer({ template }: DocumentViewerProps) {
  const [previewUrl, setPreviewUrl] = useState(
    '/documents/contract-agreement.pdf',
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  const handlePdfGenerated = useCallback((base64: string) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Revoke the previous Blob URL to free memory
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
    }
    prevUrlRef.current = url;

    setPreviewUrl(url);
  }, []);

  const handleGeneratingChange = useCallback((generating: boolean) => {
    setIsGenerating(generating);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-4 border-b border-black/10 bg-background px-6 py-3 dark:border-white/10">
        <h1 className="text-lg font-semibold text-foreground">
          Document Formatter
        </h1>
        <select className="rounded-md border border-black/15 bg-background px-3 py-1.5 text-sm text-foreground dark:border-white/15">
          <option>{template.name}</option>
        </select>

        {isGenerating && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-foreground/50">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40" />
            Updating...
          </span>
        )}
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left panel -- form */}
        <aside className="flex w-full flex-col border-b border-black/10 bg-background dark:border-white/10 md:w-96 md:border-b-0 md:border-r">
          <DocumentForm
            template={template}
            onPdfGenerated={handlePdfGenerated}
            onGeneratingChange={handleGeneratingChange}
          />
        </aside>

        {/* Right panel -- PDF preview */}
        <main className="flex flex-1 flex-col overflow-hidden bg-black/[.02] dark:bg-white/[.02]">
          <iframe
            src={previewUrl}
            title="Document Preview"
            className="h-full w-full border-0"
          />
        </main>
      </div>
    </div>
  );
}

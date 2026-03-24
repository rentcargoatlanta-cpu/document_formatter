'use client';

import { useState, useCallback } from 'react';
import { DocumentForm } from '@/app/components/document-form';
import { PdfPreview } from '@/app/components/pdf-preview';
import type { DocumentTemplate } from '@/lib/documents/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DocumentViewerProps {
  templates: DocumentTemplate[];
}

function staticPdfUrl(templatePath: string): string {
  return '/' + templatePath.replace(/^public\//, '');
}

export function DocumentViewer({ templates }: DocumentViewerProps) {
  const [activeTemplate, setActiveTemplate] = useState(templates[0]);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePdfGenerated = useCallback((base64: string) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    setPdfData(bytes);
  }, []);

  const handleGeneratingChange = useCallback((generating: boolean) => {
    setIsGenerating(generating);
  }, []);

  const handleTemplateChange = useCallback(
    (templateId: string | null) => {
      if (!templateId) return;
      const next = templates.find((t) => t.id === templateId);
      if (!next) return;

      setActiveTemplate(next);
      setPdfData(null);
    },
    [templates],
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-2 md:gap-4 bg-background px-3 md:px-6 py-2.5 md:py-3">
        <h1 className="text-lg md:text-xl font-semibold text-foreground">
          Document Formatter
        </h1>
        <Select value={activeTemplate.id} onValueChange={handleTemplateChange}>
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isGenerating && (
          <Badge variant="secondary" className="ml-auto gap-1.5">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40" />
            Updating...
          </Badge>
        )}
      </header>
      <Separator />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left panel -- form */}
        <aside className="flex w-full flex-col border-b border-border bg-muted/30 md:w-[340px] lg:w-[420px] md:border-b-0">
          <DocumentForm
            key={activeTemplate.id}
            template={activeTemplate}
            onPdfGenerated={handlePdfGenerated}
            onGeneratingChange={handleGeneratingChange}
          />
        </aside>
        <Separator orientation="vertical" className="hidden md:block" />

        {/* Right panel -- PDF preview */}
        <main className="flex flex-1 flex-col overflow-hidden bg-muted/5 min-h-[50vh] md:min-h-0">
          <PdfPreview
            pdfData={pdfData}
            templateUrl={staticPdfUrl(activeTemplate.templatePath)}
          />
        </main>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

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
  const [mobileTab, setMobileTab] = useState('form');

  const prevGenerating = useRef(false);
  useEffect(() => {
    const wasGenerating = prevGenerating.current;
    prevGenerating.current = isGenerating;
    if (wasGenerating && !isGenerating && pdfData) {
      const id = requestAnimationFrame(() => {
        if (window.innerWidth < 768) setMobileTab('preview');
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isGenerating, pdfData]);

  const handlePdfGenerated = useCallback((base64: string) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    setPdfData(bytes);
  }, []);

  const handleGeneratingChange = useCallback((generating: boolean) => {
    setIsGenerating(generating);
  }, []);

  const handleDownload = useCallback(() => {
    if (!pdfData) return;
    const blob = new Blob([pdfData.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTemplate.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pdfData, activeTemplate.id]);

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
        <h1 className="truncate text-lg md:text-xl font-semibold text-foreground">
          Document Formatter
        </h1>
        <Select value={activeTemplate.id} onValueChange={handleTemplateChange}>
          <SelectTrigger className="w-auto max-w-[140px] sm:max-w-none truncate">
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

        <div className="ml-auto flex items-center gap-2">
          {isGenerating && (
            <Badge variant="secondary" className="gap-1.5">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40" />
              <span className="hidden sm:inline">Updating...</span>
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!pdfData || isGenerating}
            onClick={handleDownload}
          >
            Export PDF
          </Button>
        </div>
      </header>
      <Separator />

      {/* Main content */}
      <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as string)} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <TabsContent value="form" keepMounted className="m-0 flex flex-col data-[hidden]:hidden md:data-[hidden]:flex md:w-[340px] lg:w-[420px] overflow-y-auto border-r-0 md:border-r border-border bg-muted/30">
            <DocumentForm
              key={activeTemplate.id}
              template={activeTemplate}
              onPdfGenerated={handlePdfGenerated}
              onGeneratingChange={handleGeneratingChange}
            />
          </TabsContent>
          <TabsContent value="preview" keepMounted className="m-0 flex flex-1 flex-col data-[hidden]:hidden md:data-[hidden]:flex overflow-hidden bg-muted/5 min-h-[50vh] md:min-h-0">
            <PdfPreview
              pdfData={pdfData}
              templateUrl={staticPdfUrl(activeTemplate.templatePath)}
            />
          </TabsContent>
        </div>
        {/* Bottom tab bar -- mobile only */}
        <div className="border-t border-border bg-background px-4 py-2 md:hidden">
          <TabsList className="w-full">
            <TabsTrigger value="form" className="flex-1">Form</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}

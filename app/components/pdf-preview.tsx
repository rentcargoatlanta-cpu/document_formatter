'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfPreviewProps {
  pdfData: Uint8Array | null;
  templateUrl: string;
}

export function PdfPreview({ pdfData, templateUrl }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const renderTasksRef = useRef<Map<number, pdfjs.RenderTask>>(new Map());

  // Load PDF and render pages
  useEffect(() => {
    let cancelled = false;

    async function loadAndRender() {
      const container = containerRef.current;
      if (!container) return;

      // Cancel any in-progress render tasks
      for (const [, task] of renderTasksRef.current) {
        task.cancel();
      }
      renderTasksRef.current.clear();

      // Destroy previous document
      if (pdfDocRef.current) {
        try {
          await pdfDocRef.current.destroy();
        } catch {
          // ignore destroy errors
        }
        pdfDocRef.current = null;
      }

      if (cancelled) return;

      // Determine the source
      const source = pdfData
        ? { data: new Uint8Array(pdfData) }
        : { url: templateUrl };

      try {
        const doc = await pdfjs.getDocument(source).promise;
        if (cancelled) {
          await doc.destroy();
          return;
        }

        pdfDocRef.current = doc;
        const totalPages = doc.numPages;
        setNumPages(totalPages);

        // Get existing canvases
        const existingCanvases = container.querySelectorAll('canvas');

        // Remove excess canvases if page count decreased
        for (let i = totalPages; i < existingCanvases.length; i++) {
          existingCanvases[i].remove();
        }

        // Render each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          if (cancelled) return;

          try {
            const page = await doc.getPage(pageNum);
            if (cancelled) return;

            // Calculate scale to fit container width, then reduce for breathing room
            const containerWidth = container.clientWidth - 32;
            const unscaledViewport = page.getViewport({ scale: 1 });
            const scale = (containerWidth / unscaledViewport.width) * 0.6;
            const viewport = page.getViewport({ scale });

            // Reuse existing canvas or create new one
            const canvasIndex = pageNum - 1;
            let canvas: HTMLCanvasElement;

            if (canvasIndex < existingCanvases.length) {
              canvas = existingCanvases[canvasIndex];
            } else {
              canvas = document.createElement('canvas');
              canvas.className = '';
              canvas.style.display = 'block';
              canvas.style.margin = '0 auto';
              container.appendChild(canvas);
            }

            // Set canvas dimensions
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;

            const canvasContext = canvas.getContext('2d');
            if (!canvasContext) continue;

            // Cancel any previous render task for this page
            const prevTask = renderTasksRef.current.get(pageNum);
            if (prevTask) {
              prevTask.cancel();
            }

            const renderTask = page.render({ canvasContext, viewport });
            renderTasksRef.current.set(pageNum, renderTask);

            try {
              await renderTask.promise;
            } catch (err: unknown) {
              // RenderingCancelledException is expected when re-rendering
              if (
                err instanceof Error &&
                err.name === 'RenderingCancelledException'
              ) {
                // Expected when cancelled, ignore
              } else if (!cancelled) {
                console.error(`Error rendering page ${pageNum}:`, err);
              }
            } finally {
              renderTasksRef.current.delete(pageNum);
            }
          } catch (err) {
            if (!cancelled) {
              console.error(`Error loading page ${pageNum}:`, err);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading PDF document:', err);
        }
      }
    }

    loadAndRender();

    const tasksMap = renderTasksRef.current;
    return () => {
      cancelled = true;
      // Cancel all in-progress render tasks
      for (const [, task] of tasksMap) {
        task.cancel();
      }
      tasksMap.clear();
    };
  }, [pdfData, templateUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(() => {
          // ignore destroy errors on unmount
        });
        pdfDocRef.current = null;
      }
    };
  }, []);

  // Scroll tracking to determine current visible page
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;

    const canvases = container.querySelectorAll('canvas');
    const scrollTop = container.scrollTop;
    const containerMidpoint = scrollTop + container.clientHeight / 2;

    let closestPage = 1;
    let closestDistance = Infinity;

    canvases.forEach((canvas, index) => {
      const canvasMidpoint = canvas.offsetTop + canvas.offsetHeight / 2;
      const distance = Math.abs(containerMidpoint - canvasMidpoint);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = index + 1;
      }
    });

    setCurrentPage(closestPage);
  }, [numPages]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      {numPages > 0 && (
        <div className="flex items-center justify-center border-b border-border bg-muted/30 px-4 py-1.5">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {numPages}
          </span>
        </div>
      )}

      {/* Scrollable PDF container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col items-center gap-4 overflow-y-auto bg-muted/20 p-4"
      />
    </div>
  );
}

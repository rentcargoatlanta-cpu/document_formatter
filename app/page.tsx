import { DocumentViewer } from "@/app/components/document-viewer";
import { allTemplates } from "@/lib/documents/index";

export default function Home() {
  return <DocumentViewer templates={allTemplates} />;
}

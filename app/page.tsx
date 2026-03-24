import { DocumentViewer } from "@/app/components/document-viewer";
import { rentalAgreementTemplate } from "@/lib/documents/rental-agreement";

export default function Home() {
  return <DocumentViewer template={rentalAgreementTemplate} />;
}

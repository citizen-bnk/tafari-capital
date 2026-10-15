import { DocumentViewer } from "@/components/document-viewer";
export const metadata = { title: "Private document viewer" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DocumentViewer id={(await params).id} />;
}

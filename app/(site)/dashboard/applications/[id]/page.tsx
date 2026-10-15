import { Applications } from "@/components/applications";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Applications id={(await params).id} />;
}

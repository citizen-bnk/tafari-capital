import { DealRoom } from "@/components/deal-room";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DealRoom id={(await params).id} />;
}

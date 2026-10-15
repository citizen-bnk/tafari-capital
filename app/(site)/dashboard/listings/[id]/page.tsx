import { OwnerAsset } from "@/components/owner-asset";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OwnerAsset id={(await params).id} />;
}

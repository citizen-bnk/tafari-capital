import { AssetDetail } from "@/components/asset-detail";
export const metadata = { title: "Asset opportunity" };
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <AssetDetail id={(await params).id} />;
}

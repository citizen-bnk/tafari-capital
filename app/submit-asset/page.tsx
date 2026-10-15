import { AssetIntake } from "@/components/asset-intake";
export const metadata = {
  title: { absolute: "Submit your mining asset" },
  description:
    "A simple, private way to submit your mine or asset for a managed sale or partnership.",
};
export default function SubmitAssetPage() {
  return (
    <main id="main" className="asset-funnel">
      <AssetIntake />
    </main>
  );
}

import { AssetIntake } from "@/components/asset-intake";
export const metadata = {
  title: "Submit your asset",
  description:
    "Tell Tafari about your mine or asset through a simple, private, guided conversation.",
};
export default function SubmitAssetPage() {
  return (
    <div className="wrap section">
      <AssetIntake />
    </div>
  );
}

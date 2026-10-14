import { mkdir, writeFile } from "node:fs/promises";
import { demoAccounts } from "../lib/demo/accounts";
const palettes = [
  ["#163a55", "#e8f1f8", "#40a2c9"],
  ["#12635c", "#e5f4ec", "#78ba87"],
  ["#724535", "#f7eadf", "#d59a51"],
  ["#523965", "#f0e8f7", "#af86bc"],
  ["#354c35", "#ecf2df", "#9bac54"],
  ["#8a3647", "#f9e7eb", "#dc8e9c"],
  ["#343a75", "#e8eafe", "#8792d5"],
  ["#6e5524", "#faf0d7", "#c5a84c"],
];
const symbols = [
  '<path d="M18 42 32 18 47 42 39 42 32 29 25 42Z"/>',
  '<path d="m32 17 16 14-16 14-16-14Zm0 8-8 7 8 6 8-6Z" fill-rule="evenodd"/>',
  '<path d="M18 19h8v23h-8Zm11 8h8v15h-8Zm11-10h8v25h-8Z"/>',
  '<circle cx="32" cy="31" r="13" fill="none" stroke="currentColor" stroke-width="5"/><path d="m32 17 5 14-5 14-5-14Z"/>',
  '<path d="m18 35 9-17 7 13 8-9 8 18H16Z"/>',
  '<path d="M18 23h28v6H18Zm0 11h28v6H18Z"/><path d="m36 16 13 10-13 10v-7H18v-6h18Z"/>',
  '<path d="M17 39V23l15-8 15 8v16l-15 8Zm6-3 9 5 9-5V26l-9-5-9 5Z" fill-rule="evenodd"/>',
  '<path d="M17 36q7-16 15-16t15 16q-7-8-15-8t-15 8Zm0 9q7-16 15-16t15 16q-7-8-15-8t-15 8Z"/>',
];
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
await mkdir("public/demo-logos", { recursive: true });
for (const [index, account] of demoAccounts.entries()) {
  const [ink, paper, accent] = palettes[index % palettes.length];
  const symbol = symbols[Math.floor(index / palettes.length) % symbols.length];
  const monogram = account.company
    .split(/\s+/)
    .filter((w) => !["and", "&"].includes(w))
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="title"><title id="title">${escape(account.company)} - fictional demo logo</title><rect width="64" height="64" rx="14" fill="${paper}"/><circle cx="54" cy="10" r="17" fill="${accent}" opacity=".25"/><g fill="${ink}" color="${ink}">${symbol}</g><path d="M18 50h28" stroke="${accent}" stroke-width="2"/><text x="32" y="59" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="700" letter-spacing="1" fill="${ink}">${escape(monogram)}</text></svg>\n`;
  await writeFile(`public/demo-logos/${account.id}.svg`, svg);
}
console.log(`Generated ${demoAccounts.length} fictional company logos.`);

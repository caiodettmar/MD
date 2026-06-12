import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stitch } from "@google/stitch-sdk";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadApiKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  const mcpPath = join(process.env.USERPROFILE ?? "", ".cursor", "mcp.json");
  const config = JSON.parse(readFileSync(mcpPath, "utf8"));
  const key = config?.mcpServers?.stitch?.headers?.["X-Goog-Api-Key"];
  if (!key) throw new Error("STITCH_API_KEY not configured");
  return key;
}

async function main() {
  process.env.STITCH_API_KEY = loadApiKey();
  const meta = JSON.parse(readFileSync(join(root, ".stitch/metadata.json"), "utf8"));
  const project = stitch.project(meta.projectId);
  const screens = await project.screens();
  console.log(`Project: ${meta.projectId} (${screens.length} screen(s))`);
  console.log(`Open: https://stitch.withgoogle.com/projects/${meta.projectId}`);

  for (const screen of screens) {
    const id = screen.screenId ?? screen.id;
    console.log(`\nScreen: ${id}`);
    try {
      console.log(`HTML: ${await screen.getHtml()}`);
      console.log(`Image: ${await screen.getImage()}`);
    } catch (err) {
      console.log(`Could not fetch assets: ${err instanceof Error ? err.message : err}`);
    }
  }

  const latest = screens.at(-1);
  if (latest) {
    meta.lastScreenId = latest.screenId ?? latest.id;
    meta.stitchUrl = `https://stitch.withgoogle.com/projects/${meta.projectId}`;
    writeFileSync(join(root, ".stitch/metadata.json"), JSON.stringify(meta, null, 2));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stitch } from "@google/stitch-sdk";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const metaPath = join(root, ".stitch/metadata.json");

function loadApiKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  const mcpPath = join(process.env.USERPROFILE ?? "", ".cursor", "mcp.json");
  const config = JSON.parse(readFileSync(mcpPath, "utf8"));
  const key = config?.mcpServers?.stitch?.headers?.["X-Goog-Api-Key"];
  if (!key) throw new Error("STITCH_API_KEY not configured");
  return key;
}

function readPrompt() {
  const raw = readFileSync(join(root, "next-prompt.md"), "utf8");
  return raw.replace(/^---[\s\S]*?---\s*/, "").trim();
}

async function main() {
  process.env.STITCH_API_KEY = loadApiKey();
  const prompt = readPrompt();

  let projectId;
  if (existsSync(metaPath)) {
    projectId = JSON.parse(readFileSync(metaPath, "utf8")).projectId;
    console.log(`Using existing project: ${projectId}`);
  } else {
    const created = await stitch.callTool("create_project", { title: "MD" });
    projectId =
      created?.projectId ??
      created?.name?.split("/").pop() ??
      created?.id?.split("/").pop();
    console.log(`Created project: ${projectId}`);
  }

  console.log("Generating screen (DESKTOP)...");
  const result = await stitch.callTool("generate_screen_from_text", {
    projectId,
    prompt,
    deviceType: "DESKTOP",
  });

  console.log("Tool response keys:", Object.keys(result ?? {}));
  console.log(JSON.stringify(result, null, 2));

  const project = stitch.project(String(projectId));
  const screens = await project.screens();
  console.log(`Screens after generate: ${screens.length}`);

  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        projectId: String(projectId),
        projectTitle: "MD",
        lastGenerateResponse: result,
        screenCount: screens.length,
        stitchUrl: `https://stitch.withgoogle.com/projects/${projectId}`,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

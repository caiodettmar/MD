import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stitch } from "@google/stitch-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadApiKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  try {
    const mcpPath = join(process.env.USERPROFILE ?? "", ".cursor", "mcp.json");
    const raw = readFileSync(mcpPath, "utf8");
    const config = JSON.parse(raw);
    const key = config?.mcpServers?.stitch?.headers?.["X-Goog-Api-Key"];
    if (key) return key;
  } catch {
    // ignore
  }
  throw new Error("STITCH_API_KEY not found in environment or ~/.cursor/mcp.json");
}

function readPrompt() {
  const path = join(root, "next-prompt.md");
  const raw = readFileSync(path, "utf8");
  const body = raw.replace(/^---[\s\S]*?---\s*/, "").trim();
  if (!body) throw new Error("next-prompt.md is empty");
  return body;
}

async function main() {
  process.env.STITCH_API_KEY = loadApiKey();
  const prompt = readPrompt();

  console.log("Creating Stitch project: MD");
  const created = await stitch.callTool("create_project", { title: "MD" });
  const projectId =
    created?.projectId ??
    created?.name?.split("/").pop() ??
    created?.id?.split("/").pop();

  if (!projectId) {
    console.error("Unexpected create_project response:", JSON.stringify(created, null, 2));
    process.exit(1);
  }

  console.log(`Project ID: ${projectId}`);
  console.log("Generating design system screen (DESKTOP)...");

  await stitch.callTool("generate_screen_from_text", {
    projectId,
    prompt,
    deviceType: "DESKTOP",
  });

  const metaDir = join(root, ".stitch");
  mkdirSync(metaDir, { recursive: true });

  const project = stitch.project(String(projectId));
  const screens = await project.screens();
  const latest = screens.at(-1);

  if (latest) {
    const resolvedId = latest.screenId ?? latest.id;
    writeFileSync(
      join(metaDir, "metadata.json"),
      JSON.stringify(
        {
          projectId: String(projectId),
          projectTitle: "MD",
          lastScreenId: resolvedId ?? null,
          createdAt: new Date().toISOString(),
          promptFile: "next-prompt.md",
          stitchUrl: `https://stitch.withgoogle.com/projects/${projectId}`,
        },
        null,
        2,
      ),
    );

    try {
      const html = await latest.getHtml();
      const image = await latest.getImage();
      console.log("Generation complete.");
      console.log(`Screen ID: ${resolvedId}`);
      console.log(`Stitch project: https://stitch.withgoogle.com/projects/${projectId}`);
      if (html) console.log(`HTML: ${html}`);
      if (image) console.log(`Screenshot: ${image}`);
    } catch {
      console.log("Generation complete.");
      console.log(`Screen ID: ${resolvedId}`);
      console.log(`Stitch project: https://stitch.withgoogle.com/projects/${projectId}`);
    }
  } else {
    writeFileSync(
      join(metaDir, "metadata.json"),
      JSON.stringify(
        {
          projectId: String(projectId),
          projectTitle: "MD",
          lastScreenId: null,
          createdAt: new Date().toISOString(),
          promptFile: "next-prompt.md",
          stitchUrl: `https://stitch.withgoogle.com/projects/${projectId}`,
        },
        null,
        2,
      ),
    );
    console.log("Generation complete.");
    console.log(`Stitch project: https://stitch.withgoogle.com/projects/${projectId}`);
    console.log("No screens listed yet — open the project URL to view progress.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

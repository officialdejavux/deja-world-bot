import { build } from "esbuild";
import { rm, readdir } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const outdir = path.resolve("dist");

async function findSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return findSourceFiles(fullPath);
      }
      return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
    })
  );

  return files.flat();
}

const entryPoints = await findSourceFiles(sourceRoot);

await rm(outdir, { recursive: true, force: true });

await build({
  entryPoints,
  outbase: sourceRoot,
  outdir,
  bundle: false,
  format: "esm",
  platform: "node",
  target: "node24",
  logLevel: "info"
});

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "public/assets";
for (const name of readdirSync(dir)) {
  if (!name.endsWith(".b64")) continue;
  const out = join(dir, name.slice(0, -4));
  writeFileSync(out, Buffer.from(readFileSync(join(dir, name), "utf8").trim(), "base64"));
}

import { render } from "ink";
import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import { stderr } from "node:process";
import { createElement } from "react";
import { App } from "./app";

try {
  mkdirSync(join(process.cwd(), ".magus", "logs"), { recursive: true });
  const logs = createWriteStream(join(process.cwd(), ".magus", "logs", `${new Date().toISOString()}.log`));
  stderr.write = logs.write.bind(logs);
  await render(createElement(App)).waitUntilExit();
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}

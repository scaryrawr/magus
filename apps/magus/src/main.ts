import { render } from "ink";
import { createElement } from "react";
import { App } from "./app";

try {
  await render(createElement(App)).waitUntilExit();
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}

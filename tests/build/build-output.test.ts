import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("static export emits both locales under out/", () => {
  expect(existsSync("out/en/index.html")).toBe(true);
  expect(existsSync("out/kn/index.html")).toBe(true);
  expect(readFileSync("out/en/index.html", "utf8")).toContain("/bhoomi/_next/");
  expect(readFileSync("out/kn/index.html", "utf8")).toContain("ಹಳೆ ದಾಖಲೆ");
});

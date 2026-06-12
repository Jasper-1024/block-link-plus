import { readFileSync } from "fs";
import path from "path";

const cssPath = path.resolve(__dirname, "../../../css/Editor/InlineEdit/InlineEditEngine.css");

describe("InlineEditEngine layout CSS", () => {
	test("does not force extra bottom padding inside the embedded editor content", () => {
		const css = readFileSync(cssPath, "utf8");
		const match = css.match(/\.blp-inline-edit-root\s+\.cm-content\s*\{([^}]+)\}/);

		expect(match).not.toBeNull();

		const declarations = match?.[1] ?? "";
		const paddingBottom = declarations.match(/padding-bottom\s*:\s*([^;!]+)(?:!\s*important)?\s*;/)?.[1]?.trim();

		expect(paddingBottom === undefined || paddingBottom === "0" || paddingBottom === "0px").toBe(true);
		expect(declarations).not.toMatch(/padding-bottom\s*:\s*18px\b/);
	});
});

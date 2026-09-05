import { WhatsNewModal } from "../../../ui/WhatsNewModal";
import { readFileSync } from "fs";
import { resolve } from "path";

test("current release has specific notes instead of the old 2.0 fallback", () => {
	const version = JSON.parse(readFileSync(resolve(__dirname, "../../../../manifest.json"), "utf8")).version;
	const items = (WhatsNewModal.prototype as any).getWhatsNewItems.call({ currentVersion: version });
	expect(items.join(" ")).toMatch(/Find|搜索|搜尋/);
	expect(items.join(" ")).not.toContain("Outliner is now the main workflow");
});

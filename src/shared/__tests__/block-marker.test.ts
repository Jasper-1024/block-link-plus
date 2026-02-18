import { BLP_BLOCK_MARKER, BLP_BLOCK_MARKER_RULE } from "shared/block-marker";

describe("shared/block-marker", () => {
	test("BLP_BLOCK_MARKER_RULE matches ids containing '-'", () => {
		const re = new RegExp(BLP_BLOCK_MARKER_RULE, "g");
		const input = `## ${BLP_BLOCK_MARKER}pre-abc123`;
		const match = re.exec(input);
		expect(match?.[0]).toBe(` ${BLP_BLOCK_MARKER}pre-abc123`);
	});

	test("BLP_BLOCK_MARKER_RULE does not match when marker token is not at line end", () => {
		const re = new RegExp(BLP_BLOCK_MARKER_RULE, "g");
		const input = `## ${BLP_BLOCK_MARKER}abc123 trailing`;
		const match = re.exec(input);
		expect(match).toBeNull();
	});
});

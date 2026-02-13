import {
	getTaskMarkerFromBlockText,
	ensureTaskMarkerPrefix,
	ensureTaskMarkerPrefixInBlockText,
	ensureTodoTaskMarkerPrefix,
	ensureTodoTaskMarkerPrefixInBlockText,
	parseTaskMarkerPrefix,
	stripTaskMarkerPrefix,
	toggleTaskMarkerPrefix,
	toggleTaskStatusMarkerPrefix,
} from "../task-marker";

describe("file-outliner-view/task-marker", () => {
	test("parses task marker prefix", () => {
		expect(parseTaskMarkerPrefix("[ ] hello")).toEqual({ marker: "todo", rest: "hello" });
		expect(parseTaskMarkerPrefix("[x] hello")).toEqual({ marker: "done", rest: "hello" });
		expect(parseTaskMarkerPrefix("[X] hello")).toEqual({ marker: "done", rest: "hello" });
		expect(parseTaskMarkerPrefix("hello")).toBeNull();
	});

	test("strips task marker prefix", () => {
		expect(stripTaskMarkerPrefix("[ ] hello")).toBe("hello");
		expect(stripTaskMarkerPrefix("[x] hello")).toBe("hello");
		expect(stripTaskMarkerPrefix("hello")).toBe("hello");
	});

	test("toggles task status marker prefix (cycle + create)", () => {
		expect(toggleTaskStatusMarkerPrefix("hello")).toBe("[ ] hello");
		expect(toggleTaskStatusMarkerPrefix("[ ] hello")).toBe("[x] hello");
		expect(toggleTaskStatusMarkerPrefix("[x] hello")).toBe("[ ] hello");
		expect(toggleTaskStatusMarkerPrefix("[X] hello")).toBe("[ ] hello");
	});

	test("toggles task marker prefix (task <-> normal)", () => {
		expect(toggleTaskMarkerPrefix("hello")).toBe("[ ] hello");
		expect(toggleTaskMarkerPrefix("[ ] hello")).toBe("hello");
		expect(toggleTaskMarkerPrefix("[x] hello")).toBe("hello");
		expect(toggleTaskMarkerPrefix("[X] hello")).toBe("hello");
	});

	test("ensures todo task marker prefix (non-toggle)", () => {
		expect(ensureTodoTaskMarkerPrefix("hello")).toBe("[ ] hello");
		expect(ensureTodoTaskMarkerPrefix("[ ] hello")).toBe("[ ] hello");
		expect(ensureTodoTaskMarkerPrefix("[x] hello")).toBe("[ ] hello");
		expect(ensureTodoTaskMarkerPrefix("[X] hello")).toBe("[ ] hello");
	});

	test("ensures task marker prefix (idempotent add)", () => {
		expect(ensureTaskMarkerPrefix("hello")).toBe("[ ] hello");
		expect(ensureTaskMarkerPrefix("[ ] hello")).toBe("[ ] hello");
		expect(ensureTaskMarkerPrefix("[x] hello")).toBe("[x] hello");
		expect(ensureTaskMarkerPrefix("[X] hello")).toBe("[X] hello");
	});

	test("ensures task marker prefix for block text (first line only)", () => {
		expect(ensureTaskMarkerPrefixInBlockText("hello\nworld")).toBe("[ ] hello\nworld");
		expect(ensureTaskMarkerPrefixInBlockText("[x] hello\nworld")).toBe("[x] hello\nworld");
	});

	test("ensures todo task marker prefix for block text (first line only)", () => {
		expect(ensureTodoTaskMarkerPrefixInBlockText("hello\nworld")).toBe("[ ] hello\nworld");
		expect(ensureTodoTaskMarkerPrefixInBlockText("[x] hello\nworld")).toBe("[ ] hello\nworld");
	});

	test("extracts marker and renderText from block text", () => {
		expect(getTaskMarkerFromBlockText("hello")).toBeNull();

		const todo = getTaskMarkerFromBlockText("[ ] hello\nworld");
		expect(todo).toEqual({ marker: "todo", checked: false, renderText: "hello\nworld" });

		const done = getTaskMarkerFromBlockText("[x] hello\nworld");
		expect(done).toEqual({ marker: "done", checked: true, renderText: "hello\nworld" });
	});
});

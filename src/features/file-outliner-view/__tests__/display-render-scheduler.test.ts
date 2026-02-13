import { DisplayRenderScheduler } from "../display-render-scheduler";

describe("DisplayRenderScheduler", () => {
	it("does not schedule offscreen blocks", () => {
		const s = new DisplayRenderScheduler();
		s.markNeedsRender("a");
		expect(s.takeNextBatch(10)).toEqual([]);
	});

	it("schedules a block when it becomes visible", () => {
		const s = new DisplayRenderScheduler();
		s.markNeedsRender("a");
		s.setVisible("a", true);
		expect(s.takeNextBatch(10)).toEqual(["a"]);
	});

	it("avoids duplicate queue entries", () => {
		const s = new DisplayRenderScheduler();
		s.markNeedsRender("a");
		s.setVisible("a", true);
		s.markNeedsRender("a");
		s.setVisible("a", true);
		expect(s.takeNextBatch(10)).toEqual(["a"]);
	});

	it("reschedules after a block becomes dirty again", () => {
		const s = new DisplayRenderScheduler();
		s.markNeedsRender("a");
		s.setVisible("a", true);
		expect(s.takeNextBatch(10)).toEqual(["a"]);
		s.markRendered("a");
		expect(s.takeNextBatch(10)).toEqual([]);

		s.markNeedsRender("a");
		expect(s.takeNextBatch(10)).toEqual(["a"]);
	});

	it("skips removed blocks even if queued", () => {
		const s = new DisplayRenderScheduler();
		s.markNeedsRender("a");
		s.setVisible("a", true);
		s.remove("a");
		expect(s.takeNextBatch(10)).toEqual([]);
	});
});


export class DisplayRenderScheduler {
	private visibleIds = new Set<string>();
	private needsRenderIds = new Set<string>();

	private queuedIds = new Set<string>();
	private queue: string[] = [];

	public reset(): void {
		this.visibleIds.clear();
		this.needsRenderIds.clear();
		this.queuedIds.clear();
		this.queue = [];
	}

	public remove(id: string): void {
		this.visibleIds.delete(id);
		this.needsRenderIds.delete(id);
		this.queuedIds.delete(id);
		// Leave `queue` as-is; dequeue skips stale ids.
	}

	public setVisible(id: string, visible: boolean): void {
		if (visible) this.visibleIds.add(id);
		else this.visibleIds.delete(id);
		this.maybeEnqueue(id);
	}

	public markNeedsRender(id: string): void {
		this.needsRenderIds.add(id);
		this.maybeEnqueue(id);
	}

	public markRendered(id: string): void {
		this.needsRenderIds.delete(id);
	}

	public hasPendingWork(): boolean {
		return this.queue.length > 0;
	}

	public takeNextBatch(budget: number): string[] {
		const out: string[] = [];
		const max = Math.max(0, Math.floor(budget));

		while (out.length < max && this.queue.length > 0) {
			const id = this.queue.shift();
			if (!id) continue;
			this.queuedIds.delete(id);

			// Skip stale entries; re-enqueue happens via the next state change.
			if (!this.visibleIds.has(id)) continue;
			if (!this.needsRenderIds.has(id)) continue;

			out.push(id);
		}

		return out;
	}

	private maybeEnqueue(id: string): void {
		if (!this.visibleIds.has(id)) return;
		if (!this.needsRenderIds.has(id)) return;
		if (this.queuedIds.has(id)) return;

		this.queuedIds.add(id);
		this.queue.push(id);
	}
}


export class FocusTracker<T = any> {
	private focused: T | null = null;

	getFocused(): T | null {
		const focused: any = this.focused as any;
		if (focused?.containerEl && !focused.containerEl.isConnected) {
			this.focused = null;
			return null;
		}
		return this.focused;
	}

	setFocused(embed: T | null): void {
		this.focused = embed;
	}

	cleanup(): void {
		this.focused = null;
	}
}

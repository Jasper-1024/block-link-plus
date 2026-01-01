import type { ManagedEmbedLeaf } from "./EmbedLeafManager";

export class FocusTracker {
	private focused: ManagedEmbedLeaf | null = null;

	getFocused(): ManagedEmbedLeaf | null {
		if (this.focused && !this.focused.containerEl.isConnected) {
			this.focused = null;
		}
		return this.focused;
	}

	setFocused(embed: ManagedEmbedLeaf | null): void {
		this.focused = embed;
	}

	cleanup(): void {
		this.focused = null;
	}
}

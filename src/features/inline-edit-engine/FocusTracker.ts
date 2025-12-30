import type { ManagedEmbedLeaf } from "./EmbedLeafManager";

export class FocusTracker {
	private focused: ManagedEmbedLeaf | null = null;

	getFocused(): ManagedEmbedLeaf | null {
		return this.focused;
	}

	setFocused(embed: ManagedEmbedLeaf | null): void {
		this.focused = embed;
	}

	cleanup(): void {
		this.focused = null;
	}
}


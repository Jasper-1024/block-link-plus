export { InlineEditEngine } from "./InlineEditEngine";
export { EmbedLeafManager } from "./EmbedLeafManager";
export { FocusTracker } from "./FocusTracker";
export type { ManagedEmbedLeaf } from "./EmbedLeafManager";
export {
	collectInlineEditSearchMatches,
	locateManagedEmbedSourceRanges,
	type InlineEditManagedEmbedSourceAnchor,
	type InlineEditSearchMatch,
	type InlineEditSearchInput,
	type InlineEditSearchParticipant,
	type InlineEditSearchQuery,
	type InlineEditSearchLineRange,
} from "./InlineEditSearchCoordinator";
export {
	InlineEditSearchBridge,
	type InlineEditNativeSearchCursor,
	type InlineEditSearchBridgeOptions,
	type InlineEditSearchEditor,
	type InlineEditSearchRuntimeParticipant,
} from "./InlineEditSearchAdapter";


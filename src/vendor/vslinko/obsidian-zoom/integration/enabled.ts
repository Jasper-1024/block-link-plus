// @ts-nocheck
let builtInZoomEnabled = true;

export function setBuiltInZoomEnabled(enabled: boolean) {
	builtInZoomEnabled = enabled;
}

export function isBuiltInZoomEnabled(): boolean {
	return builtInZoomEnabled;
}


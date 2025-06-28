import { getAPI, DataviewApi } from "obsidian-dataview";

/**
 * Dataview plugin detection status
 */
export interface DataviewStatus {
    /** Whether the Dataview plugin is installed */
    installed: boolean;
    /** Whether the Dataview plugin is enabled */
    enabled: boolean;
    /** Version string if available */
    version: string | null;
    /** Whether the Dataview API is functioning properly */
    functioning: boolean;
    /** API instance if available */
    api: DataviewApi | null;
}

/**
 * Detects the current status of the Dataview plugin
 * This is a synchronous method that provides real-time status without caching
 * 
 * @returns DataviewStatus object with complete plugin information
 */
export function detectDataviewStatus(): DataviewStatus {
    try {
        // Attempt to get the Dataview API
        const api = getAPI();
        
        if (!api) {
            return {
                installed: false,
                enabled: false,
                version: null,
                functioning: false,
                api: null
            };
        }

        // API is available, check version and functionality
        const version = api.version?.current || null;
        
        // Test basic functionality by checking if essential properties exist
        const functioning = !!(
            api.pages && 
            api.page && 
            typeof api.pages === 'function'
        );

        return {
            installed: true,
            enabled: true,
            version,
            functioning,
            api
        };
        
    } catch (error) {
        console.warn("Block Link Plus: Error detecting Dataview status:", error);
        return {
            installed: false,
            enabled: false,
            version: null,
            functioning: false,
            api: null
        };
    }
}

/**
 * Simple helper to check if Dataview is available and functioning
 * @returns true if Dataview is ready to use
 */
export function isDataviewAvailable(): boolean {
    const status = detectDataviewStatus();
    return status.installed && status.enabled && status.functioning;
}

/**
 * Get Dataview API if available
 * @returns DataviewApi instance or null
 */
export function getDataviewApi(): DataviewApi | null {
    const status = detectDataviewStatus();
    return status.api;
} 
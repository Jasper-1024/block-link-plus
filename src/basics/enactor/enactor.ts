export interface Enactor {
    name: string;
    load(): void;
    loadExtensions(firstLoad: boolean): void;
    uriByString(uri: string, source?: string): any;
    openPath(path: string, source?: HTMLElement, isReadOnly?: boolean): void;
}


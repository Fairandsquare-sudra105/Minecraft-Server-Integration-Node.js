export interface JavaInfo {
    path: string;
    version: string;
    type: 'system' | 'portable';
}
export declare class JavaChecker {
    private static logger;
    private static readonly JAVA_DIR;
    private static readonly JAVA_URLS;
    static getRequiredJavaVersion(serverVersion: string): '17' | '21';
    static checkJava(): Promise<boolean>;
    static getSystemJavaPath(): string | null;
    static getSystemJavaVersion(): string | null;
    private static downloadWithNode;
    static getOrDownloadPortableJava(version: '17' | '21'): Promise<JavaInfo>;
    static ensureJava(serverVersion: string, usePortable?: boolean): Promise<JavaInfo>;
    static cleanupOldJava(): void;
}
//# sourceMappingURL=JavaChecker.d.ts.map
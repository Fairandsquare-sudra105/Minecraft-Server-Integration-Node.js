export type OSType = 'linux' | 'darwin' | 'windows' | 'android' | 'unknown';
export type DistroType = 'ubuntu' | 'debian' | 'centos' | 'fedora' | 'arch' | 'termux' | 'unknown';
export declare class SystemDetector {
    static getOS(): OSType;
    static getDistro(): DistroType;
    static hasJava(): boolean;
    static getJavaVersion(): string | null;
    static getArch(): string;
    static getTotalMemory(): number;
    static getCPUCores(): number;
    static getSystemInfo(): any;
    static getJavaInstallCommand(): string;
}
//# sourceMappingURL=SystemDetector.d.ts.map
import { DownloadInfo } from '../types';
export declare class Downloader {
    private static logger;
    static downloadFile(info: DownloadInfo, destDir: string): Promise<string>;
    static getPaperInfo(version: string, build?: string): Promise<DownloadInfo>;
    static getGeyserInfo(): Promise<DownloadInfo>;
    static getFloodgateInfo(): Promise<DownloadInfo>;
    static getPurpurURL(version: string): DownloadInfo;
    static getVanillaURL(version: string): DownloadInfo;
    static getSpigotURL(version: string): DownloadInfo;
    static getForgeURL(version: string): DownloadInfo;
    static getFabricURL(version: string): DownloadInfo;
    private static getVanillaHash;
    private static calculateSHA1;
}
//# sourceMappingURL=Downloader.d.ts.map
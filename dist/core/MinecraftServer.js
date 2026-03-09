"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinecraftServer = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const cron = __importStar(require("node-cron"));
const ConfigHandler_1 = require("./ConfigHandler");
const JavaChecker_1 = require("./JavaChecker");
const FileUtils_1 = require("../utils/FileUtils");
const Logger_1 = require("../utils/Logger");
const SystemDetector_1 = require("../utils/SystemDetector");
const PaperEngine_1 = require("../engines/PaperEngine");
const VanillaEngine_1 = require("../engines/VanillaEngine");
const ForgeEngine_1 = require("../engines/ForgeEngine");
const FabricEngine_1 = require("../engines/FabricEngine");
const GeyserBridge_1 = require("../platforms/GeyserBridge");
const ViaVersion_1 = require("../platforms/ViaVersion");
const SkinRestorer_1 = require("../platforms/SkinRestorer");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
class MinecraftServer extends events_1.EventEmitter {
    config;
    options;
    logger;
    engine;
    geyser;
    viaVersion;
    skinRestorer;
    process = null;
    serverInfo;
    players = new Map();
    backupCron = null;
    startTime = null;
    memoryMonitorInterval = null;
    statsInterval = null;
    memoryUsageHistory = [];
    worldSize = 0;
    playerCount = 0;
    javaCommand = 'java';
    javaInfo = null;
    owners = new Set();
    ownerCommandPrefix = '!';
    lastCpuTotal = 0;
    lastCpuTime = 0;
    cpuUsage = 0;
    cgroupMemory = 0;
    cgroupCpu = 0;
    constructor(userConfig = {}) {
        super();
        this.logger = Logger_1.Logger.getInstance();
        this.logger.banner();
        this.options = {
            javaVersion: 'auto',
            usePortableJava: true,
            memoryMonitor: {
                enabled: true,
                threshold: 90,
                interval: 30000,
                action: 'warn'
            },
            autoInstallJava: true,
            networkOptimization: {
                tcpFastOpen: true,
                bungeeMode: false,
                proxyProtocol: false
            },
            owners: [],
            ownerCommands: {
                prefix: '!',
                enabled: true
            },
            silentMode: true,
            statsInterval: 30000,
            ...userConfig
        };
        if (this.options.owners) {
            this.options.owners.forEach(owner => this.owners.add(owner.toLowerCase()));
        }
        if (this.options.ownerCommands?.prefix) {
            this.ownerCommandPrefix = this.options.ownerCommands.prefix;
        }
        const handler = new ConfigHandler_1.ConfigHandler(userConfig);
        this.config = handler.getConfig();
        this.engine = this.createEngine();
        this.geyser = new GeyserBridge_1.GeyserBridge();
        this.viaVersion = new ViaVersion_1.ViaVersionManager();
        this.skinRestorer = new SkinRestorer_1.SkinRestorerManager();
        this.serverInfo = {
            pid: 0,
            ip: this.config.network.ip,
            port: this.config.network.port,
            bedrockPort: this.config.platform === 'all' ? this.config.network.bedrockPort : undefined,
            version: this.config.version,
            type: this.config.type,
            platform: this.config.platform,
            players: 0,
            maxPlayers: this.config.world.maxPlayers,
            uptime: 0,
            memory: { used: 0, max: 0 },
            cpu: 0,
            status: 'stopped'
        };
        this.detectCgroupLimits();
    }
    detectCgroupLimits() {
        try {
            if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
                const limit = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8');
                this.cgroupMemory = parseInt(limit) / 1024 / 1024;
                this.logger.debug(`Cgroup memory limit: ${this.cgroupMemory} MB`);
            }
            if (fs.existsSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us') && fs.existsSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us')) {
                const quota = parseInt(fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8'));
                const period = parseInt(fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8'));
                if (quota > 0 && period > 0) {
                    this.cgroupCpu = quota / period;
                    this.logger.debug(`Cgroup CPU limit: ${this.cgroupCpu} cores`);
                }
            }
        }
        catch (error) {
            this.logger.debug('Not running in cgroup environment');
        }
    }
    createEngine() {
        switch (this.config.type) {
            case 'paper':
            case 'purpur':
            case 'spigot':
                return new PaperEngine_1.PaperEngine();
            case 'vanilla':
                return new VanillaEngine_1.VanillaEngine();
            case 'forge':
                return new ForgeEngine_1.ForgeEngine();
            case 'fabric':
                return new FabricEngine_1.FabricEngine();
            default:
                throw new Error(`Unsupported server type: ${this.config.type}`);
        }
    }
    buildJavaArgs() {
        if (this.options.customJavaArgs && this.options.customJavaArgs.length > 0) {
            return this.options.customJavaArgs;
        }
        const memMax = this.parseMemory(this.config.memory.max);
        const javaVersion = this.options.javaVersion || 'auto';
        let gcArgs = [];
        if (memMax >= 16384) {
            gcArgs = [
                '-XX:+UseG1GC',
                '-XX:+ParallelRefProcEnabled',
                '-XX:MaxGCPauseMillis=100',
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:+DisableExplicitGC',
                '-XX:+AlwaysPreTouch',
                '-XX:G1NewSizePercent=40',
                '-XX:G1MaxNewSizePercent=50',
                '-XX:G1HeapRegionSize=16M',
                '-XX:G1ReservePercent=15',
                '-XX:G1HeapWastePercent=5',
                '-XX:G1MixedGCCountTarget=4',
                '-XX:InitiatingHeapOccupancyPercent=20',
                '-XX:G1MixedGCLiveThresholdPercent=90',
                '-XX:G1RSetUpdatingPauseTimePercent=5',
                '-XX:SurvivorRatio=32',
                '-XX:+PerfDisableSharedMem',
                '-XX:MaxTenuringThreshold=1'
            ];
        }
        else if (memMax >= 8192) {
            gcArgs = [
                '-XX:+UseG1GC',
                '-XX:+ParallelRefProcEnabled',
                '-XX:MaxGCPauseMillis=150',
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:+DisableExplicitGC',
                '-XX:+AlwaysPreTouch',
                '-XX:G1NewSizePercent=30',
                '-XX:G1MaxNewSizePercent=40',
                '-XX:G1HeapRegionSize=8M',
                '-XX:G1ReservePercent=10',
                '-XX:G1HeapWastePercent=5',
                '-XX:G1MixedGCCountTarget=4',
                '-XX:InitiatingHeapOccupancyPercent=15',
                '-XX:G1MixedGCLiveThresholdPercent=90',
                '-XX:G1RSetUpdatingPauseTimePercent=5',
                '-XX:SurvivorRatio=32',
                '-XX:+PerfDisableSharedMem',
                '-XX:MaxTenuringThreshold=1'
            ];
        }
        else {
            gcArgs = this.config.memory.useAikarsFlags ? [
                '-XX:+UseG1GC',
                '-XX:+ParallelRefProcEnabled',
                '-XX:MaxGCPauseMillis=200',
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:+DisableExplicitGC',
                '-XX:+AlwaysPreTouch',
                '-XX:G1HeapWastePercent=5',
                '-XX:G1MixedGCCountTarget=4',
                '-XX:InitiatingHeapOccupancyPercent=15',
                '-XX:G1MixedGCLiveThresholdPercent=90',
                '-XX:G1RSetUpdatingPauseTimePercent=5',
                '-XX:SurvivorRatio=32',
                '-XX:+PerfDisableSharedMem',
                '-XX:MaxTenuringThreshold=1',
                '-Dusing.aikars.flags=https://mcflags.emc.gs',
                '-Daikars.new.flags=true'
            ] : [];
        }
        if (javaVersion === '21') {
            gcArgs.push('--enable-preview');
        }
        const baseArgs = [
            `-Xms${this.config.memory.init}`,
            `-Xmx${this.config.memory.max}`
        ];
        return [...baseArgs, ...gcArgs];
    }
    buildEnvironment() {
        const env = { ...process.env };
        env.MALLOC_ARENA_MAX = '2';
        env._JAVA_OPTIONS = `-Xmx${this.config.memory.max}`;
        if (this.javaInfo && this.javaInfo.type === 'portable') {
            env.JAVA_HOME = path.dirname(path.dirname(this.javaInfo.path));
            env.PATH = `${path.dirname(this.javaInfo.path)}:${env.PATH}`;
        }
        if (this.cgroupMemory > 0) {
            const memLimit = Math.min(this.parseMemory(this.config.memory.max), this.cgroupMemory);
            env._JAVA_OPTIONS += ` -XX:MaxRAM=${memLimit}M`;
        }
        if (this.cgroupCpu > 0) {
            env._JAVA_OPTIONS += ` -XX:ActiveProcessorCount=${Math.floor(this.cgroupCpu)}`;
        }
        return env;
    }
    processOwnerCommand(player, command) {
        if (!this.options.ownerCommands?.enabled)
            return;
        if (!this.owners.has(player.toLowerCase()))
            return;
        const cmd = command.toLowerCase().trim();
        const args = cmd.split(' ');
        switch (args[0]) {
            case 'gamemode':
            case 'gm':
                this.handleGamemodeCommand(player, args);
                break;
            case 'tp':
            case 'teleport':
                this.handleTeleportCommand(player, args);
                break;
            case 'give':
                this.handleGiveCommand(player, args);
                break;
            case 'time':
                this.handleTimeCommand(player, args);
                break;
            case 'weather':
                this.handleWeatherCommand(player, args);
                break;
            case 'kill':
                this.handleKillCommand(player, args);
                break;
            case 'ban':
                this.handleBanCommand(player, args);
                break;
            case 'kick':
                this.handleKickCommand(player, args);
                break;
            case 'op':
                this.handleOpCommand(player, args);
                break;
            case 'deop':
                this.handleDeopCommand(player, args);
                break;
            case 'reload':
                this.sendCommand('reload');
                this.logger.info(`${player} reloaded the server`);
                break;
            case 'save':
                this.sendCommand('save-all');
                this.logger.info(`${player} saved the world`);
                break;
            case 'list':
                this.sendCommand('list');
                break;
            case 'help':
                this.sendOwnerHelp(player);
                break;
            default:
                this.sendCommand(command);
        }
    }
    handleGamemodeCommand(player, args) {
        if (args.length < 2) {
            this.sendCommand(`tellraw ${player} {"text":"Usage: ${this.ownerCommandPrefix}gamemode <survival|creative|adventure|spectator> [player]","color":"red"}`);
            return;
        }
        const gamemode = args[1];
        const target = args.length > 2 ? args[2] : player;
        let gamemodeNum = 0;
        switch (gamemode) {
            case 'survival':
            case '0':
                gamemodeNum = 0;
                break;
            case 'creative':
            case '1':
                gamemodeNum = 1;
                break;
            case 'adventure':
            case '2':
                gamemodeNum = 2;
                break;
            case 'spectator':
            case '3':
                gamemodeNum = 3;
                break;
            default:
                this.sendCommand(`tellraw ${player} {"text":"Invalid gamemode. Use: survival, creative, adventure, spectator","color":"red"}`);
                return;
        }
        this.sendCommand(`gamemode ${gamemodeNum} ${target}`);
        this.logger.info(`${player} set gamemode of ${target} to ${gamemode}`);
    }
    handleTeleportCommand(player, args) {
        if (args.length < 2) {
            this.sendCommand(`tellraw ${player} {"text":"Usage: ${this.ownerCommandPrefix}tp <player> [x y z]","color":"red"}`);
            return;
        }
        const target = args[1];
        if (args.length >= 4) {
            const x = args[2];
            const y = args[3];
            const z = args[4] || '0';
            this.sendCommand(`tp ${target} ${x} ${y} ${z}`);
        }
        else {
            this.sendCommand(`tp ${player} ${target}`);
        }
        this.logger.info(`${player} teleported to ${target}`);
    }
    handleGiveCommand(player, args) {
        if (args.length < 3) {
            this.sendCommand(`tellraw ${player} {"text":"Usage: ${this.ownerCommandPrefix}give <player> <item> [amount]","color":"red"}`);
            return;
        }
        const target = args[1];
        const item = args[2];
        const amount = args.length > 3 ? args[3] : '1';
        this.sendCommand(`give ${target} ${item} ${amount}`);
        this.logger.info(`${player} gave ${amount} x ${item} to ${target}`);
    }
    handleTimeCommand(player, args) {
        if (args.length < 2) {
            this.sendCommand(`tellraw ${player} {"text":"Usage: ${this.ownerCommandPrefix}time <set|add|query> <value>","color":"red"}`);
            return;
        }
        const subCmd = args[1];
        const value = args.length > 2 ? args[2] : '';
        if (subCmd === 'set') {
            if (value === 'day') {
                this.sendCommand('time set day');
            }
            else if (value === 'night') {
                this.sendCommand('time set night');
            }
            else {
                this.sendCommand(`time set ${value}`);
            }
        }
        else if (subCmd === 'add') {
            this.sendCommand(`time add ${value}`);
        }
        else if (subCmd === 'query') {
            this.sendCommand('time query daytime');
        }
        this.logger.info(`${player} changed time: ${subCmd} ${value}`);
    }
    handleWeatherCommand(player, args) {
        if (args.length < 2) {
            this.sendCommand(`tellraw ${player} {"text":"Usage: ${this.ownerCommandPrefix}weather <clear|rain|thunder> [duration]","color":"red"}`);
            return;
        }
        const weather = args[1];
        const duration = args.length > 2 ? args[2] : '';
        if (weather === 'clear') {
            this.sendCommand('weather clear');
        }
        else if (weather === 'rain') {
            this.sendCommand('weather rain');
        }
        else if (weather === 'thunder') {
            this.sendCommand('weather thunder');
        }
        if (duration) {
            this.sendCommand(`weather ${weather} ${duration}`);
        }
        this.logger.info(`${player} changed weather to ${weather}`);
    }
    handleKillCommand(player, args) {
        const target = args.length > 1 ? args[1] : player;
        this.sendCommand(`kill ${target}`);
        this.logger.info(`${player} killed ${target}`);
    }
    handleBanCommand(player, args) {
        if (args.length < 2) {
            this.sendCommand(`tellraw ${player} {"text":"Usage: ${this.ownerCommandPrefix}ban <player> [reason]","color":"red"}`);
            return;
        }
        const target = args[1];
        const reason = args.slice(2).join(' ') || 'Banned by owner';
        this.sendCommand(`ban ${target} ${reason}`);
        this.logger.info(`${player} banned ${target}: ${reason}`);
    }
    handleKickCommand(player, args) {
        if (args.length < 2) {
            this.sendCommand(`tellraw ${player} {"text":"Usage: ${this.ownerCommandPrefix}kick <player> [reason]","color":"red"}`);
            return;
        }
        const target = args[1];
        const reason = args.slice(2).join(' ') || 'Kicked by owner';
        this.sendCommand(`kick ${target} ${reason}`);
        this.logger.info(`${player} kicked ${target}: ${reason}`);
    }
    handleOpCommand(player, args) {
        if (args.length < 2) {
            this.sendCommand(`tellraw ${player} {"text":"Usage: ${this.ownerCommandPrefix}op <player>","color":"red"}`);
            return;
        }
        const target = args[1];
        this.sendCommand(`op ${target}`);
        this.logger.info(`${player} opped ${target}`);
    }
    handleDeopCommand(player, args) {
        if (args.length < 2) {
            this.sendCommand(`tellraw ${player} {"text":"Usage: ${this.ownerCommandPrefix}deop <player>","color":"red"}`);
            return;
        }
        const target = args[1];
        this.sendCommand(`deop ${target}`);
        this.logger.info(`${player} deopped ${target}`);
    }
    sendOwnerHelp(player) {
        const commands = [
            `{"text":"\\n=== Owner Commands ===\\n","color":"gold","bold":true}`,
            `{"text":"${this.ownerCommandPrefix}gamemode <mode> [player] - Change gamemode\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}tp <player> [x y z] - Teleport\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}give <player> <item> [amount] - Give items\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}time <set|add> <value> - Change time\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}weather <clear|rain|thunder> - Change weather\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}kill [player] - Kill player\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}ban <player> [reason] - Ban player\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}kick <player> [reason] - Kick player\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}op <player> - Give operator\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}deop <player> - Remove operator\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}reload - Reload server\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}save - Save world\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}list - List players\\n","color":"yellow"}`,
            `{"text":"${this.ownerCommandPrefix}help - Show this help\\n","color":"yellow"}`
        ];
        commands.forEach(cmd => {
            this.sendCommand(`tellraw ${player} ${cmd}`);
        });
    }
    async updateStats() {
        if (!this.process || this.serverInfo.status !== 'running')
            return;
        try {
            const memMax = this.parseMemory(this.config.memory.max);
            if (fs.existsSync('/sys/fs/cgroup/memory/memory.usage_in_bytes')) {
                const usage = parseInt(fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8'));
                this.serverInfo.memory.used = Math.round(usage / 1024 / 1024);
            }
            else {
                const stats = await Promise.resolve().then(() => __importStar(require('pidusage')));
                const usage = await stats.default(this.process.pid);
                this.serverInfo.memory.used = Math.round(usage.memory / 1024 / 1024);
            }
            this.serverInfo.memory.max = memMax;
            if (fs.existsSync('/sys/fs/cgroup/cpuacct/cpuacct.usage')) {
                const cpuTotal = parseInt(fs.readFileSync('/sys/fs/cgroup/cpuacct/cpuacct.usage', 'utf8'));
                const now = Date.now();
                if (this.lastCpuTotal > 0) {
                    const cpuDiff = cpuTotal - this.lastCpuTotal;
                    const timeDiff = now - this.lastCpuTime;
                    this.cpuUsage = (cpuDiff / timeDiff / 1e6) * 100;
                    if (this.cgroupCpu > 0) {
                        this.cpuUsage = this.cpuUsage / this.cgroupCpu;
                    }
                    this.serverInfo.cpu = Math.min(100, Math.max(0, Math.round(this.cpuUsage)));
                }
                this.lastCpuTotal = cpuTotal;
                this.lastCpuTime = now;
            }
            this.serverInfo.uptime = Math.floor((Date.now() - (this.startTime?.getTime() || 0)) / 1000);
            this.serverInfo.players = this.players.size;
            this.emit('resource', this.serverInfo);
        }
        catch (error) {
            this.logger.error('Stats update error:', error);
        }
    }
    async start() {
        this.logger.info(`Starting ${this.config.type} server v${this.config.version}...`);
        if (this.owners.size > 0) {
            this.logger.info(`Owners configured: ${Array.from(this.owners).join(', ')}`);
        }
        this.javaInfo = await JavaChecker_1.JavaChecker.ensureJava(this.config.version, this.options.usePortableJava || false);
        this.javaCommand = this.javaInfo.path;
        this.logger.success(`Using Java ${this.javaInfo.version} (${this.javaInfo.type}) at ${this.javaInfo.path}`);
        const systemInfo = SystemDetector_1.SystemDetector.getSystemInfo();
        this.logger.debug('System info:', systemInfo);
        const serverDir = process.cwd();
        await FileUtils_1.FileUtils.ensureServerStructure(this.config);
        this.worldSize = await this.calculateWorldSize();
        if (this.worldSize > 10 * 1024 * 1024 * 1024) {
            this.logger.warning(`Large world detected (${(this.worldSize / 1024 / 1024 / 1024).toFixed(2)} GB). Consider increasing memory allocation.`);
        }
        const jarPath = await this.engine.download(this.config, serverDir);
        if (this.config.type === 'forge') {
            await this.engine.prepare(this.config, serverDir, jarPath);
        }
        else {
            await this.engine.prepare(this.config, serverDir);
        }
        if (this.config.platform === 'all') {
            await FileUtils_1.FileUtils.ensureDir(this.config.folders.plugins);
            await this.geyser.setup(this.config);
        }
        if (this.options.enableViaVersion !== false) {
            this.logger.info('Enabling ViaVersion for client version compatibility...');
            await FileUtils_1.FileUtils.ensureDir(this.config.folders.plugins);
            await this.viaVersion.setup(this.config);
            await this.viaVersion.configureViaVersion(this.config);
            if (this.options.enableViaBackwards !== false) {
                this.logger.info('ViaBackwards will be installed');
            }
            if (this.options.enableViaRewind !== false) {
                this.logger.info('ViaRewind will be installed');
            }
        }
        if (this.options.enableSkinRestorer !== false) {
            this.logger.info('Enabling SkinRestorer for player skins...');
            await FileUtils_1.FileUtils.ensureDir(this.config.folders.plugins);
            await this.skinRestorer.setup(this.config);
        }
        const javaArgs = this.buildJavaArgs();
        const serverJar = this.engine.getServerJar(jarPath);
        const serverArgs = this.engine.getServerArgs();
        const fullArgs = [
            ...javaArgs,
            '-jar',
            serverJar,
            ...serverArgs
        ];
        if (this.options.networkOptimization?.tcpFastOpen) {
            fullArgs.unshift('-Djava.net.preferIPv4Stack=true');
        }
        if (this.options.networkOptimization?.bungeeMode) {
            fullArgs.unshift('-Dnet.kyori.adventure.text.serializer.legacy.AMPMSupport=true');
        }
        const env = this.buildEnvironment();
        this.logger.info(`Launching: ${this.javaCommand} ${fullArgs.join(' ')}`);
        this.process = (0, child_process_1.spawn)(this.javaCommand, fullArgs, {
            cwd: serverDir,
            env: env,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        this.serverInfo.pid = this.process.pid;
        this.serverInfo.status = 'starting';
        this.startTime = new Date();
        if (this.options.silentMode) {
            this.process.stdout.pipe(process.stdout);
            this.process.stderr.pipe(process.stderr);
        }
        else {
            this.process.stdout.on('data', (data) => {
                const output = data.toString();
                process.stdout.write(output);
                if (output.includes('joined the game')) {
                    const match = output.match(/(\w+) joined the game/);
                    if (match) {
                        this.playerCount++;
                        this.handlePlayerJoin(match[1]);
                        if (this.owners.has(match[1].toLowerCase())) {
                            this.sendCommand(`tellraw ${match[1]} {"text":"Welcome Owner! Use ${this.ownerCommandPrefix}help for commands","color":"gold"}`);
                        }
                    }
                }
                if (output.includes('left the game')) {
                    const match = output.match(/(\w+) left the game/);
                    if (match) {
                        this.playerCount--;
                        this.handlePlayerLeave(match[1]);
                    }
                }
                if (output.includes('<') && output.includes('>')) {
                    const chatMatch = output.match(/<(\w+)>\s+(.+)/);
                    if (chatMatch) {
                        const player = chatMatch[1];
                        const message = chatMatch[2];
                        if (message.startsWith(this.ownerCommandPrefix)) {
                            const command = message.substring(this.ownerCommandPrefix.length);
                            this.processOwnerCommand(player, command);
                        }
                    }
                }
            });
            this.process.stderr.on('data', (data) => {
                process.stderr.write(data.toString());
            });
        }
        this.process.on('exit', (code) => {
            this.serverInfo.status = 'stopped';
            this.logger.warning(`Server stopped with code ${code}`);
            if (this.config.autoRestart && code !== 0) {
                this.logger.info('Auto-restarting...');
                this.start();
            }
            this.emit('stop', { code });
        });
        if (this.options.statsInterval && this.options.statsInterval > 0) {
            this.statsInterval = setInterval(() => this.updateStats(), this.options.statsInterval);
        }
        this.monitorResources();
        if (this.config.backup.enabled) {
            this.setupBackups();
        }
        setTimeout(() => {
            if (this.serverInfo.status === 'starting') {
                this.serverInfo.status = 'running';
                this.logger.success('Server started successfully!');
                if (this.options.enableViaVersion !== false) {
                    this.logger.info('ViaVersion is active - players from older versions can connect');
                }
                if (this.options.enableSkinRestorer !== false) {
                    this.logger.info('SkinRestorer is active - player skins will be restored');
                }
                if (this.worldSize > 0) {
                    this.logger.info(`World size: ${(this.worldSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
                }
                if (this.owners.size > 0) {
                    this.logger.info(`Owner commands enabled with prefix: ${this.ownerCommandPrefix}`);
                }
                this.emit('ready', this.serverInfo);
                this.startMemoryMonitor();
            }
        }, 10000);
        return this.serverInfo;
    }
    startMemoryMonitor() {
        if (!this.options.memoryMonitor?.enabled)
            return;
        const threshold = this.options.memoryMonitor.threshold || 90;
        const interval = this.options.memoryMonitor.interval || 30000;
        const action = this.options.memoryMonitor.action || 'warn';
        this.memoryMonitorInterval = setInterval(async () => {
            if (this.serverInfo.status !== 'running' || !this.process)
                return;
            try {
                await this.updateStats();
                const memPercent = (this.serverInfo.memory.used / this.serverInfo.memory.max) * 100;
                this.memoryUsageHistory.push(memPercent);
                if (this.memoryUsageHistory.length > 10) {
                    this.memoryUsageHistory.shift();
                }
                if (memPercent > threshold) {
                    this.logger.warning(`High memory usage: ${memPercent.toFixed(1)}%`);
                    const isIncreasing = this.memoryUsageHistory.length > 5 &&
                        this.memoryUsageHistory[this.memoryUsageHistory.length - 1] >
                            this.memoryUsageHistory[0] * 1.2;
                    if (isIncreasing) {
                        this.logger.warning('Memory leak detected!');
                        switch (action) {
                            case 'restart':
                                this.logger.info('Restarting server due to memory leak...');
                                await this.gracefulRestart();
                                break;
                            case 'stop':
                                this.logger.info('Stopping server due to memory leak...');
                                await this.stop();
                                break;
                            case 'warn':
                            default:
                                this.logger.warning('Please restart server to free memory');
                        }
                    }
                }
            }
            catch (error) {
                this.logger.error('Memory monitor error:', error);
            }
        }, interval);
    }
    async gracefulRestart() {
        this.logger.info('Initiating graceful restart...');
        this.sendCommand('say Server restarting in 30 seconds');
        this.sendCommand('save-all');
        await new Promise(resolve => setTimeout(resolve, 10000));
        this.sendCommand('say Server restarting in 20 seconds');
        await new Promise(resolve => setTimeout(resolve, 10000));
        this.sendCommand('say Server restarting in 10 seconds');
        this.sendCommand('save-all');
        await new Promise(resolve => setTimeout(resolve, 5000));
        this.sendCommand('say Server restarting in 5 seconds');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await this.stop();
        await this.start();
    }
    async stop() {
        if (!this.process) {
            this.logger.warning('Server not running');
            return;
        }
        this.logger.info('Stopping server...');
        this.serverInfo.status = 'stopping';
        this.sendCommand('save-all');
        this.sendCommand('stop');
        await new Promise(resolve => setTimeout(resolve, 10000));
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        if (this.backupCron) {
            this.backupCron.stop();
        }
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
        }
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        if (this.config.platform === 'all') {
            this.geyser.stop();
        }
        this.logger.success('Server stopped');
    }
    sendCommand(command) {
        if (!this.process || this.serverInfo.status !== 'running') {
            throw new Error('Server not running');
        }
        this.process.stdin.write(command + '\n');
        this.logger.debug(`Command sent: ${command}`);
    }
    async getInfo() {
        await this.updateStats();
        return this.serverInfo;
    }
    getPlayers() {
        return Array.from(this.players.values());
    }
    async backup(type = 'full') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup-${type}-${timestamp}`;
        const backupPath = path.join(this.config.backup.path, backupName);
        this.logger.info(`Creating ${type} backup...`);
        switch (type) {
            case 'full':
                await FileUtils_1.FileUtils.createBackup(process.cwd(), backupPath);
                break;
            case 'world':
                await FileUtils_1.FileUtils.createBackup(this.config.folders.world, backupPath);
                break;
            case 'plugins':
                await FileUtils_1.FileUtils.createBackup(this.config.folders.plugins, backupPath);
                break;
        }
        this.logger.success(`Backup created: ${backupPath}`);
        return backupPath;
    }
    monitorResources() {
        setInterval(async () => {
            if (this.serverInfo.status === 'running' && this.process) {
                try {
                    await this.updateStats();
                }
                catch { }
            }
        }, 30000);
    }
    setupBackups() {
        const cronExpression = this.convertIntervalToCron(this.config.backup.interval);
        if (cronExpression) {
            this.backupCron = cron.schedule(cronExpression, () => {
                this.backup('world');
            });
            this.logger.info(`Backups scheduled: ${this.config.backup.interval}`);
        }
    }
    convertIntervalToCron(interval) {
        const match = interval.match(/(\d+)([hms])/);
        if (!match)
            return null;
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 'h':
                return `0 */${value} * * *`;
            case 'm':
                return `*/${value} * * * *`;
            case 's':
                return `*/${value} * * * * *`;
            default:
                return null;
        }
    }
    handlePlayerJoin(name) {
        const player = {
            name,
            uuid: '',
            ip: '',
            ping: 0,
            connectedAt: new Date()
        };
        this.players.set(name, player);
        this.serverInfo.players = this.players.size;
        this.emit('player-join', player);
    }
    handlePlayerLeave(name) {
        this.players.delete(name);
        this.serverInfo.players = this.players.size;
        this.emit('player-leave', name);
    }
    parseMemory(memStr) {
        const value = parseInt(memStr);
        if (memStr.endsWith('G')) {
            return value * 1024;
        }
        return value;
    }
    async calculateWorldSize() {
        try {
            const worldPath = path.join(process.cwd(), this.config.folders.world);
            if (!await fs.pathExists(worldPath))
                return 0;
            const getSize = async (dir) => {
                let total = 0;
                const files = await fs.readdir(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stat = await fs.stat(filePath);
                    if (stat.isDirectory()) {
                        total += await getSize(filePath);
                    }
                    else {
                        total += stat.size;
                    }
                }
                return total;
            };
            return await getSize(worldPath);
        }
        catch {
            return 0;
        }
    }
}
exports.MinecraftServer = MinecraftServer;
//# sourceMappingURL=MinecraftServer.js.map
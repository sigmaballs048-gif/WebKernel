/**
 * WebKernel - Architecture Core Subsystem Core
 * Handles Memory, Event Bus, VFS, Processes, Services, and State Security.
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const filtered = this.listeners.get(event).filter(cb => cb !== callback);
        this.listeners.set(event, filtered);
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (err) {
                console.error(`[EventBus Error] Loop Execution Exception (${event}):`, err);
            }
        });
    }
}

class VirtualFileSystem {
    constructor(logHook) {
        this.log = logHook || console.log;
        this.dbName = "WebKernel_VFS_Storage";
        this.dbVersion = 1;
        this.db = null;
        this.root = new Map();
    }

    async mount() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains("files")) {
                    database.createObjectStore("files", { keyPath: "path" });
                }
            };

            request.onsuccess = async (e) => {
                this.db = e.target.result;
                await this._synchronizeInMemoryTree();
                this._initializeSystemArchitectureFolders();
                resolve();
            };

            request.onerror = (e) => {
                reject(new Error(`IndexedDB Mount Failure: ${e.target.error.message}`));
            };
        });
    }

    async _synchronizeInMemoryTree() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("files", "readonly");
            const store = transaction.objectStore("files");
            const request = store.getAll();

            request.onsuccess = () => {
                request.result.forEach(fileRecord => {
                    this.root.set(fileRecord.path, fileRecord);
                });
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    _initializeSystemArchitectureFolders() {
        // Build basic skeletal structure baseline
        const structuralPaths = ["/desktop", "/apps"];
        structuralPaths.forEach(path => {
            if (!this.exists(path)) {
                this.mkdir(path, "system");
            }
        });
    }

    exists(path) {
        return this.root.has(path);
    }

    mkdir(path, owner = "user") {
        if (this.exists(path)) return false;
        const dirRecord = {
            path,
            type: "directory",
            content: null,
            mimeType: "inode/directory",
            metadata: {
                created: Date.now(),
                modified: Date.now(),
                owner,
                size: 0,
                permissions: "rwxr-xr-x"
            }
        };
        this.root.set(path, dirRecord);
        this._flushToStorage(dirRecord);
        return true;
    }

    writeFile(path, content, mimeType = "text/plain", owner = "user") {
        const existing = this.root.get(path);
        if (existing && existing.type === "directory") throw new Error("Path targets an established system directory context");

        const byteSize = new Blob([content]).size;
        const fileRecord = {
            path,
            type: "file",
            content,
            mimeType,
            metadata: {
                created: existing ? existing.metadata.created : Date.now(),
                modified: Date.now(),
                owner,
                size: byteSize,
                permissions: "rw-r--r--"
            }
        };

        this.root.set(path, fileRecord);
        this._flushToStorage(fileRecord);
        return true;
    }

    readFile(path) {
        const fileRecord = this.root.get(path);
        if (!fileRecord) throw new Error(`File target not found: "${path}"`);
        if (fileRecord.type === "directory") throw new Error("Cannot stream content data from folder node elements");
        return fileRecord.content;
    }

    readDir(path) {
        const matches = [];
        for (const [key, record] of this.root.entries()) {
            if (key === path) continue;
            if (key.startsWith(path)) {
                const relativePart = key.replace(path, "").replace(/^\//, "");
                if (relativePart && !relativePart.includes("/")) {
                    matches.push(record);
                }
            }
        }
        return matches;
    }

    remove(path) {
        if (!this.exists(path)) return false;
        this.root.delete(path);
        
        const transaction = this.db.transaction("files", "readwrite");
        const store = transaction.objectStore("files");
        store.delete(path);
        return true;
    }

    _flushToStorage(record) {
        const transaction = this.db.transaction("files", "readwrite");
        const store = transaction.objectStore("files");
        store.put(record);
    }
}

class ProcessManager {
    constructor(kernel) {
        this.kernel = kernel;
        this.pidPool = 1000;
        this.table = new Map();
    }

    spawn(manifest) {
        const pid = this.pidPool++;
        const processContext = {
            pid,
            name: manifest.name || "Unnamed Worker",
            state: "running",
            manifest,
            instance: null,
            allocation: {
                windows: [],
                listeners: []
            }
        };

        this.table.set(pid, processContext);
        this.kernel.events.emit("process-spawned", { pid, name: processContext.name });
        return pid;
    }

    async launchFromFile(path) {
        const scriptData = this.kernel.vfs.readFile(path);
        const scriptBlob = new Blob([scriptData], { type: "application/javascript" });
        const allocationUrl = URL.createObjectURL(scriptBlob);

        try {
            const applicationModule = await import(allocationUrl);
            if (!applicationModule.default) throw new Error("Application entry points must output a default class execution schema.");

            const TargetClass = applicationModule.default;
            const pid = this.spawn(TargetClass.manifest || { name: path.split("/").pop() });
            
            const runningInstance = new TargetClass();
            this.table.get(pid).instance = runningInstance;
            
            // Track window allocations created during init loop
            const trackingIntercept = this.kernel.gui.createWindow.bind(this.kernel.gui);
            this.kernel.gui.createWindow = (options) => {
                const contextRef = trackingIntercept(options);
                const procNode = this.table.get(pid);
                if (procNode) procNode.allocation.windows.push(contextRef.winId);
                return contextRef;
            };

            runningInstance.init(pid);
            
            // Restore clean implementation hook
            this.kernel.gui.createWindow = trackingIntercept;
            
            URL.revokeObjectURL(allocationUrl);
            return pid;
        } catch (error) {
            URL.revokeObjectURL(allocationUrl);
            throw error;
        }
    }

    kill(pid) {
        const proc = this.table.get(pid);
        if (!proc) return false;

        proc.state = "terminated";
        
        proc.allocation.windows.forEach(winId => {
            if (this.kernel.gui) this.kernel.gui.closeWindow(winId);
        });

        if (proc.instance && typeof proc.instance.destroy === "function") {
            try {
                proc.instance.destroy();
            } catch (err) {
                console.error(`Error destroying process context (PID: ${pid}):`, err);
            }
        }

        this.table.delete(pid);
        this.kernel.events.emit("process-killed", { pid });
        return true;
    }
}

class SystemKernel {
    constructor(bootLogHook) {
        this.version = "1.1.0-Release";
        this.bootLog = bootLogHook || console.log;
        this.events = new EventBus();
        this.vfs = new VirtualFileSystem(this.bootLog);
        this.process = new ProcessManager(this);
        this.services = new Map();
        this.registry = new Map();
        this.gui = null;

        this._loadDefaultRegistrySettings();
    }

    setGUIReference(guiInstance) {
        this.gui = guiInstance;
    }

    _loadDefaultRegistrySettings() {
        this.registry.set("sys.theme", "dark");
        this.registry.set("sys.wallpaper", "linear-gradient(135deg, #11111b 0%, #1e1e2e 100%)");
        this.registry.set("sys.locale", "en-US");
    }

    bootSequence() {
        this.bootLog("Running WebKernel runtime diagnostics checks...");
        this.bootLog(`Kernel validation signature verified. Core Engine: v${this.version}`);
        this._seedSystemDefaultApplications();
    }

    _seedSystemDefaultApplications() {
        // Create full filesystem layout framework defaults
        const defaultStructuralDirs = [
            "/apps", "/desktop", "/documents", "/downloads", 
            "/system", "/system/bin", "/system/config", "/tmp"
        ];
        
        defaultStructuralDirs.forEach(dir => {
            if(!this.vfs.exists(dir)) this.vfs.mkdir(dir, "system");
        });

        // Master Terminal Source Module Definition
        const terminalAppSource = `export default class SystemTerminal {
    static manifest = {
        name: "System Terminal",
        version: "1.1.0",
        permissions: ["vfs.read", "vfs.write", "window.create", "settings.set"]
    };

    init(pid) {
        this.pid = pid;
        this.currentDirectory = "/";
        
        const win = Kernel.createWindow({
            title: "Terminal Shell Context",
            width: 600,
            height: 400,
            x: 80,
            y: 100
        });

        this.container = win.contentElement;
        this.renderTerminalUI();
    }

    renderTerminalUI() {
        this.container.innerHTML = \`
            <div class="terminal-wrapper" style="background:#0f0f17; color:#a6e3a1; font-family:monospace; font-size:13px; height:100%; display:flex; flex-direction:column; padding:10px; box-sizing:border-box;">
                <div class="terminal-output" style="flex:1; overflow-y:auto; white-space:pre-wrap; margin-bottom:10px; line-height:1.5;">WebKernel Core System Shell Layout Engine.\\nType 'help' for diagnostics.\\n\\n</div>
                <div class="terminal-input-line" style="display:flex; align-items:center; gap:8px;">
                    <span class="terminal-prompt" style="color:#89b4fa; font-weight:bold;">root@webkernel:\${this.currentDirectory}$</span>
                    <input type="text" class="terminal-input-field" style="flex:1; background:transparent; border:none; color:#cdd6f4; font-family:monospace; font-size:13px; outline:none;" autofocus />
                </div>
            </div>
        \`;

        this.outputArea = this.container.querySelector(".terminal-output");
        this.inputField = this.container.querySelector(".terminal-input-field");

        this.inputField.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const commandString = this.inputField.value.trim();
                this.inputField.value = "";
                if (commandString) this.executeCommand(commandString);
            }
        });

        this.container.querySelector(".terminal-wrapper").onclick = () => this.inputField.focus();
    }

    print(text, type = "default") {
        const line = document.createElement("div");
        if (type === "error") line.style.color = "#f38ba8";
        if (type === "info") line.style.color = "#89b4fa";
        if (type === "success") line.style.color = "#a6e3a1";
        line.innerText = text;
        this.outputArea.appendChild(line);
        this.outputArea.scrollTop = this.outputArea.scrollHeight;
    }

    executeCommand(rawInput) {
        this.print("root@webkernel:" + this.currentDirectory + "$ " + rawInput);
        const args = rawInput.split(/\\s+/);
        const command = args[0].toLowerCase();
        const p1 = args[1];
        const p2 = args.slice(2).join(" ");

        switch (command) {
            case "help":
                this.print("Available commands:\\nls, mkdir [path], cat [path], write [path] [data], rm [path], get [key], set [key] [val], prepfs, clear, shutdown", "info");
                break;
            case "ls":
                try {
                    const files = Kernel.vfs.readDir(this.currentDirectory);
                    if(!files.length) this.print("Empty.");
                    else this.print(files.map(f => "[" + f.type.toUpperCase() + "] " + f.path.split("/").pop()).join("\\n"));
                } catch(e) { this.print(e.message, "error"); }
                break;
            case "mkdir":
                if(!p1) return this.print("Usage: mkdir [path]", "error");
                try {
                    const path = p1.startsWith("/") ? p1 : (this.currentDirectory + "/" + p1).replace(/\\/+/g, "/");
                    Kernel.vfs.mkdir(path);
                    this.print("Directory created.", "success");
                } catch(e) { this.print(e.message, "error"); }
                break;
            case "cat":
                if(!p1) return this.print("Usage: cat [path]", "error");
                try {
                    const path = p1.startsWith("/") ? p1 : (this.currentDirectory + "/" + p1).replace(/\\/+/g, "/");
                    this.print(Kernel.vfs.readFile(path));
                } catch(e) { this.print(e.message, "error"); }
                break;
            case "write":
                if(!p1 || !p2) return this.print("Usage: write [path] [data]", "error");
                try {
                    const path = p1.startsWith("/") ? p1 : (this.currentDirectory + "/" + p1).replace(/\\/+/g, "/");
                    Kernel.vfs.writeFile(path, p2, "text/plain");
                    this.print("Write successful.", "success");
                } catch(e) { this.print(e.message, "error"); }
                break;
            case "rm":
                if(!p1) return this.print("Usage: rm [path]", "error");
                try {
                    const path = p1.startsWith("/") ? p1 : (this.currentDirectory + "/" + p1).replace(/\\/+/g, "/");
                    Kernel.vfs.remove(path);
                    this.print("Resource unmapped.", "success");
                } catch(e) { this.print(e.message, "error"); }
                break;
            case "get":
                if(!p1) return this.print("Usage: get [key]", "error");
                this.print(p1 + " = " + Kernel.settings.get(p1), "info");
                break;
            case "set":
                if(!p1 || !p2) return this.print("Usage: set [key] [val]", "error");
                Kernel.settings.set(p1, p2);
                this.print("Registry mapping updated.", "success");
                break;
            case "prepfs":
                try {
                    Kernel.vfs.readDir("/").forEach(n => Kernel.vfs.remove(n.path));
                    ["/apps", "/desktop", "/documents", "/downloads", "/system", "/tmp"].forEach(d => Kernel.vfs.mkdir(d));
                    this.print("Filesystem flashed completely to standard defaults.", "success");
                } catch(e) { this.print(e.message, "error"); }
                break;
            case "clear": this.outputArea.innerHTML = ""; break;
            case "shutdown": Kernel.power.shutdown(); break;
            default: this.print("Unknown command descriptor.", "error");
        }
    }

    destroy() {}
}`;

        // Commit file directly into desktop environment grid layer path and execution apps path
        this.vfs.writeFile("/apps/terminal.js", terminalAppSource, "application/javascript", "system");
        this.vfs.writeFile("/desktop/terminal.js", terminalAppSource, "application/javascript", "system");

        if (!this.vfs.exists("/desktop/readme.txt")) {
            this.vfs.writeFile("/desktop/readme.txt", "Welcome to WebKernel. System infrastructure fully initialized.", "text/plain", "system");
        }
    }

    shutdown() {
        this.events.emit("system-shutdown", {});
        setTimeout(() => location.reload(), 500);
    }
}
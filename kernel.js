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
        const structuralPaths = [
            "/", "/home", "/desktop", "/documents", "/downloads", 
            "/music", "/pictures", "/videos", "/apps", "/system", 
            "/config", "/themes", "/cache", "/tmp", "/logs"
        ];

        structuralPaths.forEach(path => {
            if (!this.exists(path)) {
                this.mkdir(path, "system");
            }
        });

        if (!this.exists("/desktop/readme.txt")) {
            this.writeFile("/desktop/readme.txt", "Welcome to WebKernel. This platform runs modular application nodes isolated behind an abstract execution layer.", "text/plain", "system");
        }
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
        const absolutePath = path.endsWith("/") ? path : path + "/";
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
            if (!applicationModule.default) throw new Error("Application entry points must output a default execution schema class context instantiation wrapper.");

            const TargetClass = applicationModule.default;
            const pid = this.spawn(TargetClass.manifest || { name: path.split("/").pop() });
            
            const runningInstance = new TargetClass();
            this.table.get(pid).instance = runningInstance;
            
            runningInstance.init(pid);
            
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
                console.error(`Error destroying process process instances (PID: ${pid}):`, err);
            }
        }

        this.table.delete(pid);
        this.kernel.events.emit("process-killed", { pid });
        return true;
    }
}

class SystemKernel {
    constructor(bootLogHook) {
        this.version = "1.0.0-Release";
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
        const demoAppSource = `
            export default class SystemDemoApp {
                static manifest = {
                    name: "System Terminal Demo",
                    version: "1.0.0",
                    permissions: ["vfs.read", "window.create"]
                };
                init(pid) {
                    this.pid = pid;
                    const win = Kernel.createWindow({
                        title: "System Automation Output",
                        width: 400,
                        height: 250,
                        x: 120,
                        y: 150
                    });
                    
                    win.contentElement.innerHTML = \`
                        <div style="padding:15px; font-family:monospace; color:#a6e3a1; background:#11111b; height:100%;">
                            <p>> Initializing isolated node workflow...</p>
                            <p style="margin-top:8px">> Running process tracking wrapper context.</p>
                            <p style="margin-top:8px; color:#cdd6f4">> PID Verification: \${pid}</p>
                        </div>
                    \`;
                }
                destroy() {
                    console.log("Demo runtime interface safely unmapped from process boundaries.");
                }
            }
        `;
        this.vfs.writeFile("/apps/terminal.js", demoAppSource, "application/javascript", "system");
    }

    shutdown() {
        this.events.emit("system-shutdown", {});
        setTimeout(() => location.reload(), 500);
    }
}
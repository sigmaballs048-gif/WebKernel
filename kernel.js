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
        const normalizedParent = path === "/" ? "/" : (path.endsWith("/") ? path : path + "/");
        const matches = [];
        for (const [key, record] of this.root.entries()) {
            if (key === path) continue;
            if (key.startsWith(normalizedParent)) {
                const relativePart = key.slice(normalizedParent.length);
                if (relativePart && !relativePart.includes("/")) {
                    matches.push(record);
                }
            }
        }
        return matches;
    }

    remove(path) {
        if (!this.exists(path)) return false;
        
        // Recursive drop execution logic for subdirectories
        for (const key of this.root.keys()) {
            if (key.startsWith(path === "/" ? "//" : path + "/")) {
                this.root.delete(key);
                const transaction = this.db.transaction("files", "readwrite");
                transaction.objectStore("files").delete(key);
            }
        }

        this.root.delete(path);
        const transaction = this.db.transaction("files", "readwrite");
        transaction.objectStore("files").delete(path);
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
            allocation: { windows: [], listeners: [] }
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
            
            const trackingIntercept = this.kernel.gui.createWindow.bind(this.kernel.gui);
            this.kernel.gui.createWindow = (options) => {
                const contextRef = trackingIntercept(options);
                const procNode = this.table.get(pid);
                if (procNode) procNode.allocation.windows.push(contextRef.winId);
                return contextRef;
            };

            runningInstance.init(pid);
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
            try { proc.instance.destroy(); } catch (err) { console.error(err); }
        }

        this.table.delete(pid);
        this.kernel.events.emit("process-killed", { pid });
        return true;
    }
}

class SystemKernel {
    constructor(bootLogHook) {
        this.version = "1.2.0-Release";
        this.bootLog = bootLogHook || console.log;
        this.events = new EventBus();
        this.vfs = new VirtualFileSystem(this.bootLog);
        this.process = new ProcessManager(this);
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
    }

    bootSequence() {
        this.bootLog("Running WebKernel runtime diagnostics checks...");
        this._seedSystemDefaultApplications();
    }

    _seedSystemDefaultApplications() {
        const defaultStructuralDirs = [
            "/apps", "/desktop", "/documents", "/downloads", "/system", "/tmp"
        ];
        defaultStructuralDirs.forEach(dir => {
            if (!this.vfs.exists(dir)) this.vfs.mkdir(dir, "system");
        });

        // 1. Core Terminal Engine
        const terminalSource = `export default class SystemTerminal {
    static manifest = {
        name: "System Terminal",
        version: "1.2.0",
        permissions: ["vfs.read", "vfs.write", "window.create", "settings.set"]
    };

    init(pid) {
        this.pid = pid;
        this.currentDirectory = "/";
        const win = Kernel.createWindow({ title: "Terminal Shell", width: 600, height: 400, x: 50, y: 50 });
        this.container = win.contentElement;
        this.renderTerminalUI();
    }

    renderTerminalUI() {
        this.container.innerHTML = \`
            <div class="terminal-wrapper" style="background:#0f0f17; color:#a6e3a1; font-family:monospace; font-size:13px; height:100%; display:flex; flex-direction:column; padding:10px; box-sizing:border-box;">
                <div class="terminal-output" style="flex:1; overflow-y:auto; white-space:pre-wrap; margin-bottom:10px; line-height:1.5;">WebKernel Interactive Shell Core v1.2.\\n\\n</div>
                <div class="terminal-input-line" style="display:flex; align-items:center; gap:8px;">
                    <span class="terminal-prompt" style="color:#89b4fa; font-weight:bold;">root@webkernel:<span class="dir-display">\${this.currentDirectory}</span>$</span>
                    <input type="text" class="terminal-input-field" style="flex:1; background:transparent; border:none; color:#cdd6f4; font-family:monospace; font-size:13px; outline:none;" autofocus />
                </div>
            </div>
        \`;
        this.outputArea = this.container.querySelector(".terminal-output");
        this.inputField = this.container.querySelector(".terminal-input-field");
        this.dirDisplay = this.container.querySelector(".dir-display");

        this.inputField.onkeydown = (e) => {
            if (e.key === "Enter") {
                const cmd = this.inputField.value.trim();
                this.inputField.value = "";
                if (cmd) this.executeCommand(cmd);
            }
        };
        this.container.onclick = () => this.inputField.focus();
    }

    print(text, type = "default") {
        const line = document.createElement("div");
        if (type === "error") line.style.color = "#f38ba8";
        if (type === "success") line.style.color = "#a6e3a1";
        line.innerText = text;
        this.outputArea.appendChild(line);
        this.outputArea.scrollTop = this.outputArea.scrollHeight;
    }

    resolvePath(target) {
        if (!target) return this.currentDirectory;
        let absolute = target.startsWith("/") ? target : \`\${this.currentDirectory}/\${target}\`;
        const segments = absolute.split("/").filter(Boolean);
        const resolved = [];
        for (const s of segments) {
            if (s === ".") continue;
            if (s === "..") resolved.pop();
            else resolved.push(s);
        }
        return "/" + resolved.join("/");
    }

    executeCommand(rawInput) {
        this.print("root@webkernel:" + this.currentDirectory + "$ " + rawInput);
        const args = rawInput.split(/\\s+/);
        const command = args[0].toLowerCase();
        const p1 = args[1];
        const p2 = args.slice(2).join(" ");

        switch (command) {
            case "help":
                this.print("Commands: cd [dir], ls, mkdir [dir], cat [file], write [file] [data], rm [path], clear, shutdown");
                break;
            case "cd":
                const target = this.resolvePath(p1);
                if (target === "/" || Kernel.vfs.exists(target)) {
                    this.currentDirectory = target;
                    this.dirDisplay.innerText = target;
                } else {
                    this.print("cd: no such file or directory: " + p1, "error");
                }
                break;
            case "ls":
                try {
                    const files = Kernel.vfs.readDir(this.currentDirectory);
                    if(!files.length) this.print("Empty.");
                    else this.print(files.map(f => "[" + f.type.toUpperCase() + "] " + f.path.split("/").pop()).join("\\n"));
                } catch(e) { this.print(e.message, "error"); }
                break;
            case "mkdir":
                try { Kernel.vfs.mkdir(this.resolvePath(p1)); this.print("Directory created.", "success"); } catch(e) { this.print(e.message, "error"); }
                break;
            case "cat":
                try { this.print(Kernel.vfs.readFile(this.resolvePath(p1))); } catch(e) { this.print(e.message, "error"); }
                break;
            case "write":
                try { Kernel.vfs.writeFile(this.resolvePath(p1), p2, "text/plain"); this.print("Write complete.", "success"); } catch(e) { this.print(e.message, "error"); }
                break;
            case "rm":
                try { Kernel.vfs.remove(this.resolvePath(p1)); this.print("Unmapped.", "success"); } catch(e) { this.print(e.message, "error"); }
                break;
            case "clear": this.outputArea.innerHTML = ""; break;
            case "shutdown": Kernel.power.shutdown(); break;
            default: this.print("Unknown command descriptor.", "error");
        }
    }

    destroy() {}
}`;

        // 2. Core GUI File Explorer Engine
        const explorerSource = `export default class FileExplorer {
    static manifest = {
        name: "File Explorer",
        version: "1.1.0",
        permissions: ["vfs.read", "vfs.write", "window.create"]
    };

    init(pid) {
        this.pid = pid;
        this.currentPath = "/";
        this.historyBackward = [];
        this.historyForward = [];
        this.selectedNode = null;

        const win = Kernel.createWindow({ title: "File Explorer", width: 600, height: 400, x: 100, y: 100 });
        this.container = win.contentElement;
        this.renderUI();
        this.updateView();
    }

    renderUI() {
        this.container.innerHTML = \`
            <div style="display:flex; flex-direction:column; height:100%; background:#1e1e2e; color:#cdd6f4; font-family:sans-serif; font-size:13px; user-select:none;">
                <div style="display:flex; align-items:center; gap:6px; padding:8px; background:#11111b; border-bottom:1px solid #313244;">
                    <button class="nav-btn btn-back" style="background:#313244; color:#cdd6f4; border:none; padding:5px 12px; border-radius:4px; cursor:pointer;" disabled>⬅ Back</button>
                    <button class="nav-btn btn-forward" style="background:#313244; color:#cdd6f4; border:none; padding:5px 12px; border-radius:4px; cursor:pointer;" disabled>Forward ➡</button>
                    <input type="text" class="path-input" style="flex:1; background:#1e1e2e; color:#a6e3a1; border:1px solid #45475a; padding:5px 10px; border-radius:4px; font-family:monospace; outline:none;" value="\${this.currentPath}" readonly />
                    <button class="action-btn btn-add" style="background:#a6e3a1; color:#11111b; font-weight:bold; border:none; padding:5px 12px; border-radius:4px; cursor:pointer;">➕ Add</button>
                    <button class="action-btn btn-del" style="background:#f38ba8; color:#11111b; font-weight:bold; border:none; padding:5px 12px; border-radius:4px; cursor:pointer;" disabled>❌ Del</button>
                </div>
                <div class="explorer-grid" style="flex:1; padding:15px; display:grid; grid-template-columns: repeat(auto-fill, 85px); grid-auto-rows: 95px; gap:15px; overflow-y:auto; align-content:start;"></div>
            </div>
        \`;
        this.grid = this.container.querySelector(".explorer-grid");
        this.pathBar = this.container.querySelector(".path-input");
        this.btnBack = this.container.querySelector(".btn-back");
        this.btnForward = this.container.querySelector(".btn-forward");
        this.btnAdd = this.container.querySelector(".btn-add");
        this.btnDel = this.container.querySelector(".btn-del");

        this.btnBack.onclick = () => this.navigateBackward();
        this.btnForward.onclick = () => this.navigateForward();
        this.btnDel.onclick = () => this.deleteSelected();
        this.btnAdd.onclick = () => this.promptCreateNode();
    }

    updateView() {
        this.grid.innerHTML = "";
        this.selectedNode = null;
        this.btnDel.disabled = true;
        this.pathBar.value = this.currentPath;

        this.btnBack.disabled = this.historyBackward.length === 0;
        this.btnForward.disabled = this.historyForward.length === 0;

        if (this.currentPath !== "/") {
            this.renderNodeItem({ path: "..", type: "directory" }, true);
        }

        try {
            const files = Kernel.vfs.readDir(this.currentPath);
            files.forEach(file => this.renderNodeItem(file, false));
        } catch (err) {
            this.grid.innerHTML = \`<div style="color:#f38ba8; padding:10px;">VFS Error: \${err.message}</div>\`;
        }
    }

    renderNodeItem(node, isUpLink) {
        const itemWrapper = document.createElement("div");
        itemWrapper.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px 4px; border-radius:6px; cursor:pointer; text-align:center; gap:6px; transition:background 0.1s;";
        
        const filename = isUpLink ? ".." : node.path.split("/").pop();
        const isDir = node.type === "directory";
        const icon = isDir ? "📁" : (node.path.endsWith(".js") ? "⚙️" : "📄");

        itemWrapper.innerHTML = \`
            <div style="font-size:2rem;">\${icon}</div>
            <div style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap; width:100%; font-size:11px; color:#cdd6f4;">\${filename}</div>
        \`;

        if (!isUpLink) {
            itemWrapper.onclick = (e) => { e.stopPropagation(); this.selectNode(node, itemWrapper); };
        }

        itemWrapper.ondblclick = () => {
            if (isUpLink) {
                const segments = this.currentPath.split("/").filter(Boolean);
                segments.pop();
                this.navigateTo("/" + segments.join("/"));
            } else if (isDir) {
                this.navigateTo(node.path);
            } else {
                if (node.path.endsWith(".js")) {
                    Kernel.process.launchFromFile(node.path).catch(err => alert(err.message));
                } else {
                    Kernel.createWindow({ title: filename, width: 400, height: 250, content: \`<div style="padding:15px; background:#1e1e2e; color:#cdd6f4; height:100%; white-space:pre-wrap;">\${node.content}</div>\` });
                }
            }
        };
        this.grid.appendChild(itemWrapper);
    }

    selectNode(node, element) {
        this.grid.querySelectorAll("div").forEach(el => el.style.background = "transparent");
        this.selectedNode = node;
        element.style.background = "rgba(137, 180, 250, 0.2)";
        this.btnDel.disabled = false;
    }

    navigateTo(targetPath) {
        if (targetPath === this.currentPath) return;
        this.historyBackward.push(this.currentPath);
        this.historyForward = [];
        this.currentPath = targetPath;
        this.updateView();
    }

    navigateBackward() {
        if (!this.historyBackward.length) return;
        this.historyForward.push(this.currentPath);
        this.currentPath = this.historyBackward.pop();
        this.updateView();
    }

    navigateForward() {
        if (!this.historyForward.length) return;
        this.historyBackward.push(this.currentPath);
        this.currentPath = this.historyForward.pop();
        this.updateView();
    }

    deleteSelected() {
        if (!this.selectedNode) return;
        if (confirm("Delete structural entry?")) {
            try { Kernel.vfs.remove(this.selectedNode.path); this.updateView(); } catch (err) { alert(err.message); }
        }
    }

    promptCreateNode() {
        const name = prompt("Enter object label name:");
        if (!name) return;
        const isFolder = confirm("OK for Folder, Cancel for plain File.");
        const fullPath = (this.currentPath === "/" ? "/" + name : this.currentPath + "/" + name).replace(/\\/+/g, "/");
        try {
            if (isFolder) Kernel.vfs.mkdir(fullPath);
            else Kernel.vfs.writeFile(fullPath, prompt("Enter file body data stream:") || "", "text/plain");
            this.updateView();
        } catch (err) { alert(err.message); }
    }

    destroy() {}
}`;

        // Structural dual write validation layout commit mappings
        this.vfs.writeFile("/apps/terminal.js", terminalSource, "application/javascript", "system");
        this.vfs.writeFile("/desktop/terminal.js", terminalSource, "application/javascript", "system");
        this.vfs.writeFile("/apps/explorer.js", explorerSource, "application/javascript", "system");
        this.vfs.writeFile("/desktop/explorer.js", explorerSource, "application/javascript", "system");

        if (!this.vfs.exists("/desktop/readme.txt")) {
            this.vfs.writeFile("/desktop/readme.txt", "Welcome to WebKernel. Check out the custom Terminal & Explorer components.", "text/plain", "system");
        }
    }

    shutdown() {
        this.events.emit("system-shutdown", {});
        setTimeout(() => location.reload(), 500);
    }
}
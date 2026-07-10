/**
 * WebKernel - Architecture Core Subsystem Core
 */

class EventBus {
    constructor() { this.listeners = new Map(); }
    on(event, callback) { if (!this.listeners.has(event)) this.listeners.set(event, []); this.listeners.get(event).push(callback); }
    off(event, callback) { if (!this.listeners.has(event)) return; this.listeners.set(event, this.listeners.get(event).filter(cb => cb !== callback)); }
    emit(event, data) { if (!this.listeners.has(event)) return; this.listeners.get(event).forEach(cb => { try { cb(data); } catch (e) { console.error(e); } }); }
}

class VirtualFileSystem {
    constructor(logHook) { this.dbName = "WebKernel_VFS_Storage"; this.dbVersion = 1; this.db = null; this.root = new Map(); }
    async mount() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains("files")) database.createObjectStore("files", { keyPath: "path" });
            };
            request.onsuccess = async (e) => { this.db = e.target.result; await this._synchronizeInMemoryTree(); resolve(); };
            request.onerror = (e) => reject(new Error(`IndexedDB Mount Failure: ${e.target.error.message}`));
        });
    }
    async _synchronizeInMemoryTree() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("files", "readonly");
            const store = transaction.objectStore("files");
            const request = store.getAll();
            request.onsuccess = () => { request.result.forEach(file => this.root.set(file.path, file)); resolve(); };
            request.onerror = () => reject(request.error);
        });
    }
    exists(path) { return this.root.has(path); }
    mkdir(path, owner = "user") {
        if (this.exists(path)) return false;
        const dirRecord = { path, type: "directory", content: null, mimeType: "inode/directory", metadata: { created: Date.now(), modified: Date.now(), owner, size: 0, permissions: "rwxr-xr-x" } };
        this.root.set(path, dirRecord); this._flushToStorage(dirRecord); return true;
    }
    writeFile(path, content, mimeType = "text/plain", owner = "user") {
        const existing = this.root.get(path);
        if (existing && existing.type === "directory") throw new Error("Path targets a directory context");
        const fileRecord = { path, type: "file", content, mimeType, metadata: { created: existing ? existing.metadata.created : Date.now(), modified: Date.now(), owner, size: new Blob([content]).size, permissions: "rw-r--r--" } };
        this.root.set(path, fileRecord); this._flushToStorage(fileRecord); return true;
    }
    readFile(path) {
        const file = this.root.get(path); if (!file) throw new Error(`File not found: "${path}"`);
        if (file.type === "directory") throw new Error("Cannot read data from folder"); return file.content;
    }
    readDir(path) {
        const normalizedParent = path === "/" ? "/" : (path.endsWith("/") ? path : path + "/");
        const matches = [];
        for (const [key, record] of this.root.entries()) {
            if (key === path) continue;
            if (key.startsWith(normalizedParent)) {
                const relativePart = key.slice(normalizedParent.length);
                if (relativePart && !relativePart.includes("/")) matches.push(record);
            }
        }
        return matches;
    }
    clearAll() {
        this.root.clear();
        const transaction = this.db.transaction("files", "readwrite");
        transaction.objectStore("files").clear();
    }
    remove(path) {
        if (!this.exists(path)) return false;
        for (const key of this.root.keys()) {
            if (key.startsWith(path === "/" ? "//" : path + "/")) {
                this.root.delete(key);
                this.db.transaction("files", "readwrite").objectStore("files").delete(key);
            }
        }
        this.root.delete(path);
        this.db.transaction("files", "readwrite").objectStore("files").delete(path);
        return true;
    }
    _flushToStorage(record) { this.db.transaction("files", "readwrite").objectStore("files").put(record); }
}

class ProcessManager {
    constructor(kernel) { this.kernel = kernel; this.pidPool = 1000; this.table = new Map(); }
    spawn(manifest) {
        const pid = this.pidPool++;
        const processContext = { pid, name: manifest.name || "Unnamed Worker", state: "running", manifest, instance: null, allocation: { windows: [] } };
        this.table.set(pid, processContext); this.kernel.events.emit("process-spawned", { pid, name: processContext.name }); return pid;
    }
    async launchFromFile(path) {
        const scriptData = this.kernel.vfs.readFile(path);
        const scriptBlob = new Blob([scriptData], { type: "application/javascript" });
        const allocationUrl = URL.createObjectURL(scriptBlob);
        try {
            const applicationModule = await import(allocationUrl);
            const TargetClass = applicationModule.default;
            const pid = this.spawn(TargetClass.manifest || { name: path.split("/").pop() });
            const runningInstance = new TargetClass(); this.table.get(pid).instance = runningInstance;
            
            const trackingIntercept = this.kernel.gui.createWindow.bind(this.kernel.gui);
            this.kernel.gui.createWindow = (options) => {
                const contextRef = trackingIntercept(options);
                const procNode = this.table.get(pid); if (procNode) procNode.allocation.windows.push(contextRef.winId);
                return contextRef;
            };
            runningInstance.init(pid); this.kernel.gui.createWindow = trackingIntercept;
            URL.revokeObjectURL(allocationUrl); return pid;
        } catch (error) { URL.revokeObjectURL(allocationUrl); throw error; }
    }
    kill(pid) {
        const proc = this.table.get(pid); if (!proc) return false;
        proc.allocation.windows.forEach(winId => { if (this.kernel.gui) this.kernel.gui.closeWindow(winId); });
        if (proc.instance && typeof proc.instance.destroy === "function") { try { proc.instance.destroy(); } catch (e) {} }
        this.table.delete(pid); this.kernel.events.emit("process-killed", { pid }); return true;
    }
}

class SystemKernel {
    constructor(bootLogHook, bootMode = "standard") {
        this.version = "1.4.0-GRUB"; this.bootLog = bootLogHook || console.log;
        this.bootMode = bootMode;
        this.events = new EventBus(); this.vfs = new VirtualFileSystem(this.bootLog);
        this.process = new ProcessManager(this); this.registry = new Map(); this.gui = null;
        this.registry.set("sys.theme", "dark"); this.registry.set("sys.wallpaper", "linear-gradient(135deg, #11111b 0%, #1e1e2e 100%)");
    }
    setGUIReference(guiInstance) { this.gui = guiInstance; }
    bootSequence() { 
        this.bootLog("Running WebKernel lifecycle validation protocols..."); 
        this._seedSystemDefaultApplications(); 
    }
    
    _seedSystemDefaultApplications() {
        const terminalSource = `export default class SystemTerminal {
    static manifest = { name: "System Terminal", version: "1.2.0" };
    init(pid) {
        this.pid = pid; this.currentDirectory = "/";
        const win = Kernel.createWindow({ title: "Emergency System Terminal", width: 600, height: 400, x: 50, y: 50 });
        this.container = win.contentElement; this.renderTerminalUI();
    }
    renderTerminalUI() {
        this.container.innerHTML = \`
            <div class="terminal-wrapper" style="background:#0f0f17; color:#a6e3a1; font-family:monospace; font-size:13px; height:100%; display:flex; flex-direction:column; padding:10px; box-sizing:border-box;">
                <div class="terminal-output" style="flex:1; overflow-y:auto; white-space:pre-wrap; margin-bottom:10px; line-height:1.5;">WebKernel Core Command Line Shell Module.\\n\\n</div>
                <div class="terminal-input-line" style="display:flex; align-items:center; gap:8px;">
                    <span class="terminal-prompt" style="color:#89b4fa; font-weight:bold;">root@webkernel:<span class="dir-display">\${this.currentDirectory}</span>$</span>
                    <input type="text" class="terminal-input-field" style="flex:1; background:transparent; border:none; color:#cdd6f4; font-family:monospace; font-size:13px; outline:none;" autofocus />
                </div>
            </div>\`;
        this.outputArea = this.container.querySelector(".terminal-output");
        this.inputField = this.container.querySelector(".terminal-input-field");
        this.dirDisplay = this.container.querySelector(".dir-display");
        this.inputField.onkeydown = (e) => { if (e.key === "Enter") { const cmd = this.inputField.value.trim(); this.inputField.value = ""; if (cmd) this.executeCommand(cmd); } };
    }
    print(t, type = "") {
        const d = document.createElement("div"); if (type === "error") d.style.color = "#f38ba8"; if (type === "success") d.style.color = "#a6e3a1";
        d.innerText = t; this.outputArea.appendChild(d); this.outputArea.scrollTop = this.outputArea.scrollHeight;
    }
    resolvePath(t) {
        if (!t) return this.currentDirectory; let abs = t.startsWith("/") ? t : \`\${this.currentDirectory}/\${t}\`;
        const segs = abs.split("/").filter(Boolean); const res = [];
        for (const s of segs) { if (s === ".") continue; if (s === "..") res.pop(); else res.push(s); }
        return "/" + res.join("/");
    }
    executeCommand(raw) {
        this.print("root@webkernel:" + this.currentDirectory + "$ " + raw);
        const args = raw.split(/\\s+/); const cmd = args[0].toLowerCase(); const p1 = args[1]; const p2 = args.slice(2).join(" ");
        switch (cmd) {
            case "cd":
                const target = this.resolvePath(p1);
                if (target === "/" || Kernel.vfs.exists(target)) { this.currentDirectory = target; this.dirDisplay.innerText = target; }
                else this.print("cd: path missing: " + p1, "error"); break;
            case "ls":
                try { const files = Kernel.vfs.readDir(this.currentDirectory); this.print(files.map(f => "[" + f.type.toUpperCase() + "] " + f.path.split("/").pop()).join("\\n")); } catch(e) { this.print(e.message, "error"); } break;
            case "mkdir": try { Kernel.vfs.mkdir(this.resolvePath(p1)); this.print("Created.", "success"); } catch(e) { this.print(e.message, "error"); } break;
            case "write": try { Kernel.vfs.writeFile(this.resolvePath(p1), p2, "text/plain"); this.print("Written.", "success"); } catch(e) { this.print(e.message, "error"); } break;
            case "rm": try { Kernel.vfs.remove(this.resolvePath(p1)); this.print("Unmapped.", "success"); } catch(e) { this.print(e.message, "error"); } break;
            case "clear": this.outputArea.innerHTML = ""; break;
            case "shutdown": Kernel.power.shutdown(); break;
            default: this.print("Unknown command.", "error");
        }
    }
    destroy() {}
}`;

        // Check if Recovery Utility execution profile is explicitly flagged
        if (this.bootMode === "recovery") {
            this.bootLog("Recovery Flag set: Dropping standard virtual filesystems...");
            this.vfs.clearAll(); // Flush memory store tree completely

            // Build structural tree containing ONLY the Terminal and ONE singular recovery file
            this.vfs.mkdir("/apps");
            this.vfs.writeFile("/apps/terminal.js", terminalSource, "application/javascript", "system");
            this.vfs.writeFile("/recovery_manifest.txt", "CRITICAL ERROR DETECTED.\nStandard UI disabled.\nUse 'rm' or 'write' commands to service systems.", "text/plain", "system");
            return; 
        }

        // Standard Multitask OS initialization flow paths
        ["/apps", "/desktop", "/documents", "/downloads", "/system", "/tmp"].forEach(dir => { if (!this.vfs.exists(dir)) this.vfs.mkdir(dir, "system"); });

        const explorerSource = `export default class FileExplorer {
    static manifest = { name: "File Explorer", version: "1.1.0" };
    init(pid) {
        this.pid = pid; this.currentPath = "/"; this.historyBackward = []; this.historyForward = []; this.selectedNode = null;
        const win = Kernel.createWindow({ title: "File Explorer", width: 600, height: 400, x: 100, y: 100 });
        this.container = win.contentElement; this.renderUI(); this.updateView();
    }
    renderUI() {
        this.container.innerHTML = \`
            <div style="display:flex; flex-direction:column; height:100%; background:#1e1e2e; color:#cdd6f4; font-family:sans-serif; font-size:13px; user-select:none;">
                <div style="display:flex; align-items:center; gap:6px; padding:8px; background:#11111b; border-bottom:1px solid #313244;">
                    <button class="btn-back" style="background:#313244; color:#cdd6f4; border:none; padding:5px 12px; border-radius:4px; cursor:pointer;">⬅ Back</button>
                    <button class="btn-forward" style="background:#313244; color:#cdd6f4; border:none; padding:5px 12px; border-radius:4px; cursor:pointer;">Forward ➡</button>
                    <input type="text" class="path-input" style="flex:1; background:#1e1e2e; color:#a6e3a1; border:1px solid #45475a; padding:5px 10px; border-radius:4px; font-family:monospace;" value="\${this.currentPath}" readonly />
                    <button class="btn-add" style="background:#a6e3a1; color:#11111b; font-weight:bold; border:none; padding:5px 12px; border-radius:4px; cursor:pointer;">➕ Add</button>
                    <button class="btn-del" style="background:#f38ba8; color:#11111b; font-weight:bold; border:none; padding:5px 12px; border-radius:4px; cursor:pointer;">❌ Del</button>
                </div>
                <div class="explorer-grid" style="flex:1; padding:15px; display:grid; grid-template-columns: repeat(auto-fill, 85px); grid-auto-rows: 95px; gap:15px; overflow-y:auto; align-content:start;"></div>
            </div>\`;
        this.grid = this.container.querySelector(".explorer-grid");
        this.pathBar = this.container.querySelector(".path-input");
        this.container.querySelector(".btn-back").onclick = () => this.navigateBackward();
        this.container.querySelector(".btn-forward").onclick = () => this.navigateForward();
        this.container.querySelector(".btn-del").onclick = () => this.deleteSelected();
        this.container.querySelector(".btn-add").onclick = () => this.promptCreateNode();
    }
    updateView() {
        this.grid.innerHTML = ""; this.selectedNode = null; this.pathBar.value = this.currentPath;
        if (this.currentPath !== "/") this.renderNodeItem({ path: "..", type: "directory" }, true);
        try { Kernel.vfs.readDir(this.currentPath).forEach(f => this.renderNodeItem(f, false)); } catch (e) {}
    }
    renderNodeItem(node, isUp) {
        const item = document.createElement("div"); item.style.cssText = "display:flex; flex-direction:column; align-items:center; padding:8px; border-radius:6px; cursor:pointer;";
        const name = isUp ? ".." : node.path.split("/").pop();
        item.innerHTML = \`<div style="font-size:2rem;">\${node.type === "directory" ? "📁" : "📄"}</div><div style="color:#cdd6f4; font-size:11px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; width:100%; text-align:center;">\${name}</div>\`;
        if (!isUp) item.onclick = () => { this.selectedNode = node; this.grid.querySelectorAll("div").forEach(d=>d.style.background="transparent"); item.style.background="rgba(137,180,250,0.2)"; };
        item.ondblclick = () => {
            if (isUp) { const s = this.currentPath.split("/").filter(Boolean); s.pop(); this.navigateTo("/" + s.join("/")); }
            else if (node.type === "directory") this.navigateTo(node.path);
            else if (node.path.endsWith(".js")) Kernel.process.launchFromFile(node.path);
        };
        this.grid.appendChild(item);
    }
    navigateTo(p) { this.historyBackward.push(this.currentPath); this.historyForward = []; this.currentPath = p; this.updateView(); }
    navigateBackward() { if (this.historyBackward.length) { this.historyForward.push(this.currentPath); this.currentPath = this.historyBackward.pop(); this.updateView(); } }
    navigateForward() { if (this.historyForward.length) { this.historyBackward.push(this.currentPath); this.currentPath = this.historyForward.pop(); this.updateView(); } }
    deleteSelected() { if (this.selectedNode) { Kernel.vfs.remove(this.selectedNode.path); this.updateView(); } }
    promptCreateNode() {
        const n = prompt("Name:"); if (!n) return;
        const p = (this.currentPath === "/" ? "/" + n : this.currentPath + "/" + n).replace(/\\/+/g, "/");
        if (confirm("Folder?")) Kernel.vfs.mkdir(p); else Kernel.vfs.writeFile(p, "New File Content", "text/plain");
        this.updateView();
    }
    destroy() {}
}`;

        this.vfs.writeFile("/apps/terminal.js", terminalSource, "application/javascript", "system");
        this.vfs.writeFile("/desktop/terminal.js", terminalSource, "application/javascript", "system");
        this.vfs.writeFile("/apps/explorer.js", explorerSource, "application/javascript", "system");
        this.vfs.writeFile("/desktop/explorer.js", explorerSource, "application/javascript", "system");
        this.vfs.writeFile("/desktop/readme.txt", "WebKernel Environment up and running.", "text/plain", "system");
    }
    shutdown() { this.events.emit("system-shutdown", {}); setTimeout(() => location.reload(), 500); }
}
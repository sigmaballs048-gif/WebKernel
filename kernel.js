/**
 * WebKernel - Core Kernel Subsystems
 * Manages VFS, Processes, Events, and Services.
 */

class EventBus {
    constructor() { this.listeners = new Map(); }
    on(event, callback) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(callback);
    }
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => {
                try { cb(data); } catch (e) { console.error(`Event Error [${event}]:`, e); }
            });
        }
    }
}

class VirtualFileSystem {
    constructor() {
        this.dbName = "WebKernel_VFS";
        this.version = 1;
        this.tree = {}; // In-memory representation
    }

    async mount() {
        // Stub for IndexedDB mounting
        // In a full implementation, this reads the DB and constructs this.tree
        this._createDefaultDirectories();
        return Promise.resolve();
    }

    _createDefaultDirectories() {
        const defaultDirs = ['/', '/home', '/desktop', '/documents', '/downloads', '/apps', '/system', '/config'];
        defaultDirs.forEach(dir => this.mkdir(dir, true));
    }

    mkdir(path, isSystem = false) {
        if (this.tree[path]) return false;
        this.tree[path] = {
            type: 'directory',
            metadata: { created: Date.now(), modified: Date.now(), owner: 'system' },
            permissions: isSystem ? 'r-x' : 'rwx'
        };
        return true;
    }

    writeFile(path, content, mimeType = 'text/plain') {
        this.tree[path] = {
            type: 'file',
            content,
            mimeType,
            metadata: { created: Date.now(), modified: Date.now(), size: new Blob([content]).size, owner: 'user' },
            permissions: 'rw-'
        };
        // TODO: Sync to IndexedDB here
        return true;
    }

    readFile(path) {
        if (!this.tree[path] || this.tree[path].type !== 'file') throw new Error(`File not found: ${path}`);
        return this.tree[path].content;
    }

    exists(path) { return !!this.tree[path]; }
}

class ProcessManager {
    constructor(eventBus) {
        this.processes = new Map();
        this.pidCounter = 1000;
        this.events = eventBus;
    }

    spawn(manifest) {
        const pid = this.pidCounter++;
        const process = {
            pid,
            name: manifest.name || 'Unknown',
            state: 'running',
            memory: 0, // Virtual counter
            permissions: manifest.permissions || [],
            terminate: () => this.kill(pid)
        };
        this.processes.set(pid, process);
        this.events.emit('process-spawned', process);
        return pid;
    }

    kill(pid) {
        if (!this.processes.has(pid)) return false;
        const p = this.processes.get(pid);
        p.state = 'terminated';
        this.processes.delete(pid);
        this.events.emit('process-killed', { pid });
        return true;
    }
}

class SystemKernel {
    constructor() {
        this.version = "1.0.0";
        this.events = new EventBus();
        this.vfs = new VirtualFileSystem();
        this.process = new ProcessManager(this.events);
        this.services = new Map();
        this.settings = new Map();
    }

    registerService(name, serviceInstance) {
        if (this.services.has(name)) throw new Error(`Service ${name} already registered.`);
        this.services.set(name, serviceInstance);
        this.events.emit('service-started', { name });
    }
}
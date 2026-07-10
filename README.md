# 🖥️ WebKernel OS: A Pure Client-Side Operating System Environment

## 📌 Project Overview

WebKernel is an educational, highly responsive virtual operating system framework engineered entirely in vanilla HTML5, CSS3, and modern JavaScript (ECMAScript Modules). By abstracting low-level system design concepts—such as process allocation, event-driven architecture, and virtual storage structures—into clean client-side scripts, WebKernel provides a responsive workspace right inside the browser window.

The system implements its own custom structural layers, including a complete Virtual File System (VFS) backed by persistent browser memory, an isolated Process Lifecycle Manager tracking operational states, a flexible Window Manager (WM) controlling viewport layouts, and a modular Desktop Environment (DE) for unified configuration tuning.

---

## 🚀 1. Local Setup & Execution

Because WebKernel is constructed completely out of client-side raw HTML and JavaScript (Vanilla ECMAScript Modules), it requires no backend installation, database configuration, or internet connectivity.

> ⚠️ **Critical Browser Note:** Modern web browsers restrict dynamic JavaScript `import()` calls when opening files directly using the `file://` protocol (double-clicking `index.html`). To run this project locally without setting up a command-line web server, use one of the two standard local development workflows below.

### Workflow A: Visual Studio Code (No Command Line)

1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension by Ritwick Dey.
3. Click the **"Go Live"** button in the bottom-right status bar of VS Code.
4. Your browser will automatically launch `http://127.0.0.1:5500` and display the operating system runtime.

### Workflow B: Enabling Local File Imports (Chrome/Edge flags)

If you must run it natively straight from a local directory link without any local host address, launch your browser via your terminal or shortcut properties with local access flags enabled:

```bash
# Windows (Chrome)
chrome.exe --allow-file-access-from-files

# Mac (Chrome)
open -a "Google Chrome" --args --allow-file-access-from-files

```

---

## 🏗️ 2. Architectural Paradigm

The operating system environment is strictly decoupled into three layers of processing execution:

```
+-------------------------------------------------------------+
|                 DESKTOP ENVIRONMENT (DE)                    |
|       Taskbar | Application Launcher | Desktop Icons        |
+-------------------------------------------------------------+
|                  WINDOW MANAGER (WM)                        |
|   Z-Index Layer Management | Mousedown Drag Tracking       |
+-------------------------------------------------------------+
|                     SYSTEM KERNEL                           |
|  IndexedDB VFS | Process Manager (PIDs) | Global Event Bus  |
+-------------------------------------------------------------+

```

### A. The Structural Kernel Core (`kernel.js`)

* **Virtual File System (VFS):** Backed by IndexedDB transactional blocks mirroring into an internal working memory Map tree. Handles paths using Unix-like absolute routing.
* **Process Manager:** Provisions thread state trackers (`PIDs`) and dynamically compiles executing applications directly from internal VFS file nodes utilizing structural Object URLs.
* **System Event Bus:** Decouples core subsystem interfaces by distributing global asynchronous notifications (`window-opened`, `theme-changed`, `file-created`).

### B. The Window Manager (`gui.js`)

The Window Manager orchestrates floating viewport instances within the visible page matrix:

* **Z-Index Layer Multiplexing:** Implicitly handles pointer intercepts on arbitrary app nodes to increment the visible layout stack layer seamlessly.
* **Vector Drag Binding:** Dynamically translates pointer movement deltas into absolute positioning properties for top-bar component handles.

### C. The Desktop Environment (`gui.js` & `api.js`)

The visible interface ties system assets directly to human interaction vectors:

* **Desktop Grid Engine:** Scans `/desktop` synchronously, building interactive graphical nodes for plain files or javascript executables.
* **Launcher App Dock:** Scans `/apps` to populate the global menu system tray with verified program launchers.

---

## 📂 3. Out-Of-The-Box File Structure Defaults

Upon completing its boot diagnostics check, the Kernel automatically structures and seeds the virtual volume block with the following operational hierarchy:

```
 / (Root Partition)
 ├── 📁 apps/
 │    └── 📄 terminal.js      <-- Populates the application menu tray
 ├── 📁 desktop/
 │    ├── 📄 readme.txt       <-- Renders as a text node on the visual desktop grid
 │    └── 📄 terminal.js      <-- Renders as an executable launcher icon on the desktop grid
 ├── 📁 documents/            <-- Persistent user storage partition
 ├── 📁 downloads/            <-- Workspace landing node for fetched items
 ├── 📁 system/
 │    ├── 📁 bin/             <-- Protected baseline binary paths
 │    └── 📁 config/          <-- Internal kernel property configurations
 └── 📁 tmp/                  <-- High-velocity volatile execution runtime paths

```

---

## 🔒 4. The Global API Reference Matrix

Unprivileged third-party background applications interact with the environment through an immutable, sandboxed global `Kernel` facade proxy. Direct calls to structural parent instances are prohibited:

### 📁 Virtual File System (VFS) Hooks

* **`Kernel.vfs.mkdir(path)`** - Provisions a new structural directory.
* **`Kernel.vfs.writeFile(path, data, mimeType)`** - Persists file data and updates visual desktop/launcher grids.
* **`Kernel.vfs.readFile(path)`** - Returns structural string payloads from a target node.
* **`Kernel.vfs.readDir(path)`** - Returns an array of node description payloads inside a target directory context.
* **`Kernel.vfs.remove(path)`** - Drops target entries directly from permanent database storage blocks.

### ⚙️ Process Lifecycle Management

* **`Kernel.process.launchFromFile(path)`** - Compiles a code module file block out of the VFS straight into an active process worker thread.
* **`Kernel.process.kill(pid)`** - Stops active process tracking references, detaches system listeners, and unmaps any allocated window elements.

### 🎨 System Controls

* **`Kernel.createWindow(options)`** - Spawns a floating managed layout block container.
* **`Kernel.settings.set(key, value)`** - Modifies registry environment nodes (e.g. `sys.wallpaper`).
* **`Kernel.notify(title, message)`** - Displays a modern temporary graphical system-wide notification toast.
* **`Kernel.power.shutdown()`** - Sends generic termination signals before flashing the execution runtime context.

---

## 🛠️ 5. Sample Application Implementation Specs

To ship a programmatic node module package compatible with WebKernel, export a default class layout exposing explicit `init` and `destroy` routines:

```javascript
export default class CoreTextApplication {
    static manifest = {
        name: "Standard Text Utility",
        version: "1.0.0",
        permissions: ["window.create", "vfs.read"]
    };

    init(pid) {
        this.pid = pid;
        // Request a managed UI canvas from the window proxy manager
        const win = Kernel.createWindow({
            title: `Text Canvas Wrapper (PID: ${pid})`,
            width: 400,
            height: 250
        });
        
        win.contentElement.innerHTML = `
            <div style="padding: 15px; color: var(--theme-text);">
                <h3>Application Sandbox Instance Active</h3>
            </div>
        `;
    }

    destroy() {
        console.log("Memory space mapping allocations released safely.");
    }
}

```

# 🎛️ WebKernel Boot Management & Desktop Interface (v1.3.0)

## 📌 Running the GRUB Menu Locally
1. Launch `index.html` via **VS Code Live Server** or an allowed local file access flag config.
2. The browser will drop into a stylized **GNU GRUB Linux-style bootloader layout**.
3. Use your **Up (↑)** and **Down (↓)** keyboard arrows to swap target selections, then press **Enter** to pass operational tokens into the subsystem core.

### Available Boot Flags:
* **Standard Mode:** Boots the full system, establishing default theme variations and seeding system directories.
* **Fallback Console Mode:** Prevents wallpaper initialization arrays from blocking performance on low-spec client sessions.
* **Recovery Mode:** Directly drops the virtual IndexedDB system schemas, allowing you to force a fresh boot sequence on unaligned file nodes.
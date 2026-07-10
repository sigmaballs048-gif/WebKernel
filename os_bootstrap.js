/**
 * Win11Web Architecture OS Layer Clone (BIOS, Sizing & Drag/Drop Update)
 * Built cleanly on top of the WebKernel API ecosystem.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject Windows stylesheet rules
    const osStyles = document.createElement("link");
    osStyles.rel = "stylesheet";
    osStyles.href = "os_style.css";
    document.head.appendChild(osStyles);

    // 2. Poll safely for Kernel API availability, then launch the BIOS first
    window.addEventListener("load", () => {
        const bootTimer = setInterval(() => {
            if (window.Kernel) {
                clearInterval(bootTimer);
                runVirtualBIOS(() => {
                    initializeWin11OS();
                });
            }
        }, 50);
    });
});

// Global state variables
let recycleBinStorage = [];
let currentContextMenu = null;
const windowHistoryState = new Map(); // Tracks maximized sizing backups

/**
 * 📟 VIRTUAL BIOS SUBSYSTEM
 */
function runVirtualBIOS(onComplete) {
    const root = document.getElementById("desktop-root");
    // Ensure root is visible for the BIOS output display
    root.style.display = "block";
    root.style.background = "#000000";
    
    root.innerHTML = `
        <div id="virtual-bios-screen">
            <div class="bios-header">
                <span>AMERICAN MEGA-WEB TRENDS BIOS v2.16.1242</span>
                <span style="float: right;">July 2026</span>
            </div>
            <div class="bios-body" id="bios-log-output"></div>
            <div class="bios-footer">Press [DEL] to enter Setup Core // Boot Agent Active</div>
        </div>
    `;

    const logOutput = document.getElementById("bios-log-output");
    const logs = [
        "Initializing System Core Architecture...",
        "Checking RAM: 16384MB OK (Dual Channel DDR4)",
        "Detecting VFS Storage Blocks...",
        "Found Persistent Node: IndexedDB Virtual Disk 0 (VFS Master Partition)",
        "Verifying Kernel API Facade integrity...",
        "Status: Security Layer Active & Uncompromised.",
        "Loading Master Boot Record (MBR) via /os_bootstrap.js...",
        "Launching Win11Web Subsystem Shell Layer Environment..."
    ];

    let currentIdx = 0;
    function printNextLog() {
        if (currentIdx < logs.length) {
            const line = document.createElement("div");
            line.className = "bios-line";
            line.innerText = `> ${logs[currentIdx]}`;
            logOutput.appendChild(line);
            currentIdx++;
            setTimeout(printNextLog, Math.random() * 250 + 100);
        } else {
            setTimeout(() => {
                root.innerHTML = ""; // Clear BIOS completely
                onComplete();
            }, 800);
        }
    }
    setTimeout(printNextLog, 200);
}

function initializeWin11OS() {
    console.log(`%c Win11Web Deployment Initialization Complete `, "background: #0078d4; color: #ffffff; font-weight: bold;");

    // Apply standard modern dark background wallpaper via configuration registry
    Kernel.settings.set("sys.wallpaper", "linear-gradient(135deg, #060b19 0%, #0a1128 100%)");
    const root = document.getElementById("desktop-root");
    root.style.background = Kernel.settings.get("sys.wallpaper");

    // 3. Render Windows Layout
    root.innerHTML = `
        <div id="win-desktop-surface"></div>

        <div id="win-start-menu" class="win-menu-hidden">
            <div class="start-search-box">
                <input type="text" placeholder="Type here to search..." disabled />
            </div>
            <div class="start-section-title">Pinned Apps</div>
            <div class="start-grid">
                <div class="start-app-item" onclick="launchWinApp('vscode')">
                    <div class="app-icon">🟦</div>
                    <div class="app-label">VS Code</div>
                </div>
                <div class="start-app-item" onclick="launchWinApp('explorer')">
                    <div class="app-icon">📁</div>
                    <div class="app-label">File Explorer</div>
                </div>
                <div class="start-app-item" onclick="launchWinApp('terminal')">
                    <div class="app-icon">💻</div>
                    <div class="app-label">Terminal</div>
                </div>
                <div class="start-app-item" onclick="launchWinApp('recycle')">
                    <div class="app-icon">🗑️</div>
                    <div class="app-label">Recycle Bin</div>
                </div>
            </div>
            <div class="start-footer">
                <div class="user-profile">👤 User Account</div>
                <button class="power-btn" onclick="Kernel.power.shutdown()">🛑 Power</button>
            </div>
        </div>

        <div id="win-taskbar">
            <div class="taskbar-center-container">
                <button id="win-start-trigger" class="taskbar-icon" data-app-type="start">🪟</button>
                <button class="taskbar-icon" data-app-type="explorer" onclick="launchWinApp('explorer')">📁</button>
                <button class="taskbar-icon" data-app-type="vscode" onclick="launchWinApp('vscode')">🟦</button>
                <button class="taskbar-icon" data-app-type="terminal" onclick="launchWinApp('terminal')">💻</button>
                <button class="taskbar-icon" data-app-type="recycle" onclick="launchWinApp('recycle')">🗑️</button>
            </div>
            <div class="taskbar-system-tray" id="win-tray-clock-zone">
                <span id="tray-clock">12:00 PM</span>
            </div>
        </div>
    `;

    // Intercept Window Spawning to inject custom Window Control Management Hooks (Sizing/Minimize/Maximize)
    Kernel.events.on("window-opened", (data) => {
        injectAdvancedWindowControls(data.winId);
    });

    const startTrigger = document.getElementById("win-start-trigger");
    const startMenu = document.getElementById("win-start-menu");

    startTrigger.onclick = (e) => {
        e.stopPropagation();
        startMenu.classList.toggle("win-menu-hidden");
    };

    document.onclick = () => { 
        startMenu.classList.add("win-menu-hidden"); 
        closeContextMenu();
    };
    startMenu.onclick = (e) => e.stopPropagation();

    setupContextMenuListeners();

    setInterval(() => {
        const time = new Date();
        document.getElementById("tray-clock").innerText = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);

    refreshWinDesktop();
}

/**
 * 🪟 ADVANCED WINDOWS MANAGEMENT PIPELINE (Resize, Maximize, Minimize Handles)
 */
function injectAdvancedWindowControls(winId) {
    // Find the window element created by the kernel core within the DOM
    const winElement = document.querySelector(`[data-window-id="${winId}"]`);
    if (!winElement) return;

    const minBtn = winElement.querySelector(".btn-min");
    const maxBtn = winElement.querySelector(".btn-max");
    
    // 1. MINIMIZE FUNCTIONALITY (Slide Window Out / Toggle Active Task State)
    minBtn.onclick = (e) => {
        e.stopPropagation();
        if (winElement.style.display !== "none") {
            winElement.style.display = "none";
        }
    };

    // 2. MAXIMIZE / RESTORE FUNCTIONALITY
    maxBtn.onclick = (e) => {
        e.stopPropagation();
        if (windowHistoryState.has(winId)) {
            // Restore previous dimensions
            const backup = windowHistoryState.get(winId);
            Object.assign(winElement.style, backup);
            windowHistoryState.delete(winId);
        } else {
            // Backup current configuration mapping state
            windowHistoryState.set(winId, {
                top: winElement.style.top,
                left: winElement.style.left,
                width: winElement.style.width,
                height: winElement.style.height
            });
            // Apply absolute view constraints to simulate screen takeover boundaries
            Object.assign(winElement.style, {
                top: "0px",
                left: "0px",
                width: "100vw",
                height: "calc(100vh - 48px)"
            });
        }
    };

    // 3. SEAMLESS MOUSE RE-SIZING GRIP MATRIX SEEDING
    const resizeGrip = document.createElement("div");
    resizeGrip.className = "win-resize-grip";
    winElement.appendChild(resizeGrip);

    resizeGrip.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const startWidth = parseFloat(getComputedStyle(winElement, null).getPropertyValue('width'));
        const startHeight = parseFloat(getComputedStyle(winElement, null).getPropertyValue('height'));
        const startX = e.clientX;
        const startY = e.clientY;

        function doResize(ev) {
            winElement.style.width = `${startWidth + (ev.clientX - startX)}px`;
            winElement.style.height = `${startHeight + (ev.clientY - startY)}px`;
        }

        function stopResize() {
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
        }

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
    };
}

/**
 * 🛠️ Context Menu Core Subsystem Engine
 */
function setupContextMenuListeners() {
    const root = document.getElementById("desktop-root");

    root.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeContextMenu();

        let menuOptions = [];
        
        const targetShortcut = e.target.closest(".win-shortcut-tile");
        const targetTaskbarApp = e.target.closest(".taskbar-icon");
        const targetClockZone = e.target.closest("#win-tray-clock-zone");
        const isDesktopSurface = e.target.id === "win-desktop-surface";

        if (targetShortcut) {
            const isRecycle = targetShortcut.dataset.isRecycle === "true";
            const filePath = targetShortcut.dataset.filePath;

            if (isRecycle) {
                menuOptions = [
                    { label: "Open Recycle Bin", action: () => launchWinApp('recycle') },
                    { label: "Empty Recycle Bin", action: () => { recycleBinStorage = []; alert("Recycle bin cleared!"); } }
                ];
            } else {
                menuOptions = [
                    { label: "Edit in VS Code", action: () => launchWinApp('vscode', filePath) },
                    { label: "Delete File", action: () => sendFileToRecycleBin(filePath) }
                ];
            }
        } else if (targetTaskbarApp) {
            const appType = targetTaskbarApp.dataset.appType;
            menuOptions = [
                { label: `Launch Application (${appType})`, action: () => launchWinApp(appType === 'start' ? 'terminal' : appType) }
            ];
        } else if (targetClockZone) {
            menuOptions = [
                { label: "Adjust date/time settings", action: () => alert("Time Sync Complete.") }
            ];
        } else if (isDesktopSurface) {
            menuOptions = [
                { label: "Create New Text Document", action: createNewDesktopFile },
                { label: "Refresh Desktop Icons", action: refreshWinDesktop }
            ];
        }

        if (menuOptions.length > 0) {
            spawnContextMenuElement(e.clientX, e.clientY, menuOptions);
        }
    };
}

function spawnContextMenuElement(x, y, options) {
    const menuContainer = document.createElement("div");
    menuContainer.className = "win-context-menu";
    menuContainer.style.top = `${y}px`;
    menuContainer.style.left = `${x}px`;

    options.forEach(opt => {
        const item = document.createElement("div");
        item.className = "context-menu-item";
        item.innerText = opt.label;
        item.onclick = (e) => {
            e.stopPropagation();
            opt.action();
            closeContextMenu();
        };
        menuContainer.appendChild(item);
    });

    document.getElementById("desktop-root").appendChild(menuContainer);
    currentContextMenu = menuContainer;
}

function closeContextMenu() {
    if (currentContextMenu) {
        currentContextMenu.remove();
        currentContextMenu = null;
    }
}

function createNewDesktopFile() {
    const filename = prompt("Enter new filename context destination (e.g., note.txt):");
    if (!filename) return;
    const fullPath = `/desktop/${filename}`;
    try {
        Kernel.vfs.writeFile(fullPath, "// New text element container entry line layout\n", "text/plain");
        refreshWinDesktop();
    } catch(e) { alert(e.message); }
}

function sendFileToRecycleBin(path) {
    try {
        const content = Kernel.vfs.readFile(path);
        recycleBinStorage.push({ path, content, mimeType: "text/plain" });
        Kernel.vfs.remove(path);
        refreshWinDesktop();
    } catch(e) { alert(e.message); }
}

function launchWinApp(type, pathArg = "") {
    document.getElementById("win-start-menu").classList.add("win-menu-hidden");
    closeContextMenu();

    // If an application's window is minimized and hidden, restore its viewport on click
    if (type !== 'start') {
        const existingWin = Array.from(document.querySelectorAll('.kernel-window')).find(el => {
            return el.querySelector('.window-titlebar span').innerText.toLowerCase().includes(type.toLowerCase());
        });
        if (existingWin && existingWin.style.display === "none") {
            existingWin.style.display = "flex";
            return;
        }
    }

    switch(type) {
        case 'terminal':
            Kernel.process.launchFromFile("/apps/terminal.js").catch(err => alert(err.message));
            break;
        case 'explorer':
            Kernel.process.launchFromFile("/apps/explorer.js").catch(err => alert(err.message));
            break;
        case 'vscode':
            renderVSCodePortWindow(pathArg);
            break;
        case 'recycle':
            renderRecycleBinWindow();
            break;
    }
}

/**
 * 🟦 CUSTOM PORT: VS Code IDE Clone
 */
function renderVSCodePortWindow(targetFile = "") {
    const win = Kernel.createWindow({
        title: "Visual Studio Code",
        width: 750,
        height: 500,
        x: 80,
        y: 40
    });

    win.contentElement.innerHTML = `
        <div class="code-editor-layout">
            <div class="editor-sidebar">
                <div class="sidebar-title">EXPLORER</div>
                <div class="file-tree-container" id="editor-file-tree"></div>
            </div>
            <div class="editor-main">
                <div class="editor-tabs-bar">
                    <span class="active-tab-item" id="editor-tab-title">${targetFile ? targetFile.split("/").pop() : "Untitled"}</span>
                </div>
                <div class="editor-input-view">
                    <div class="editor-gutter" id="editor-gutter-nums">1</div>
                    <textarea class="editor-textarea" id="editor-textarea-field" spellcheck="false" placeholder="// Select a file or start writing here..."></textarea>
                </div>
                <div class="editor-statusbar">
                    <span>LF</span><span>JavaScript</span><span>UTF-8</span>
                </div>
            </div>
            <button class="vscode-save-floating" id="vscode-save-action">💾 Save File</button>
        </div>
    `;

    const treeContainer = win.contentElement.querySelector("#editor-file-tree");
    const textarea = win.contentElement.querySelector("#editor-textarea-field");
    const gutter = win.contentElement.querySelector("#editor-gutter-nums");
    const tabTitle = win.contentElement.querySelector("#editor-tab-title");
    const saveBtn = win.contentElement.querySelector("#vscode-save-action");

    let currentOpenPath = targetFile;

    const populateTree = () => {
        treeContainer.innerHTML = "";
        ['/desktop', '/apps', '/documents'].forEach(dir => {
            try {
                Kernel.vfs.readDir(dir).forEach(file => {
                    const row = document.createElement("div");
                    row.className = "tree-file-row";
                    row.innerText = `📄 ${file.path.split("/").pop()}`;
                    row.onclick = () => {
                        currentOpenPath = file.path;
                        tabTitle.innerText = file.path.split("/").pop();
                        textarea.value = Kernel.vfs.readFile(file.path);
                        updateGutterCount();
                    };
                    treeContainer.appendChild(row);
                });
            } catch(e) {}
        });
    };

    const updateGutterCount = () => {
        const lines = textarea.value.split("\n").length;
        let numStr = "";
        for (let i = 1; i <= lines; i++) numStr += i + "<br/>";
        gutter.innerHTML = numStr;
    };

    textarea.oninput = updateGutterCount;

    saveBtn.onclick = () => {
        if (!currentOpenPath) {
            const name = prompt("Enter a filename destination path (e.g. /desktop/code_test.js):");
            if (!name) return;
            currentOpenPath = name;
        }
        try {
            Kernel.vfs.writeFile(currentOpenPath, textarea.value, "text/plain");
            tabTitle.innerText = currentOpenPath.split("/").pop();
            populateTree();
            refreshWinDesktop();
        } catch(err) { alert("Error saving: " + err.message); }
    };

    populateTree();
    if (currentOpenPath) {
        try {
            textarea.value = Kernel.vfs.readFile(currentOpenPath);
            updateGutterCount();
        } catch(e) {}
    }
}

/**
 * 🗑️ CUSTOM MODULE: Recycle Bin Application Subsystem
 */
function renderRecycleBinWindow() {
    const win = Kernel.createWindow({
        title: "Recycle Bin",
        width: 500,
        height: 350,
        x: 200,
        y: 100
    });

    const renderContents = () => {
        if (recycleBinStorage.length === 0) {
            win.contentElement.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #8c8c8c; font-family: sans-serif; background: #202020; height: 100%;">
                    <div style="font-size: 3rem; margin-bottom: 10px;">🗑️</div>
                    <div>This folder is empty.</div>
                </div>`;
            return;
        }

        win.contentElement.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%; background: #202020; color: #ffffff; font-family: sans-serif; font-size: 13px;">
                <div style="padding: 8px; background: #2d2d2d; border-bottom: 1px solid #3d3d3d;">
                    <button id="empty-bin-btn" style="background: #e04a4a; border: none; color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer;">Empty Recycle Bin</button>
                </div>
                <div id="bin-items-list" style="flex: 1; padding: 15px; display: grid; grid-template-columns: repeat(auto-fill, 80px); gap: 15px; align-content: start; overflow-auto;"></div>
            </div>`;

        const container = win.contentElement.querySelector("#bin-items-list");
        recycleBinStorage.forEach((item, index) => {
            const entryNode = document.createElement("div");
            entryNode.style.cssText = "display:flex; flex-direction:column; align-items:center; text-align:center; cursor:pointer;";
            entryNode.innerHTML = `<div style="font-size: 2rem;">📄</div><div style="font-size: 11px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${item.path.split("/").pop()}</div>`;
            entryNode.title = `Double click to restore: ${item.path}`;
            entryNode.ondblclick = () => {
                try {
                    Kernel.vfs.writeFile(item.path, item.content, item.mimeType);
                    recycleBinStorage.splice(index, 1);
                    renderContents();
                    refreshWinDesktop();
                } catch(e) { alert(e.message); }
            };
            container.appendChild(entryNode);
        });

        win.contentElement.querySelector("#empty-bin-btn").onclick = () => {
            recycleBinStorage = [];
            renderContents();
        };
    };

    renderContents();
}

function refreshWinDesktop() {
    const surface = document.getElementById("win-desktop-surface");
    if (!surface) return;
    surface.innerHTML = "";

    const recycleNode = document.createElement("div");
    recycleNode.className = "win-shortcut-tile";
    recycleNode.dataset.isRecycle = "true";
    recycleNode.innerHTML = `<div class="icon-pane">🗑️</div><div class="label-pane">Recycle Bin</div>`;
    recycleNode.onclick = () => launchWinApp('recycle');
    surface.appendChild(recycleNode);

    try {
        Kernel.vfs.readDir("/desktop").forEach(file => {
            const node = document.createElement("div");
            node.className = "win-shortcut-tile";
            node.dataset.filePath = file.path;
            const isJs = file.path.endsWith(".js");

            node.innerHTML = `
                <div class="icon-pane">${isJs ? "🟦" : "📄"}</div>
                <div class="label-pane">${file.path.split("/").pop()}</div>
                <button class="delete-icon-overlay" title="Move to Recycle Bin">×</button>
            `;

            node.onclick = () => launchWinApp('vscode', file.path);

            node.querySelector(".delete-icon-overlay").onclick = (e) => {
                e.stopPropagation();
                sendFileToRecycleBin(file.path);
            };

            surface.appendChild(node);
        });
    } catch (e) {}
}

window.launchWinApp = launchWinApp;
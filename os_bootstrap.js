/**
 * Win11Web Architecture OS Layer Clone - Unified Core Suite v3.5
 * Built cleanly on top of the WebKernel API ecosystem.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject Windows stylesheet rules
    const osStyles = document.createElement("link");
    osStyles.rel = "stylesheet";
    osStyles.href = "os_style.css";
    document.head.appendChild(osStyles);

    // 2. Poll safely for Kernel API availability, then launch BIOS sequence
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

// Global state tracking allocations
let recycleBinStorage = [];
let currentContextMenu = null;
const windowHistoryState = new Map(); // Tracks maximized sizing configurations

/**
 * 📟 VIRTUAL BIOS SUBSYSTEM
 */
function runVirtualBIOS(onComplete) {
    const root = document.getElementById("desktop-root");
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
            setTimeout(printNextLog, Math.random() * 120 + 40);
        } else {
            setTimeout(() => {
                root.innerHTML = ""; // Wipe BIOS display
                onComplete();
            }, 400);
        }
    }
    setTimeout(printNextLog, 200);
}

/**
 * 🚀 OS CORE GRAPHICAL RUNTIME INITIALIZATION
 */
function initializeWin11OS() {
    console.log(`%c Win11Web Deployment Initialization Complete `, "background: #0078d4; color: #ffffff; font-weight: bold;");

    // Set fallback default wallpaper parameters
    Kernel.settings.set("sys.wallpaper", "linear-gradient(135deg, #060b19 0%, #0a1128 100%)");
    const root = document.getElementById("desktop-root");
    root.style.background = Kernel.settings.get("sys.wallpaper");

    // 3. Render Desktop Workspace & Centered Taskbar Framework Strip
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

    // 4. Connect Window Lifecycle Hooks to Inject Resizing grips and Window Control Handlers
    Kernel.events.on("window-opened", (data) => {
        injectAdvancedWindowControls(data.winId);
    });

    // 5. Setup Action Triggers & Close Signals
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

    // 6. Spin up Global Right Click Interceptors
    setupContextMenuListeners();

    // 7. Keep real-time system clock accurate
    setInterval(() => {
        const time = new Date();
        document.getElementById("tray-clock").innerText = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);

    refreshWinDesktop();
}

/**
 * 🪟 ADVANCED WINDOWS MANAGEMENT INTERFACES (Resize, Maximize, Minimize Handlers)
 */
function injectAdvancedWindowControls(winId) {
    const winElement = document.querySelector(`[data-window-id="${winId}"]`);
    if (!winElement) return;

    const minBtn = winElement.querySelector(".btn-min");
    const maxBtn = winElement.querySelector(".btn-max");
    
    if (minBtn) {
        minBtn.onclick = (e) => {
            e.stopPropagation();
            winElement.style.display = "none";
        };
    }

    if (maxBtn) {
        maxBtn.onclick = (e) => {
            e.stopPropagation();
            if (windowHistoryState.has(winId)) {
                const backup = windowHistoryState.get(winId);
                Object.assign(winElement.style, backup);
                windowHistoryState.delete(winId);
            } else {
                windowHistoryState.set(winId, {
                    top: winElement.style.top,
                    left: winElement.style.left,
                    width: winElement.style.width,
                    height: winElement.style.height
                });
                Object.assign(winElement.style, {
                    top: "0px",
                    left: "0px",
                    width: "100vw",
                    height: "calc(100vh - 48px)"
                });
            }
        };
    }

    // Append Corner Resize Grip Node
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
 * 📁 CUSTOM PORTS: Windows 11 File Explorer Application
 */
function renderWinExplorerWindow(initialDir = "/desktop") {
    const win = Kernel.createWindow({
        title: "File Explorer",
        width: 680,
        height: 440,
        x: 110,
        y: 60
    });

    let currentDir = initialDir;

    const renderContents = () => {
        if (currentDir !== "/" && currentDir.endsWith("/")) {
            currentDir = currentDir.slice(0, -1);
        }
        if (!currentDir) currentDir = "/";

        win.contentElement.innerHTML = `
            <div class="exp-window-container">
                <div class="exp-toolbar">
                    <button class="exp-nav-btn" id="exp-btn-up">⬆️ Up</button>
                    <div class="exp-path-wrapper">
                        <span class="exp-path-icon">📁</span>
                        <input type="text" class="exp-path-field" value="${currentDir}" readonly />
                    </div>
                </div>
                <div class="exp-workspace-layout">
                    <div class="exp-sidebar">
                        <div class="exp-side-group">Favorites</div>
                        <div class="exp-side-item" data-target-path="/desktop">🖥️ Desktop</div>
                        <div class="exp-side-item" data-target-path="/documents">📁 Documents</div>
                        <div class="exp-side-item" data-target-path="/apps">⚙️ Applications</div>
                    </div>
                    <div class="exp-main-pane" id="exp-grid-view" data-current-dir="${currentDir}"></div>
                </div>
                <div class="exp-statusbar">Connected to the shared kernel VFS architecture layer.</div>
            </div>
        `;

        const gridView = win.contentElement.querySelector("#exp-grid-view");

        win.contentElement.querySelectorAll(".exp-side-item").forEach(item => {
            if (item.dataset.targetPath === currentDir) item.classList.add("active");
            item.onclick = () => {
                currentDir = item.dataset.targetPath;
                renderContents();
            };
        });

        try {
            const nodes = Kernel.vfs.readDir(currentDir);
            if (nodes.length === 0) {
                gridView.innerHTML = `<div class="exp-empty-state">This folder is empty.</div>`;
            }

            nodes.forEach(node => {
                const itemEl = document.createElement("div");
                itemEl.className = "exp-file-card";
                itemEl.dataset.filePath = node.path;
                
                // 🔍 Identify directories dynamically
                const isDirectory = node.type === 'dir' || node.type === 'directory' || (!node.path.split('/').pop().includes('.'));
                const isJs = node.path.endsWith(".js");

                let icon = "📄";
                if (isDirectory) icon = "📁";
                else if (isJs) icon = "🟦";

                itemEl.innerHTML = `
                    <div class="file-card-icon">${icon}</div>
                    <div class="file-card-label">${node.path.split("/").pop()}</div>
                `;

                // Handle routing based on item type
                itemEl.ondblclick = () => {
                    if (isDirectory) {
                        currentDir = node.path;
                        renderContents();
                    } else {
                        launchWinApp('vscode', node.path);
                    }
                };

                gridView.appendChild(itemEl);
            });
        } catch(e) {
            gridView.innerHTML = `<div class="exp-empty-state" style="color:#f38ba8;">Error loading node items: ${e.message}</div>`;
        }

        win.contentElement.querySelector("#exp-btn-up").onclick = () => {
            if (currentDir === "/" || currentDir === "") return;
            const segments = currentDir.split("/").filter(Boolean);
            segments.pop();
            currentDir = "/" + segments.join("/");
            renderContents();
        };
    };

    win.contentElement.refreshExplorerInstance = () => renderContents();
    renderContents();
}

/**
 * 🛠️ CONTEXT MENU ROUTING INTERCEPTORS
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
        const targetExpFile = e.target.closest(".exp-file-card");
        const targetExpPane = e.target.closest(".exp-main-pane");
        const isDesktopSurface = e.target.id === "win-desktop-surface";

        if (targetExpFile) {
            const filePath = targetExpFile.dataset.filePath;
            const fileName = filePath.split('/').pop();
            const isDir = !fileName.includes('.');
            const isExecutable = fileName.endsWith('.js') || fileName.endsWith('.html');
            
            if (isDir) {
                menuOptions.push({ 
                    label: "📁 Open Folder View", 
                    action: () => {
                        const expContainer = targetExpFile.closest('.exp-window-container').parentNode;
                        renderWinExplorerWindow(filePath);
                        expContainer.remove(); 
                    }
                });
            } else {
                if (isExecutable) {
                    menuOptions.push({ 
                        label: "🏃‍♂️ Run Executable", 
                        action: () => executeVirtualScript(filePath) 
                    });
                }
                menuOptions.push({ label: "🚀 Open in VS Code", action: () => launchWinApp('vscode', filePath) });
            }

            menuOptions.push({ 
                label: "🗑️ Delete Reference", 
                action: () => {
                    sendFileToRecycleBin(filePath);
                    const expWin = targetExpFile.closest('.exp-window-container').parentNode;
                    if (expWin.refreshExplorerInstance) expWin.refreshExplorerInstance();
                }
            });
        } 
        else if (targetExpPane) {
            const activeDir = targetExpPane.dataset.currentDir;
            menuOptions = [
                { label: "➕ Create New File Container", action: () => {
                    const filename = prompt("Enter target filename (e.g. app.js):");
                    if (!filename) return;
                    Kernel.vfs.writeFile(`${activeDir}/${filename}`, "// Code file details\n", "text/plain");
                    const expWin = targetExpPane.closest('.exp-window-container').parentNode;
                    if (expWin.refreshExplorerInstance) expWin.refreshExplorerInstance();
                    refreshWinDesktop();
                }},
                { label: "🔄 Refresh Grid Layout", action: () => {
                    const expWin = targetExpPane.closest('.exp-window-container').parentNode;
                    if (expWin.refreshExplorerInstance) expWin.refreshExplorerInstance();
                }}
            ];
        }
        else if (targetShortcut) {
            const isRecycle = targetShortcut.dataset.isRecycle === "true";
            const filePath = targetShortcut.dataset.filePath;

            if (isRecycle) {
                menuOptions = [
                    { label: "Open Recycle Bin", action: () => launchWinApp('recycle') },
                    { label: "Empty Recycle Bin", action: () => { recycleBinStorage = []; refreshWinDesktop(); } }
                ];
            } else if (filePath) {
                const fileName = filePath.split('/').pop();
                if (fileName.endsWith('.js') || fileName.endsWith('.html')) {
                    menuOptions.push({ 
                        label: "🏃‍♂️ Run Executable", 
                        action: () => executeVirtualScript(filePath) 
                    });
                }
                menuOptions.push({ label: "🚀 Open in VS Code", action: () => launchWinApp('vscode', filePath) });
                menuOptions.push({ label: "🗑️ Move to Recycle Bin", action: () => sendFileToRecycleBin(filePath) });
            }
        } else if (targetTaskbarApp) {
            const appType = targetTaskbarApp.dataset.appType;
            menuOptions = [{ label: `Launch Application Module (${appType})`, action: () => launchWinApp(appType === 'start' ? 'terminal' : appType) }];
        } else if (targetClockZone) {
            menuOptions = [{ label: "Sync System Clock Tick Rate", action: () => alert("Network Synchronization complete.") }];
        } else if (isDesktopSurface) {
            menuOptions = [
                { label: "Create New Desktop Document", action: createNewDesktopFile },
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
    const filename = prompt("Enter target element descriptor filename (e.g., config.js):");
    if (!filename) return;
    try {
        Kernel.vfs.writeFile(`/desktop/${filename}`, "// Custom asset entry text data matrix\n", "text/plain");
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

/**
 * ⚡ DYNAMIC SCRIPT RUNTIME ENGINE
 * Reads files from VFS and executes them within the OS sandbox layer context.
 */
function executeVirtualScript(path) {
    try {
        const rawContent = Kernel.vfs.readFile(path);
        
        if (path.endsWith('.html')) {
            const win = Kernel.createWindow({
                title: path.split('/').pop(),
                width: 500,
                height: 400,
                x: 180,
                y: 100
            });
            win.contentElement.style.background = "#ffffff";
            win.contentElement.style.color = "#000000";
            win.contentElement.style.height = "100%";
            win.contentElement.style.overflow = "auto";
            win.contentElement.innerHTML = rawContent;
            
            const scriptTags = win.contentElement.querySelectorAll("script");
            scriptTags.forEach(oldScript => {
                const newScript = document.createElement("script");
                newScript.text = oldScript.text;
                document.head.appendChild(newScript).parentNode.removeChild(newScript);
            });
        } 
        else if (path.endsWith('.js')) {
            const secureExecution = new Function("Kernel", rawContent);
            secureExecution(window.Kernel);
        }
    } catch (err) {
        alert("Execution Error:\n" + err.message);
    }
}

/**
 * 💻 NATIVE PORT: Virtual OS Command Terminal
 */
function renderTerminalWindow() {
    const win = Kernel.createWindow({
        title: "Terminal Console",
        width: 600,
        height: 380,
        x: 160,
        y: 90
    });

    win.contentElement.innerHTML = `
        <div class="term-container" style="background:#0c0c0c; color:#00ff00; font-family:'Consolas', monospace; font-size:13px; height:100%; display:flex; flex-direction:column; padding:10px; box-sizing:border-box;">
            <div class="term-history" id="term-log-view" style="flex:1; overflow-y:auto; white-space:pre-wrap; line-height:1.4; margin-bottom:5px;">Win11Web Command Console [Version 10.0.2026]\n(c) 2026 Microsoft/WebKernel. All rights reserved.\n\nType "help" to list available subsystem variables.\n</div>
            <div class="term-input-line" style="display:flex; align-items:center; gap:5px;">
                <span class="term-prompt" style="color:#60cdff; user-select:none;">VFS:\\></span>
                <input type="text" id="term-input-field" style="flex:1; background:transparent; border:none; color:#00ff00; font-family:'Consolas', monospace; font-size:13px; outline:none;" autocomplete="off" autofocus />
            </div>
        </div>
    `;

    const logView = win.contentElement.querySelector("#term-log-view");
    const inputField = win.contentElement.querySelector("#term-input-field");

    inputField.onkeydown = (e) => {
        if (e.key === "Enter") {
            const rawCmd = inputField.value.trim();
            inputField.value = "";
            if (!rawCmd) return;

            logView.innerText += `\nVFS:\\> ${rawCmd}\n`;
            
            const parts = rawCmd.split(" ");
            const command = parts[0].toLowerCase();
            const arg = parts.slice(1).join(" ");

            switch(command) {
                case 'help':
                    logView.innerText += "Available options: clear, dir, echo [str], read [path], rm [path], ver";
                    break;
                case 'ver':
                    logView.innerText += "Win11Web Subsystem Core Kernel Runtime v3.5 (2026 Edition)";
                    break;
                case 'clear':
                    logView.innerText = "";
                    break;
                case 'echo':
                    logView.innerText += arg;
                    break;
                case 'dir':
                    try {
                        const items = Kernel.vfs.readDir("/desktop");
                        logView.innerText += items.map(i => `   ${i.path.split('/').pop()}`).join('\n');
                    } catch(err) { logView.innerText += `Error reading workspace: ${err.message}`; }
                    break;
                case 'read':
                    try {
                        logView.innerText += Kernel.vfs.readFile(arg);
                    } catch(err) { logView.innerText += `VFS Read Error: ${err.message}`; }
                    break;
                case 'rm':
                    try {
                        Kernel.vfs.remove(arg);
                        logView.innerText += `Node reference deleted: ${arg}`;
                        refreshWinDesktop();
                    } catch(err) { logView.innerText += `VFS Target Drop Error: ${err.message}`; }
                    break;
                default:
                    logView.innerText += `"${command}" is not recognized as an internal virtual command module mapping.`;
            }
            logView.scrollTop = logView.scrollHeight;
        }
    };
}

function launchWinApp(type, pathArg = "") {
    document.getElementById("win-start-menu").classList.add("win-menu-hidden");
    closeContextMenu();

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
            renderTerminalWindow();
            break;
        case 'explorer':
            renderWinExplorerWindow();
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
            const name = prompt("Enter target destination directory (e.g. /desktop/code.js):");
            if (!name) return;
            currentOpenPath = name;
        }
        try {
            Kernel.vfs.writeFile(currentOpenPath, textarea.value, "text/plain");
            tabTitle.innerText = currentOpenPath.split("/").pop();
            populateTree();
            refreshWinDesktop();
        } catch(err) { alert("Error saving changes: " + err.message); }
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
 * 🗑️ RECYCLE BIN SUBSYSTEM WINDOW VIEW
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
            refreshWinDesktop();
        };
    };

    renderContents();
}

/**
 * RE-DRAW DESKTOP WORKSPACE GRID MAPPINGS
 */
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
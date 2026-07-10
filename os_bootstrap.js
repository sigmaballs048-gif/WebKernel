/**
 * Win11Web Architecture OS Layer Clone
 * Built cleanly on top of the WebKernel API ecosystem.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject Windows stylesheet rules
    const osStyles = document.createElement("link");
    osStyles.rel = "stylesheet";
    osStyles.href = "os_style.css";
    document.head.appendChild(osStyles);

    // 2. Poll safely for Kernel API availability
    window.addEventListener("load", () => {
        const bootTimer = setInterval(() => {
            if (window.Kernel) {
                clearInterval(bootTimer);
                initializeWin11OS();
            }
        }, 50);
    });
});

// Global state variables for our cloned features
let recycleBinStorage = [];

function initializeWin11OS() {
    console.log(`%c Win11Web Deployment Initialization Complete `, "background: #0078d4; color: #ffffff; font-weight: bold;");

    // Apply standard modern dark background wallpaper via configuration registry
    Kernel.settings.set("sys.wallpaper", "linear-gradient(135deg, #060b19 0%, #0a1128 100%)");

    const root = document.getElementById("desktop-root");

    // 3. Render Windows Layout (Centered taskbar, hidden bottom menus)
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
                <button id="win-start-trigger" class="taskbar-icon">🪟</button>
                <button class="taskbar-icon" onclick="launchWinApp('explorer')">📁</button>
                <button class="taskbar-icon" onclick="launchWinApp('vscode')">🟦</button>
                <button class="taskbar-icon" onclick="launchWinApp('terminal')">💻</button>
                <button class="taskbar-icon" onclick="launchWinApp('recycle')">🗑️</button>
            </div>
            <div class="taskbar-system-tray">
                <span id="tray-clock">12:00 PM</span>
            </div>
        </div>
    `;

    // 4. Bind action controllers
    const startTrigger = document.getElementById("win-start-trigger");
    const startMenu = document.getElementById("win-start-menu");

    startTrigger.onclick = (e) => {
        e.stopPropagation();
        startMenu.classList.toggle("win-menu-hidden");
    };

    document.onclick = () => { startMenu.classList.add("win-menu-hidden"); };
    startMenu.onclick = (e) => e.stopPropagation();

    // 5. Update system tray real-time clock
    setInterval(() => {
        const time = new Date();
        document.getElementById("tray-clock").innerText = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);

    // Initial desktop surface item rendering refresh
    refreshWinDesktop();
}

/**
 * Custom App Launch Routing Table Options
 */
function launchWinApp(type, pathArg = "") {
    document.getElementById("win-start-menu").classList.add("win-menu-hidden");

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

    // Load file tree view index on the sidebar panel
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
        } catch(err) {
            alert("Error saving: " + err.message);
        }
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

/**
 * Re-read and draw workspace layout icons to the screen layout surface map
 */
function refreshWinDesktop() {
    const surface = document.getElementById("win-desktop-surface");
    if (!surface) return;
    surface.innerHTML = "";

    // Always append the fixed Recycle Bin tile shortcut
    const recycleNode = document.createElement("div");
    recycleNode.className = "win-shortcut-tile";
    recycleNode.innerHTML = `<div class="icon-pane">🗑️</div><div class="label-pane">Recycle Bin</div>`;
    recycleNode.onclick = () => launchWinApp('recycle');
    surface.appendChild(recycleNode);

    try {
        Kernel.vfs.readDir("/desktop").forEach(file => {
            const node = document.createElement("div");
            node.className = "win-shortcut-tile";
            const isJs = file.path.endsWith(".js");

            node.innerHTML = `
                <div class="icon-pane">${isJs ? "🟦" : "📄"}</div>
                <div class="label-pane">${file.path.split("/").pop()}</div>
                <button class="delete-icon-overlay" title="Move to Recycle Bin">×</button>
            `;

            // Open in corresponding workflow tool routes
            node.onclick = (e) => {
                if (isJs) launchWinApp('vscode', file.path);
                else launchWinApp('vscode', file.path);
            };

            // Capture Delete actions, intercept data stream, and store in the bin buffer array allocation
            node.querySelector(".delete-icon-overlay").onclick = (e) => {
                e.stopPropagation();
                recycleBinStorage.push({ path: file.path, content: file.content, mimeType: file.mimeType });
                Kernel.vfs.remove(file.path);
                refreshWinDesktop();
            };

            surface.appendChild(node);
        });
    } catch (e) {}
}

window.launchWinApp = launchWinApp;
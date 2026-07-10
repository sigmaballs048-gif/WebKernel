/**
 * WebKernel - Graphical User Interface & Desktop Environment Combined (Integrated Spec)
 */

class WebGUI {
    constructor(kernel, rootDomElement) {
        this.kernel = kernel;
        this.root = rootDomElement;
        this.windows = new Map();
        window.layerIndexCounter = 1000;
        this._applyGlobalSystemStyles();
    }

    _applyGlobalSystemStyles() {
        const stylesheet = document.createElement("style");
        stylesheet.textContent = `
            :root { --theme-bg: #1e1e2e; --theme-surface: #313244; --theme-text: #cdd6f4; --theme-accent: #89b4fa; --theme-border: #45475a; }
            .kernel-window { position: absolute; background-color: var(--theme-bg); border: 1px solid var(--theme-border); box-shadow: 0 12px 40px rgba(0,0,0,0.4); border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; min-width: 200px; min-height: 100px; }
            .window-titlebar { background: var(--theme-surface); color: var(--theme-text); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: move; font-weight: bold; font-size: 13px; border-bottom: 1px solid var(--theme-border); user-select: none; }
            .titlebar-controls { display: flex; gap: 8px; }
            .control-btn { width: 14px; height: 14px; border-radius: 50%; border: none; cursor: pointer; }
            .btn-close { background-color: #f38ba8; }
            .btn-max { background-color: #f9e2af; }
            .btn-min { background-color: #a6e3a1; }
            .window-body-content { flex: 1; overflow: auto; color: var(--theme-text); position: relative; background: #11111b; }
            .desktop-icon-node { display: flex; flex-direction: column; align-items: center; width: 95px; padding: 12px 6px; cursor: pointer; border-radius: 6px; text-align: center; gap: 4px; color: #ffffff; text-shadow: 1px 2px 4px rgba(0,0,0,0.8); font-size: 12px; font-family: sans-serif; }
            .desktop-icon-node:hover { background: rgba(255,255,255,0.1); }
        `;
        document.head.appendChild(stylesheet);
    }

    /**
     * Hardcoded Desktop Shell Bootstrapper Routine
     * Renders standard components straight to screen context without dynamic module imports.
     */
    bootstrapDesktopEnvironment() {
        this.root.style.background = this.kernel.registry.get("sys.wallpaper");
        
        this.root.innerHTML = `
            <div id="desktop-grid-matrix" style="position:absolute; top:0; left:0; right:0; bottom:50px; padding:25px; display:grid; grid-template-columns: repeat(auto-fill, 95px); grid-auto-rows: 100px; gap: 15px; align-content: start; z-index: 10;"></div>
            <div id="start-menu-overlay" style="position: absolute; bottom: 55px; left: 15px; width: 320px; height: 420px; background: #1e1e2e; border: 1px solid #45475a; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); display: none; flex-direction: column; z-index: 999999; overflow: hidden;">
                <div style="padding:18px; background:#313244; font-weight:bold; font-size:14px; border-bottom:1px solid #45475a; color:#cdd6f4; font-family:sans-serif;">Applications Matrix</div>
                <div id="start-menu-payload-list" style="flex:1; overflow-y:auto;"></div>
            </div>
            <div id="system-taskbar-shell" style="position:absolute; bottom:0; left:0; right:0; height:50px; background:rgba(24, 24, 37, 0.85); backdrop-filter:blur(12px); border-top:1px solid #45475a; display:flex; align-items:center; padding:0 15px; gap:20px; z-index:999998;">
                <button id="taskbar-launcher-trigger" style="background:#89b4fa; border:none; color:#11111b; font-weight:bold; padding:8px 16px; border-radius: 6px; cursor:pointer; font-family:sans-serif; font-size:13px;">Menu</button>
                <div id="taskbar-active-process-tray" style="display:flex; gap:10px; flex:1; overflow-x:auto;"></div>
            </div>
        `;

        const launcherTrigger = this.root.querySelector("#taskbar-launcher-trigger");
        const menuOverlay = this.root.querySelector("#start-menu-overlay");

        launcherTrigger.onclick = (e) => {
            e.stopPropagation();
            const isOpen = menuOverlay.style.display === "flex";
            menuOverlay.style.display = isOpen ? "none" : "flex";
            if (!isOpen) this._populateStartLauncherMenu();
        };

        this.root.onclick = () => { menuOverlay.style.display = "none"; };
        menuOverlay.onclick = (e) => e.stopPropagation();

        this.kernel.events.on("window-opened", () => this._syncTaskbarTrayItems());
        this.kernel.events.on("window-closed", () => this._syncTaskbarTrayItems());

        this.refreshDesktopIcons();
    }

    refreshDesktopIcons() {
        const targetGrid = this.root.querySelector("#desktop-grid-matrix");
        if (!targetGrid) return;
        targetGrid.innerHTML = "";
        
        try {
            this.kernel.vfs.readDir("/desktop").forEach(fileRecord => {
                const iconNode = document.createElement("div");
                iconNode.className = "desktop-icon-node";
                const isJs = fileRecord.path.endsWith(".js");
                
                iconNode.innerHTML = `
                    <div style="font-size:2.2rem;">${isJs ? "⚙️" : (fileRecord.type === "directory" ? "📁" : "📄")}</div>
                    <div style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap; width:100%;">${fileRecord.path.split("/").pop()}</div>
                `;
                iconNode.onclick = () => {
                    if(isJs) this.kernel.process.launchFromFile(fileRecord.path).catch(err => alert(err.message));
                    else this.createWindow({ title: fileRecord.path.split("/").pop(), content: `<div style="padding:15px; background:#11111b; color:#cdd6f4; height:100%; white-space:pre-wrap; font-family:monospace;">${fileRecord.content}</div>` });
                };
                targetGrid.appendChild(iconNode);
            });
        } catch(e) {}
    }

    _populateStartLauncherMenu() {
        const itemsList = this.root.querySelector("#start-menu-payload-list");
        if (!itemsList) return;
        itemsList.innerHTML = "";
        
        try {
            this.kernel.vfs.readDir("/apps").forEach(app => {
                const row = document.createElement("div");
                row.style.cssText = "display:flex; align-items:center; padding:12px 20px; color:#cdd6f4; cursor:pointer; border-bottom:1px solid #45475a; font-size:13px; font-family:sans-serif;";
                row.innerHTML = `<span>⚙️</span> <span style="margin-left:12px">${app.path.split("/").pop()}</span>`;
                row.onmouseenter = () => { row.style.background = "#313244"; };
                row.onmouseleave = () => { row.style.background = "transparent"; };
                row.onclick = () => {
                    this.kernel.process.launchFromFile(app.path).catch(err => alert(err.message));
                    this.root.querySelector("#start-menu-overlay").style.display = "none";
                };
                itemsList.appendChild(row);
            });
        } catch(e) {}
    }

    _syncTaskbarTrayItems() {
        const container = this.root.querySelector("#taskbar-active-process-tray");
        if (!container) return;
        container.innerHTML = "";
        
        this.windows.forEach((frameNode, uniqueId) => {
            const visualLabel = frameNode.querySelector(".window-titlebar span").innerText;
            const trayBtn = document.createElement("button");
            trayBtn.style.cssText = "background:#313244; color:#cdd6f4; border:1px solid #45475a; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold; font-family:sans-serif;";
            trayBtn.innerText = visualLabel;
            trayBtn.onclick = () => { frameNode.style.zIndex = window.layerIndexCounter++; };
            container.appendChild(trayBtn);
        });
    }

    createWindow(options) {
        const winId = `win_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const wrapperNode = document.createElement("div");
        wrapperNode.className = "kernel-window";
        wrapperNode.dataset.windowId = winId;

        if (this.kernel.bootMode === "recovery") {
            Object.assign(options, { x: 10, y: 10, width: window.innerWidth - 20, height: window.innerHeight - 20 });
        }

        Object.assign(wrapperNode.style, {
            top: `${options.y || 100}px`, left: `${options.x || 100}px`,
            width: `${options.width || 450}px`, height: `${options.height || 300}px`,
            zIndex: window.layerIndexCounter++
        });

        wrapperNode.innerHTML = `
            <div class="window-titlebar">
                <span>${options.title || "Container"}</span>
                <div class="titlebar-controls">
                    <button class="control-btn btn-min"></button>
                    <button class="control-btn btn-max"></button>
                    <button class="control-btn btn-close"></button>
                </div>
            </div>
            <div class="window-body-content"></div>
        `;

        this._applyDragCapabilities(wrapperNode);
        wrapperNode.querySelector(".btn-close").onclick = (e) => { e.stopPropagation(); this.closeWindow(winId); };
        if(options.content) wrapperNode.querySelector(".window-body-content").innerHTML = options.content;

        this.root.appendChild(wrapperNode);
        this.windows.set(winId, wrapperNode);
        this.kernel.events.emit("window-opened", { winId, title: options.title });
        return { winId, contentElement: wrapperNode.querySelector(".window-body-content") };
    }

    closeWindow(winId) {
        const frame = this.windows.get(winId);
        if (frame) {
            frame.remove();
            this.windows.delete(winId);
            this.kernel.events.emit("window-closed", { winId });
        }
    }

    _applyDragCapabilities(windowFrame) {
        const titlebar = windowFrame.querySelector(".window-titlebar");
        let activeX = 0, activeY = 0, initialX = 0, initialY = 0;

        titlebar.onmousedown = (e) => {
            e.preventDefault();
            windowFrame.style.zIndex = window.layerIndexCounter++;
            initialX = e.clientX; initialY = e.clientY;
            document.onmousemove = (ev) => {
                activeX = initialX - ev.clientX; activeY = initialY - ev.clientY;
                initialX = ev.clientX; initialY = ev.clientY;
                windowFrame.style.top = `${windowFrame.offsetTop - activeY}px`;
                windowFrame.style.left = `${windowFrame.offsetLeft - activeX}px`;
            };
            document.onmouseup = () => { document.onmousemove = null; document.onmouseup = null; };
        };
    }
}
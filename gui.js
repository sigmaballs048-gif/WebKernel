/**
 * WebKernel - Architecture Core Graphical User Interface (GUI Engine)
 */

class WebGUI {
    constructor(kernel, rootDomElement) {
        this.kernel = kernel;
        this.root = rootDomElement;
        this.windows = new Map();
        this.layerIndexCounter = 1000;
        this.activeTheme = "dark";
        this._bootstrapUserInterfaceLayer();
    }

    _bootstrapUserInterfaceLayer() {
        this._applySystemStylingRules();
        this._buildDesktopWorkspaceLayout();
        this._wireGlobalUserInteractions();
    }

    _applySystemStylingRules() {
        const stylesheet = document.createElement("style");
        stylesheet.textContent = `
            :root { --theme-bg: #1e1e2e; --theme-surface: #313244; --theme-text: #cdd6f4; --theme-accent: #89b4fa; --theme-border: #45475a; }
            .light-mode-vars { --theme-bg: #eff1f5; --theme-surface: #e6e9ef; --theme-text: #4c4f69; --theme-accent: #1e66f5; --theme-border: #bcc0cc; }
            .kernel-window { position: absolute; background-color: var(--theme-bg); border: 1px solid var(--theme-border); box-shadow: 0 12px 40px rgba(0,0,0,0.4); border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; min-width: 200px; min-height: 100px; transition: transform 0.15s ease; }
            .window-titlebar { background: var(--theme-surface); color: var(--theme-text); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: move; font-weight: bold; font-size: 13px; border-bottom: 1px solid var(--theme-border); }
            .titlebar-controls { display: flex; gap: 8px; }
            .control-btn { width: 14px; height: 14px; border-radius: 50%; border: none; cursor: pointer; }
            .btn-close { background-color: #f38ba8; }
            .btn-max { background-color: #f9e2af; }
            .btn-min { background-color: #a6e3a1; }
            .window-body-content { flex: 1; overflow: auto; color: var(--theme-text); position: relative; }
            .desktop-icon-node { display: flex; flex-direction: column; align-items: center; width: 90px; padding: 12px 6px; cursor: pointer; border-radius: 6px; text-align: center; gap: 8px; color: #ffffff; text-shadow: 1px 2px 4px rgba(0,0,0,0.8); font-size: 12px; }
            .desktop-icon-node:hover { background: rgba(255,255,255,0.15); }
            .start-dock-panel { position: absolute; bottom: 55px; left: 15px; width: 320px; height: 420px; background: var(--theme-bg); border: 1px solid var(--theme-border); border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); display: none; flex-direction: column; z-index: 999999; overflow: hidden; }
            .dock-app-row { display: flex; align-items: center; padding: 12px 20px; color: var(--theme-text); cursor: pointer; border-bottom: 1px solid var(--theme-border); font-size: 13px; }
            .dock-app-row:hover { background: var(--theme-surface); }
        `;
        document.head.appendChild(stylesheet);
    }

    _buildDesktopWorkspaceLayout() {
        const targetWallpaper = this.kernel.registry.get("sys.wallpaper");
        this.root.style.background = targetWallpaper;
        this.root.innerHTML = `
            <div id="desktop-grid-matrix" style="position:absolute; top:0; left:0; right:0; bottom:50px; padding:25px; display:grid; grid-template-columns: repeat(auto-fill, 95px); grid-auto-rows: 100px; gap: 15px; align-content: start;"></div>
            <div id="start-menu-overlay" class="start-dock-panel">
                <div style="padding:18px; background:var(--theme-surface); font-weight:bold; font-size:14px; border-bottom:1px solid var(--theme-border);">Applications Matrix</div>
                <div id="start-menu-payload-list" style="flex:1; overflow-y:auto;"></div>
            </div>
            <div id="system-taskbar-shell" style="position:absolute; bottom:0; left:0; right:0; height:50px; background:rgba(24, 24, 37, 0.85); backdrop-filter:blur(12px); border-top:1px solid var(--theme-border); display:flex; align-items:center; padding:0 15px; gap:20px; z-index:999998;">
                <button id="taskbar-launcher-trigger" style="background:var(--theme-accent); border:none; color:#11111b; font-weight:bold; padding:8px 16px; border-radius: 6px; cursor:pointer;">Menu</button>
                <div id="taskbar-active-process-tray" style="display:flex; gap:10px; flex:1; overflow-x:auto;"></div>
            </div>
        `;

        const launcherTrigger = this.root.querySelector("#taskbar-launcher-trigger");
        const menuOverlay = this.root.querySelector("#start-menu-overlay");

        launcherTrigger.onclick = (e) => {
            e.stopPropagation();
            const currentDisplayState = menuOverlay.style.display;
            menuOverlay.style.display = currentDisplayState === "flex" ? "none" : "flex";
            if(menuOverlay.style.display === "flex") this._populateLauncherApplications();
        };

        this.root.onclick = () => { menuOverlay.style.display = "none"; };
        menuOverlay.onclick = (e) => e.stopPropagation();

        this.refreshDesktopIcons();
    }

    _wireGlobalUserInteractions() {
        this.root.addEventListener("mousedown", (e) => {
            const hitWindow = e.target.closest(".kernel-window");
            if (hitWindow) this.focusWindow(hitWindow.dataset.windowId);
        });
        this.kernel.events.on("window-opened", () => this._syncTaskbarProcessTray());
        this.kernel.events.on("window-closed", () => this._syncTaskbarProcessTray());
    }

    refreshDesktopIcons() {
        const targetGrid = this.root.querySelector("#desktop-grid-matrix");
        targetGrid.innerHTML = "";
        const staticVirtualDesktopFiles = this.kernel.vfs.readDir("/desktop");
        
        staticVirtualDesktopFiles.forEach(fileRecord => {
            const iconNode = document.createElement("div");
            iconNode.className = "desktop-icon-node";
            iconNode.innerHTML = `
                <div style="font-size:2.2rem;">${fileRecord.type === "directory" ? "📁" : "📄"}</div>
                <div style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap; width:100%;">${fileRecord.path.split("/").pop()}</div>
            `;
            iconNode.onclick = () => this._handleIconExecutionRoute(fileRecord);
            targetGrid.appendChild(iconNode);
        });
    }

    _populateLauncherApplications() {
        const itemsList = this.root.querySelector("#start-menu-payload-list");
        itemsList.innerHTML = "";
        const applicationExecutables = this.kernel.vfs.readDir("/apps");
        applicationExecutables.forEach(app => {
            const nameStr = app.path.split("/").pop();
            const row = document.createElement("div");
            row.className = "dock-app-row";
            row.innerHTML = `<span>⚙️</span> <span style="margin-left:12px">${nameStr}</span>`;
            row.onclick = () => {
                this.kernel.process.launchFromFile(app.path).catch(err => alert(`App Fault: ${err.message}`));
                this.root.querySelector("#start-menu-overlay").style.display = "none";
            };
            itemsList.appendChild(row);
        });
    }

    _handleIconExecutionRoute(fileRecord) {
        if(fileRecord.path.endsWith(".js")) {
            this.kernel.process.launchFromFile(fileRecord.path).catch(err => alert(`Workflow Error: ${err.message}`));
        } else {
            this.createWindow({
                title: fileRecord.path.split("/").pop(),
                width: 350,
                height: 200,
                content: `<div style="padding:15px; font-family:sans-serif; line-height:1.5;">${fileRecord.content}</div>`
            });
        }
    }

    createWindow(options) {
        const winId = `win_session_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const wrapperNode = document.createElement("div");
        wrapperNode.className = `kernel-window ${this.activeTheme === "light" ? "light-mode-vars" : ""}`;
        wrapperNode.dataset.windowId = winId;

        Object.assign(wrapperNode.style, {
            top: `${options.y || 100}px`, left: `${options.x || 100}px`,
            width: `${options.width || 450}px`, height: `${options.height || 300}px`,
            zIndex: this.layerIndexCounter++
        });

        wrapperNode.innerHTML = `
            <div class="window-titlebar">
                <span>${options.title || "Application Container"}</span>
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

    focusWindow(winId) {
        const frame = this.windows.get(winId);
        if (frame) frame.style.zIndex = this.layerIndexCounter++;
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
        const interactiveBar = windowFrame.querySelector(".window-titlebar");
        let activeX = 0, activeY = 0, initialClientX = 0, initialClientY = 0;

        interactiveBar.onmousedown = (e) => {
            e.preventDefault();
            this.focusWindow(windowFrame.dataset.windowId);
            initialClientX = e.clientX;
            initialClientY = e.clientY;

            document.onmousemove = (moveEvent) => {
                moveEvent.preventDefault();
                activeX = initialClientX - moveEvent.clientX;
                activeY = initialClientY - moveEvent.clientY;
                initialClientX = moveEvent.clientX;
                initialClientY = moveEvent.clientY;
                windowFrame.style.top = `${windowFrame.offsetTop - activeY}px`;
                windowFrame.style.left = `${windowFrame.offsetLeft - activeX}px`;
            };

            document.onmouseup = () => { document.onmousemove = null; document.onmouseup = null; };
        };
    }

    _syncTaskbarProcessTray() {
        const container = this.root.querySelector("#taskbar-active-process-tray");
        container.innerHTML = "";
        this.windows.forEach((frameNode, uniqueId) => {
            const visualLabel = frameNode.querySelector(".window-titlebar span").innerText;
            const trayBtn = document.createElement("button");
            trayBtn.style.cssText = "background:#313244; color:#cdd6f4; border:1px solid #45475a; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;";
            trayBtn.innerText = visualLabel;
            trayBtn.onclick = () => this.focusWindow(uniqueId);
            container.appendChild(trayBtn);
        });
    }

    toggleThemeEngine() {
        this.activeTheme = this.activeTheme === "dark" ? "light" : "dark";
        this.windows.forEach(winFrame => {
            if(this.activeTheme === "light") winFrame.classList.add("light-mode-vars");
            else winFrame.classList.remove("light-mode-vars");
        });
        this.kernel.events.emit("theme-changed", { theme: this.activeTheme });
    }
}
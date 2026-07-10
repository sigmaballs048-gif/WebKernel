/**
 * WebKernel Decoupled Desktop Environment (DE) Shell
 * Location: /system/de.js
 */
export default class DesktopEnvironmentShell {
    static manifest = {
        name: "WebKernel DE Shell",
        version: "2.0.0-Modular",
        author: "SysAdmin"
    };

    init(pid) {
        this.pid = pid;
        this.rootElement = document.getElementById("desktop-root");
        
        // 1. Initialize the layout and interface
        this.renderDESystemLayout();
        
        // 2. Attach global event listeners to sync running apps with the taskbar tray
        Kernel.events.on("window-opened", () => this.syncTaskbarProcessTray());
        Kernel.events.on("window-closed", () => this.syncTaskbarProcessTray());
    }

    renderDESystemLayout() {
        // Fetch customized configurations dynamically from the registry
        this.rootElement.style.background = Kernel.settings.get("sys.wallpaper");
        
        // Render core UI wrappers: Desktop surface area, hidden start menu overlay, and taskbar panel
        this.rootElement.innerHTML = `
            <div id="desktop-grid-matrix" style="position:absolute; top:0; left:0; right:0; bottom:50px; padding:25px; display:grid; grid-template-columns: repeat(auto-fill, 95px); grid-auto-rows: 100px; gap: 15px; align-content: start; z-index: 10;"></div>
            
            <div id="start-menu-overlay" style="position: absolute; bottom: 55px; left: 15px; width: 320px; height: 420px; background: #1e1e2e; border: 1px solid #45475a; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); display: none; flex-direction: column; z-index: 999999; overflow: hidden;">
                <div style="padding:18px; background:#313244; font-weight:bold; font-size:14px; border-bottom:1px solid #45475a; color:#cdd6f4;">Applications Matrix</div>
                <div id="start-menu-payload-list" style="flex:1; overflow-y:auto;"></div>
            </div>
            
            <div id="system-taskbar-shell" style="position:absolute; bottom:0; left:0; right:0; height:50px; background:rgba(24, 24, 37, 0.85); backdrop-filter:blur(12px); border-top:1px solid #45475a; display:flex; align-items:center; padding:0 15px; gap:20px; z-index:999998;">
                <button id="taskbar-launcher-trigger" style="background:#89b4fa; border:none; color:#11111b; font-weight:bold; padding:8px 16px; border-radius: 6px; cursor:pointer; font-family:sans-serif; font-size:13px; transition: background 0.2s;">Menu</button>
                <div id="taskbar-active-process-tray" style="display:flex; gap:10px; flex:1; overflow-x:auto;"></div>
            </div>
        `;

        const launcherTrigger = this.rootElement.querySelector("#taskbar-launcher-trigger");
        const menuOverlay = this.rootElement.querySelector("#start-menu-overlay");

        // Open/Close Start Menu toggles
        launcherTrigger.onclick = (e) => {
            e.stopPropagation();
            const isOpen = menuOverlay.style.display === "flex";
            menuOverlay.style.display = isOpen ? "none" : "flex";
            if (!isOpen) this.populateLauncherApplications();
        };

        // Close start menu when clicking on the empty wallpaper
        this.rootElement.onclick = () => { menuOverlay.style.display = "none"; };
        menuOverlay.onclick = (e) => e.stopPropagation();

        // Populate items onto the screen surface area
        this.refreshDesktopIcons();
    }

    refreshDesktopIcons() {
        const targetGrid = this.rootElement.querySelector("#desktop-grid-matrix");
        if (!targetGrid) return; 
        targetGrid.innerHTML = "";
        
        // Scan the explicit VFS folder for custom user configurations and shortcuts
        Kernel.vfs.readDir("/desktop").forEach(fileRecord => {
            const iconNode = document.createElement("div");
            const isJs = fileRecord.path.endsWith(".js");
            
            iconNode.style.cssText = "display:flex; flex-direction:column; align-items:center; width:95px; padding:12px 6px; cursor:pointer; border-radius:6px; transition: background 0.15s;";
            iconNode.innerHTML = `
                <div style="font-size:2.2rem; text-align:center;">${isJs ? "⚙️" : (fileRecord.type === "directory" ? "📁" : "📄")}</div>
                <div style="text-overflow:ellipsis; overflow:hidden; white-space:nowrap; width:100%; color:#ffffff; text-shadow: 1px 2px 4px rgba(0,0,0,0.8); font-size:12px; text-align:center; margin-top:4px; font-family:sans-serif;">${fileRecord.path.split("/").pop()}</div>
            `;

            // Hover styling updates
            iconNode.onmouseenter = () => { iconNode.style.background = "rgba(255,255,255,0.1)"; };
            iconNode.onmouseleave = () => { iconNode.style.background = "transparent"; };

            // Handle execution routers on shortcut clicks
            iconNode.onclick = () => {
                if (isJs) {
                    Kernel.process.launchFromFile(fileRecord.path).catch(err => alert(err.message));
                } else {
                    Kernel.createWindow({ 
                        title: fileRecord.path.split("/").pop(), 
                        content: `<div style="padding:15px; color:#cdd6f4; background:#11111b; height:100%; font-family:monospace; white-space:pre-wrap;">${fileRecord.content}</div>` 
                    });
                }
            };
            targetGrid.appendChild(iconNode);
        });
    }

    populateLauncherApplications() {
        const itemsList = this.rootElement.querySelector("#start-menu-payload-list");
        if (!itemsList) return; 
        itemsList.innerHTML = "";

        // Query application executable shortcuts stored in the system binaries folder
        Kernel.vfs.readDir("/apps").forEach(app => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex; align-items:center; padding:12px 20px; color:#cdd6f4; cursor:pointer; border-bottom:1px solid #45475a; font-size:13px; font-family:sans-serif;";
            row.innerHTML = `<span>⚙️</span> <span style="margin-left:12px">${app.path.split("/").pop()}</span>`;
            
            row.onmouseenter = () => { row.style.background = "#313244"; };
            row.onmouseleave = () => { row.style.background = "transparent"; };
            
            row.onclick = () => {
                Kernel.process.launchFromFile(app.path).catch(err => alert(err.message));
                this.rootElement.querySelector("#start-menu-overlay").style.display = "none";
            };
            itemsList.appendChild(row);
        });
    }

    syncTaskbarProcessTray() {
        const container = this.rootElement.querySelector("#taskbar-active-process-tray");
        if (!container) return; 
        container.innerHTML = "";
        
        // Dynamically query running window components directly from the visual workspace viewport
        document.querySelectorAll(".kernel-window").forEach(frameNode => {
            const visualLabel = frameNode.querySelector(".window-titlebar span").innerText;
            const trayBtn = document.createElement("button");
            
            trayBtn.style.cssText = "background:#313244; color:#cdd6f4; border:1px solid #45475a; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold; font-family:sans-serif;";
            trayBtn.innerText = visualLabel;
            
            // Bring window focus forward when taskbar icon tag is selected
            trayBtn.onclick = () => { 
                frameNode.style.zIndex = ++window.layerIndexCounter; 
            };
            container.appendChild(trayBtn);
        });
    }

    destroy() {
        // Clean up memory bindings if system drops the DE layer execution module
        Kernel.events.off("window-opened", () => this.syncTaskbarProcessTray());
        Kernel.events.off("window-closed", () => this.syncTaskbarProcessTray());
    }
}
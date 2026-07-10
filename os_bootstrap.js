/**
 * CustomOS Architecture Layer Bootstrapper
 * Built cleanly on top of the WebKernel API ecosystem.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject our custom stylesheet into the document header dynamically
    const osStyles = document.createElement("link");
    osStyles.rel = "stylesheet";
    osStyles.href = "os_style.css";
    document.head.appendChild(osStyles);

    // 2. Listen for the kernel's initialization event hook
    window.addEventListener("load", () => {
        // We poll safely to verify that the public API proxy exposure is alive
        const bootTimer = setInterval(() => {
            if (window.Kernel) {
                clearInterval(bootTimer);
                initializeCustomOS();
            }
        }, 50);
    });
});

function initializeCustomOS() {
    console.log(`%c CustomOS initialized on top of WebKernel v${Kernel.systemVersion} `, "background: #cba6f7; color: #11111b; font-weight: bold;");

    // Override the core system wallpaper register settings seamlessly
    Kernel.settings.set("sys.wallpaper", "linear-gradient(135deg, #11111b 0%, #181825 50%, #313244 100%)");

    // Fetch workspace target node
    const root = document.getElementById("desktop-root");

    // 3. Render your custom unique OS Desktop Structure
    root.innerHTML = `
        <div id="cos-top-bar">
            <div class="bar-left">
                <button id="cos-launcher-btn">🪐 Status</button>
                <span class="cos-system-node-tag">CustomOS Network Architecture Node</span>
            </div>
            <div class="bar-right">
                <span id="cos-clock">00:00:00 PM</span>
            </div>
        </div>

        <div id="cos-app-drawer" class="hidden-drawer">
            <div class="drawer-header">Available Modules</div>
            <div class="drawer-items">
                <div class="drawer-item" onclick="launchOSApp('terminal')">⚙️ Base Terminal Shell</div>
                <div class="drawer-item" onclick="launchOSApp('explorer')">📁 Storage Explorer</div>
                <div class="drawer-item" onclick="launchOSApp('sysinfo')">📊 Kernel Monitor</div>
            </div>
        </div>

        <div id="cos-desktop-surface"></div>
    `;

    // 4. Bind interactive elements
    const launcherBtn = document.getElementById("cos-launcher-btn");
    const appDrawer = document.getElementById("cos-app-drawer");

    launcherBtn.onclick = (e) => {
        e.stopPropagation();
        appDrawer.classList.toggle("hidden-drawer");
    };

    document.onclick = () => {
        appDrawer.classList.add("hidden-drawer");
    };

    appDrawer.onclick = (e) => e.stopPropagation();

    // 5. Start our background clock daemon
    setInterval(() => {
        const time = new Date();
        document.getElementById("cos-clock").innerText = time.toLocaleTimeString();
    }, 1000);

    // Refresh layout views
    syncDesktopShortcuts();
}

/**
 * Custom OS App Router Proxies
 */
function launchOSApp(type) {
    document.getElementById("cos-app-drawer").classList.add("hidden-drawer");

    switch(type) {
        case 'terminal':
            Kernel.process.launchFromFile("/apps/terminal.js").catch(err => alert(err.message));
            break;
        case 'explorer':
            Kernel.process.launchFromFile("/apps/explorer.js").catch(err => alert(err.message));
            break;
        case 'sysinfo':
            renderSystemMonitorWindow();
            break;
    }
}

/**
 * Custom Window Interface painted directly via top level proxy boundaries
 */
function renderSystemMonitorWindow() {
    const win = Kernel.createWindow({
        title: "Kernel System Performance Monitor",
        width: 400,
        height: 250,
        x: 120,
        y: 120
    });

    win.contentElement.innerHTML = `
        <div style="padding: 20px; font-family: monospace; color: #a6e3a1; background: #11111b; height: 100%; line-height: 1.8;">
            <h3 style="color: #cba6f7; margin-bottom: 10px;">📊 Matrix Runtime Specifications</h3>
            <div>Platform Version: WebKernel ${Kernel.systemVersion}</div>
            <div>VFS Engine Node: IndexedDB Persistent Blocks</div>
            <div>Active Sandbox Processes: Isolated VFS Module Pools</div>
            <hr style="border:0; border-top:1px dashed #313244; margin:10px 0;"/>
            <button id="cos-panic-btn" style="background:#f38ba8; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">Emergency Restart</button>
        </div>
    `;

    win.contentElement.querySelector("#cos-panic-btn").onclick = () => {
        Kernel.power.shutdown();
    };
}

function syncDesktopShortcuts() {
    const surface = document.getElementById("cos-desktop-surface");
    if (!surface) return;
    surface.innerHTML = "";

    try {
        Kernel.vfs.readDir("/desktop").forEach(file => {
            const node = document.createElement("div");
            node.className = "cos-shortcut";
            node.innerHTML = `
                <div class="icon">📁</div>
                <div class="label">${file.path.split("/").pop()}</div>
            `;
            node.onclick = () => {
                if (file.path.endsWith(".js")) {
                    Kernel.process.launchFromFile(file.path);
                } else {
                    Kernel.createWindow({
                        title: file.path.split("/").pop(),
                        content: `<div style="padding:15px; background:#11111b; color:#cdd6f4; height:100%; font-family:monospace;">${file.content}</div>`
                    });
                }
            };
            surface.appendChild(node);
        });
    } catch(e) {
        console.warn("VFS stream not configured for presentation loops yet.", e);
    }
}

// Expose routing arrays to standard global viewport contexts cleanly
window.launchOSApp = launchOSApp;
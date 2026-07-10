/**
 * WebKernel - Graphical User Interface (GUI Base Engine Layer)
 */

class WebGUI {
    constructor(kernel, rootDomElement) {
        this.kernel = kernel;
        this.root = rootDomElement;
        this.windows = new Map();
        window.layerIndexCounter = 1000;
        this._applyGlobalSystemWindowStyles();
    }

    _applyGlobalSystemWindowStyles() {
        const stylesheet = document.createElement("style");
        stylesheet.textContent = `
            :root { --theme-bg: #1e1e2e; --theme-surface: #313244; --theme-text: #cdd6f4; --theme-accent: #89b4fa; --theme-border: #45475a; }
            .kernel-window { position: absolute; background-color: var(--theme-bg); border: 1px solid var(--theme-border); box-shadow: 0 12px 40px rgba(0,0,0,0.4); border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; min-width: 200px; min-height: 100px; }
            .window-titlebar { background: var(--theme-surface); color: var(--theme-text); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: move; font-weight: bold; font-size: 13px; border-bottom: 1px solid var(--theme-border); }
            .titlebar-controls { display: flex; gap: 8px; }
            .control-btn { width: 14px; height: 14px; border-radius: 50%; border: none; cursor: pointer; }
            .btn-close { background-color: #f38ba8; }
            .btn-max { background-color: #f9e2af; }
            .btn-min { background-color: #a6e3a1; }
            .window-body-content { flex: 1; overflow: auto; color: var(--theme-text); position: relative; background: #11111b; }
        `;
        document.head.appendChild(stylesheet);
    }

    // Stub method; icon mapping calculations are passed down to modular de execution layers
    refreshDesktopIcons() {}

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
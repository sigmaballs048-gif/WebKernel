/**
 * WebKernel - GUI and Window Manager
 * Handles DOM, Rendering, CSS, and visual interactions.
 */

class WebGUI {
    constructor(kernel, rootElement) {
        this.kernel = kernel;
        this.root = rootElement;
        this.windows = new Map();
        this.zIndexCounter = 100;
        
        this._setupDesktop();
        this._bindGlobalEvents();
    }

    _setupDesktop() {
        this.root.innerHTML = `
            <div id="desktop-icons" style="position: absolute; top:0; left:0; right:0; bottom: 40px; padding: 10px;"></div>
            <div id="taskbar" style="position: absolute; bottom: 0; width: 100%; height: 40px; background: rgba(0,0,0,0.8); display: flex; align-items: center; padding: 0 10px;">
                <button id="start-btn" style="padding: 5px 15px; cursor: pointer;">Menu</button>
                <div id="taskbar-apps" style="display: flex; gap: 5px; margin-left: 10px;"></div>
            </div>
        `;
    }

    _bindGlobalEvents() {
        // Handle window focus logic when clicking anywhere
        this.root.addEventListener('mousedown', (e) => {
            const winEl = e.target.closest('.os-window');
            if (winEl) this.focusWindow(winEl.dataset.winId);
        });
    }

    createWindow(options) {
        const winId = `win-${Date.now()}`;
        const winEl = document.createElement('div');
        winEl.className = 'os-window';
        winEl.dataset.winId = winId;
        
        // Base styling for windows
        Object.assign(winEl.style, {
            position: 'absolute',
            top: `${options.y || 50}px`,
            left: `${options.x || 50}px`,
            width: `${options.width || 400}px`,
            height: `${options.height || 300}px`,
            backgroundColor: '#fff',
            border: '1px solid #333',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: this.zIndexCounter++
        });

        winEl.innerHTML = `
            <div class="titlebar" style="background: #333; color: white; padding: 5px; display: flex; justify-content: space-between; cursor: move; user-select: none;">
                <span>${options.title || 'Window'}</span>
                <div>
                    <button class="win-min">-</button>
                    <button class="win-max">[]</button>
                    <button class="win-close">X</button>
                </div>
            </div>
            <div class="content" style="flex: 1; padding: 10px; overflow: auto; color: #000;">
                ${options.content || ''}
            </div>
        `;

        this._makeDraggable(winEl);
        
        winEl.querySelector('.win-close').onclick = () => this.closeWindow(winId);

        this.root.appendChild(winEl);
        this.windows.set(winId, winEl);
        this.kernel.events.emit('window-opened', { winId, title: options.title });
        
        return winId;
    }

    focusWindow(winId) {
        const win = this.windows.get(winId);
        if (win) {
            win.style.zIndex = this.zIndexCounter++;
            this.kernel.events.emit('window-focused', { winId });
        }
    }

    closeWindow(winId) {
        const win = this.windows.get(winId);
        if (win) {
            win.remove();
            this.windows.delete(winId);
            this.kernel.events.emit('window-closed', { winId });
        }
    }

    _makeDraggable(winEl) {
        const titlebar = winEl.querySelector('.titlebar');
        let isDragging = false, startX, startY, initialX, initialY;

        titlebar.onmousedown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(winEl.style.left, 10);
            initialY = parseInt(winEl.style.top, 10);
            document.onmousemove = (me) => {
                if (!isDragging) return;
                winEl.style.left = `${initialX + (me.clientX - startX)}px`;
                winEl.style.top = `${initialY + (me.clientY - startY)}px`;
            };
            document.onmouseup = () => {
                isDragging = false;
                document.onmousemove = null;
                document.onmouseup = null;
            };
        };
    }
}
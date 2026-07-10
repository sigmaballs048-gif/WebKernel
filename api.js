/**
 * WebKernel - Public API
 * Exposes a stable, documented interface for Applications to interact with the OS.
 */

function createKernelAPI(sysKernel, sysGUI) {
    // Security layer: Ensure apps only call what is explicitly exposed.
    
    const api = {
        // --- Window System ---
        createWindow: (options) => sysGUI.createWindow(options),
        closeWindow: (winId) => sysGUI.closeWindow(winId),
        
        // --- File System ---
        vfs: {
            mkdir: (path) => sysKernel.vfs.mkdir(path),
            exists: (path) => sysKernel.vfs.exists(path),
            readFile: (path) => sysKernel.vfs.readFile(path),
            writeFile: (path, content, mime) => sysKernel.vfs.writeFile(path, content, mime)
        },
        
        // --- Process Management ---
        process: {
            spawn: (manifest) => sysKernel.process.spawn(manifest),
            kill: (pid) => sysKernel.process.kill(pid)
        },

        // --- Event System ---
        events: {
            on: (event, callback) => sysKernel.events.on(event, callback),
            emit: (event, data) => sysKernel.events.emit(event, data)
        },

        // --- Settings & Registry ---
        settings: {
            get: (key) => sysKernel.settings.get(key),
            set: (key, val) => {
                sysKernel.settings.set(key, val);
                sysKernel.events.emit('settings-changed', { key, val });
            }
        },

        // --- Notifications (Wrapper around event/gui) ---
        notify: (title, message) => {
            sysKernel.events.emit('notification', { title, message });
            // Simple visual notification
            const notif = document.createElement('div');
            Object.assign(notif.style, {
                position: 'absolute', top: '10px', right: '10px', width: '250px',
                background: '#444', color: '#fff', padding: '15px', borderRadius: '5px',
                zIndex: 99999, transition: 'opacity 0.5s', opacity: 1
            });
            notif.innerHTML = `<strong>${title}</strong><br>${message}`;
            document.body.appendChild(notif);
            setTimeout(() => {
                notif.style.opacity = 0;
                setTimeout(() => notif.remove(), 500);
            }, 3000);
        }
    };

    return Object.freeze(api); // Prevent modification of API namespace
}
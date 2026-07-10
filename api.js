/**
 * WebKernel - Application API Facade Layer Configuration
 */

function createKernelAPI(coreSystemKernel, coreSystemGUI) {
    return Object.freeze({
        systemVersion: coreSystemKernel.version,
        createWindow: (displayOptions) => coreSystemGUI.createWindow(displayOptions),
        closeWindow: (targetWindowSessionId) => coreSystemGUI.closeWindow(targetWindowSessionId),
        vfs: {
            mkdir: (targetPath) => {
                const res = coreSystemKernel.vfs.mkdir(targetPath, "user");
                coreSystemGUI.refreshDesktopIcons();
                return res;
            },
            writeFile: (targetPath, rawContentData, mimeSignatureString) => {
                const res = coreSystemKernel.vfs.writeFile(targetPath, rawContentData, mimeSignatureString, "user");
                coreSystemGUI.refreshDesktopIcons();
                return res;
            },
            readFile: (targetPath) => coreSystemKernel.vfs.readFile(targetPath),
            readDir: (targetPath) => coreSystemKernel.vfs.readDir(targetPath),
            exists: (targetPath) => coreSystemKernel.vfs.exists(targetPath),
            remove: (targetPath) => {
                const res = coreSystemKernel.vfs.remove(targetPath);
                coreSystemGUI.refreshDesktopIcons();
                return res;
            }
        },
        process: {
            spawn: (manifest) => coreSystemKernel.process.spawn(manifest),
            kill: (pid) => coreSystemKernel.process.kill(pid),
            launchFromFile: async (path) => await coreSystemKernel.process.launchFromFile(path)
        },
        events: {
            on: (token, cb) => coreSystemKernel.events.on(token, cb),
            off: (token, cb) => coreSystemKernel.events.off(token, cb),
            emit: (token, payload) => coreSystemKernel.events.emit(token, payload)
        },
        settings: {
            get: (key) => coreSystemKernel.registry.get(key),
            set: (key, val) => coreSystemKernel.registry.set(key, val)
        },
        power: { shutdown: () => coreSystemKernel.shutdown() }
    });
}
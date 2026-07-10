/**
 * WebKernel - Application API Facade
 */

function createKernelAPI(coreSystemKernel, coreSystemGUI) {
    const secureKernelAPIFacade = {
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
                coreSystemKernel.events.emit("file-created", { path: targetPath });
                coreSystemGUI.refreshDesktopIcons();
                return res;
            },
            readFile: (targetPath) => coreSystemKernel.vfs.readFile(targetPath),
            readDir: (targetPath) => coreSystemKernel.vfs.readDir(targetPath),
            exists: (targetPath) => coreSystemKernel.vfs.exists(targetPath),
            remove: (targetPath) => {
                const res = coreSystemKernel.vfs.remove(targetPath);
                coreSystemKernel.events.emit("file-deleted", { path: targetPath });
                coreSystemGUI.refreshDesktopIcons();
                return res;
            }
        },

        process: {
            spawn: (applicationManifestSchema) => coreSystemKernel.process.spawn(applicationManifestSchema),
            kill: (targetActivePid) => coreSystemKernel.process.kill(targetActivePid),
            launchFromFile: async (absoluteVfsRouteDestination) => await coreSystemKernel.process.launchFromFile(absoluteVfsRouteDestination)
        },

        events: {
            on: (token, cb) => coreSystemKernel.events.on(token, cb),
            off: (token, cb) => coreSystemKernel.events.off(token, cb),
            emit: (token, payload) => coreSystemKernel.events.emit(token, payload)
        },

        settings: {
            get: (key) => coreSystemKernel.registry.get(key),
            set: (key, val) => {
                coreSystemKernel.registry.set(key, val);
                coreSystemKernel.events.emit("settings-changed", { key, value: val });
            }
        },

        power: { shutdown: () => coreSystemKernel.shutdown() }
    };

    return Object.freeze(secureKernelAPIFacade);
}
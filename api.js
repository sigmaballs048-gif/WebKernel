/**
 * WebKernel - Application API Broker Configuration
 */

function createKernelAPI(coreSystemKernel, coreSystemGUI) {
    const verifyOperationalAuthorization = (permissionNode) => true;

    const secureKernelAPIFacade = {
        systemVersion: coreSystemKernel.version,

        createWindow: (displayOptions) => {
            if(!verifyOperationalAuthorization("window.create")) throw new Error("Security Exception");
            return coreSystemGUI.createWindow(displayOptions);
        },
        closeWindow: (targetWindowSessionId) => coreSystemGUI.closeWindow(targetWindowSessionId),

        vfs: {
            mkdir: (targetPath) => {
                if(!verifyOperationalAuthorization("vfs.write")) throw new Error("Security Exception");
                return coreSystemKernel.vfs.mkdir(targetPath, "user");
            },
            writeFile: (targetPath, rawContentData, mimeSignatureString) => {
                if(!verifyOperationalAuthorization("vfs.write")) throw new Error("Security Exception");
                const stateSuccess = coreSystemKernel.vfs.writeFile(targetPath, rawContentData, mimeSignatureString, "user");
                coreSystemKernel.events.emit("file-created", { path: targetPath });
                coreSystemGUI.refreshDesktopIcons();
                return stateSuccess;
            },
            readFile: (targetPath) => {
                if(!verifyOperationalAuthorization("vfs.read")) throw new Error("Security Exception");
                return coreSystemKernel.vfs.readFile(targetPath);
            },
            readDir: (targetPath) => {
                if(!verifyOperationalAuthorization("vfs.read")) throw new Error("Security Exception");
                return coreSystemKernel.vfs.readDir(targetPath);
            },
            exists: (targetPath) => coreSystemKernel.vfs.exists(targetPath),
            remove: (targetPath) => {
                if(!verifyOperationalAuthorization("vfs.write")) throw new Error("Security Exception");
                const stateSuccess = coreSystemKernel.vfs.remove(targetPath);
                coreSystemKernel.events.emit("file-deleted", { path: targetPath });
                coreSystemGUI.refreshDesktopIcons();
                return stateSuccess;
            }
        },

        process: {
            spawn: (applicationManifestSchema) => {
                if(!verifyOperationalAuthorization("process.spawn")) throw new Error("Security Exception");
                return coreSystemKernel.process.spawn(applicationManifestSchema);
            },
            kill: (targetActivePid) => coreSystemKernel.process.kill(targetActivePid),
            launchFromFile: async (absoluteVfsRouteDestination) => await coreSystemKernel.process.launchFromFile(absoluteVfsRouteDestination)
        },

        events: {
            on: (eventSignatureToken, handlingCallbackRoutine) => coreSystemKernel.events.on(eventSignatureToken, handlingCallbackRoutine),
            off: (eventSignatureToken, handlingCallbackRoutine) => coreSystemKernel.events.off(eventSignatureToken, handlingCallbackRoutine),
            emit: (eventSignatureToken, operationalPayloadData) => coreSystemKernel.events.emit(eventSignatureToken, operationalPayloadData)
        },

        settings: {
            get: (configurationRegistryMappingKey) => coreSystemKernel.registry.get(configurationRegistryMappingKey),
            set: (configurationRegistryMappingKey, processingValuePayload) => {
                coreSystemKernel.registry.set(configurationRegistryMappingKey, processingValuePayload);
                coreSystemKernel.events.emit("settings-changed", { key: configurationRegistryMappingKey, value: processingValuePayload });
            }
        },

        notify: (uiNotificationHeader, uiNotificationBody) => {
            coreSystemKernel.events.emit("notification", { title: uiNotificationHeader, message: uiNotificationBody });
            const toast = document.createElement("div");
            Object.assign(toast.style, {
                position: "absolute", top: "20px", right: "20px", width: "280px",
                background: "var(--theme-surface, #313244)", color: "var(--theme-text, #cdd6f4)",
                padding: "16px", borderRadius: "8px", border: "1px solid var(--theme-border, #45475a)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 9999999, fontFamily: "sans-serif", fontSize: "13px"
            });
            toast.innerHTML = `<div style="font-weight:bold; margin-bottom:4px; color:var(--theme-accent, #89b4fa);">${uiNotificationHeader}</div><div>${uiNotificationBody}</div>`;
            document.body.appendChild(toast);
            setTimeout(() => { toast.remove(); }, 3500);
        },
        theme: { toggle: () => coreSystemGUI.toggleThemeEngine() },
        power: { shutdown: () => coreSystemKernel.shutdown() }
    };

    return Object.freeze(secureKernelAPIFacade);
}
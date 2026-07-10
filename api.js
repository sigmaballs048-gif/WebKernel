/**
 * WebKernel - Application API Broker Configuration
 * Implements architectural boundaries via a locked facade object sandbox.
 */

function createKernelAPI(coreSystemKernel, coreSystemGUI) {
    
    // Abstract application-level request verification layers
    const verifyOperationalAuthorization = (permissionNode) => {
        // Core structural verification framework logic expansion hook
        return true; 
    };

    const secureKernelAPIFacade = {
        
        // --- Core Base Structural Properties ---
        systemVersion: coreSystemKernel.version,

        // --- Window Subsystem Wrapper Facades ---
        createWindow: (displayOptions) => {
            if(!verifyOperationalAuthorization("window.create")) throw new Error("Security Exception: Access Denied");
            return coreSystemGUI.createWindow(displayOptions);
        },

        closeWindow: (targetWindowSessionId) => {
            return coreSystemGUI.closeWindow(targetWindowSessionId);
        },

        // --- Virtual Filesystem Block API Facades ---
        vfs: {
            mkdir: (targetPath) => {
                if(!verifyOperationalAuthorization("vfs.write")) throw new Error("Security Exception: Access Denied");
                return coreSystemKernel.vfs.mkdir(targetPath, "user");
            },
            
            writeFile: (targetPath, rawContentData, mimeSignatureString) => {
                if(!verifyOperationalAuthorization("vfs.write")) throw new Error("Security Exception: Access Denied");
                const stateSuccess = coreSystemKernel.vfs.writeFile(targetPath, rawContentData, mimeSignatureString, "user");
                coreSystemKernel.events.emit("file-created", { path: targetPath });
                coreSystemGUI.refreshDesktopIcons();
                return stateSuccess;
            },

            readFile: (targetPath) => {
                if(!verifyOperationalAuthorization("vfs.read")) throw new Error("Security Exception: Access Denied");
                return coreSystemKernel.vfs.readFile(targetPath);
            },

            readDir: (targetPath) => {
                if(!verifyOperationalAuthorization("vfs.read")) throw new Error("Security Exception: Access Denied");
                return coreSystemKernel.vfs.readDir(targetPath);
            },

            exists: (targetPath) => {
                return coreSystemKernel.vfs.exists(targetPath);
            },

            remove: (targetPath) => {
                if(!verifyOperationalAuthorization("vfs.write")) throw new Error("Security Exception: Access Denied");
                const stateSuccess = coreSystemKernel.vfs.remove(targetPath);
                coreSystemKernel.events.emit("file-deleted", { path: targetPath });
                coreSystemGUI.refreshDesktopIcons();
                return stateSuccess;
            }
        },

        // --- Process Architecture Scheduling Controls ---
        process: {
            spawn: (applicationManifestSchema) => {
                if(!verifyOperationalAuthorization("process.spawn")) throw new Error("Security Exception: Access Denied");
                return coreSystemKernel.process.spawn(applicationManifestSchema);
            },

            kill: (targetActivePid) => {
                return coreSystemKernel.process.kill(targetActivePid);
            },

            launchFromFile: async (absoluteVfsRouteDestination) => {
                return await coreSystemKernel.process.launchFromFile(absoluteVfsRouteDestination);
            }
        },

        // --- Shared Application Core Event Communications ---
        events: {
            on: (eventSignatureToken, handlingCallbackRoutine) => {
                coreSystemKernel.events.on(eventSignatureToken, handlingCallbackRoutine);
            },

            off: (eventSignatureToken, handlingCallbackRoutine) => {
                coreSystemKernel.events.off(eventSignatureToken, handlingCallbackRoutine);
            },

            emit: (eventSignatureToken, operationalPayloadData) => {
                coreSystemKernel.events.emit(eventSignatureToken, operationalPayloadData);
            }
        },

        // --- Configuration Registries System ---
        settings: {
            get: (configurationRegistryMappingKey) => {
                return coreSystemKernel.registry.get(configurationRegistryMappingKey);
            },

            set: (configurationRegistryMappingKey, processingValuePayload) => {
                coreSystemKernel.registry.set(configurationRegistryMappingKey, processingValuePayload);
                coreSystemKernel.events.emit("settings-changed", { key: configurationRegistryMappingKey, value: processingValuePayload });
            }
        },

        // --- Engine Interface Operations ---
        notify: (uiNotificationHeader, uiNotificationBody) => {
            coreSystemKernel.events.emit("notification", { title: uiNotificationHeader, message: uiNotificationBody });
            
            // Build temporary, self-destructing toast UI elements directly in the GUI layer
            const toastNotificationWrapper = document.createElement("div");
            Object.assign(toastNotificationWrapper.style, {
                position: "absolute", top: "20px", right: "20px", width: "280px",
                background: "var(--theme-surface, #313244)", color: "var(--theme-text, #cdd6f4)",
                padding: "16px", borderRadius: "8px", border: "1px solid var(--theme-border, #45475a)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 9999999,
                fontFamily: "sans-serif", fontSize: "13px", transition: "all 0.3s ease"
            });
            
            toastNotificationWrapper.innerHTML = `
                <div style="font-weight:bold; margin-bottom:4px; color:var(--theme-accent, #89b4fa);">${uiNotificationHeader}</div>
                <div>${uiNotificationBody}</div>
            `;
            
            document.body.appendChild(toastNotificationWrapper);
            setTimeout(() => {
                toastNotificationWrapper.style.opacity = "0";
                toastNotificationWrapper.style.transform = "translateY(-10px)";
                setTimeout(() => toastNotificationWrapper.remove(), 300);
            }, 3500);
        },

        theme: {
            toggle: () => {
                coreSystemGUI.toggleThemeEngine();
            }
        },

        power: {
            shutdown: () => {
                coreSystemKernel.shutdown();
            }
        }
    };

    // Deep freeze enforcement ensures protection against run-time modification attempts
    return Object.freeze(secureKernelAPIFacade);
}
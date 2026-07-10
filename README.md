Here is the complete, GitHub-ready Markdown documentation for the WebKernel API. You can save this as `API.md` or place it in your repository's Wiki.

```markdown
# WebKernel API Reference

Welcome to the WebKernel API documentation. This guide details every public method exposed by the `window.Kernel` object. Applications running on WebKernel must use these APIs to interact with the underlying system; direct modification of kernel internals is strictly prohibited and sandboxed.

---

## Table of Contents
1. [Window Management](#1-window-management)
2. [Virtual File System (VFS)](#2-virtual-file-system-vfs)
3. [Process & App Management](#3-process--app-management)
4. [Event System](#4-event-system)
5. [System Services & Registry](#5-system-services--registry)
6. [Clipboard & Storage](#6-clipboard--storage)

---

## 1. Window Management

### `Kernel.createWindow(options)`
**Purpose:** Spawns a new GUI window within the desktop environment.
**Syntax:** `Kernel.createWindow(options)`
**Arguments:**
* `options` (Object): Configuration object.
  * `title` (String): Window title.
  * `content` (String/HTML): Inner content of the window.
  * `width` (Number): Width in pixels.
  * `height` (Number): Height in pixels.
  * `x`, `y` (Number): Initial coordinates.
**Return value:** `String` - A unique Window ID (`winId`).
**Events emitted:** `window-opened`
**Permissions required:** `window.create`
**Example usage:**
```javascript
const winId = Kernel.createWindow({
    title: "Terminal",
    content: "<div id='term'></div>",
    width: 600, height: 400
});

```

**Example output:** `"win-1689023456789"`
**Errors:** Throws `TypeError` if options object is invalid.
**Notes:** Windows are automatically brought to the front on creation.

### `Kernel.closeWindow(winId)`

**Purpose:** Destroys an existing window and frees its DOM resources.
**Syntax:** `Kernel.closeWindow(winId)`
**Arguments:**

* `winId` (String): The unique identifier of the window to close.
**Return value:** `Boolean` - `true` if successful, `false` if window was not found.
**Events emitted:** `window-closed`
**Permissions required:** None (can only close owned windows unless `window.manage` permission is held).
**Example usage:**

```javascript
Kernel.closeWindow("win-1689023456789");

```

**Example output:** `true`
**Errors:** None. Fails silently if ID does not exist.

---

## 2. Virtual File System (VFS)

### `Kernel.vfs.readFile(path)`

**Purpose:** Reads the contents of a file from the virtual filesystem.
**Syntax:** `Kernel.vfs.readFile(path)`
**Arguments:**

* `path` (String): Absolute path to the file (e.g., `/documents/file.txt`).
**Return value:** `Promise<String|Blob>` - The file contents.
**Events emitted:** None.
**Permissions required:** `vfs.read`
**Example usage:**

```javascript
const text = await Kernel.vfs.readFile('/documents/notes.txt');

```

**Example output:** `"Meeting at 5 PM"`
**Errors:** Throws `FileNotFoundError` if the path does not exist.

### `Kernel.vfs.writeFile(path, content, mimeType)`

**Purpose:** Writes data to a file, creating it if it doesn't exist or overwriting it.
**Syntax:** `Kernel.vfs.writeFile(path, content, mimeType)`
**Arguments:**

* `path` (String): Absolute path.
* `content` (String|Blob): Data to write.
* `mimeType` (String): MIME type (e.g., `text/plain`).
**Return value:** `Promise<Boolean>` - `true` on success.
**Events emitted:** `file-created`, `file-modified`
**Permissions required:** `vfs.write`
**Example usage:**

```javascript
await Kernel.vfs.writeFile('/documents/notes.txt', 'Updated meeting time', 'text/plain');

```

**Example output:** `true`
**Errors:** Throws `PermissionDeniedError` if attempting to write to `/system`.

### `Kernel.vfs.mkdir(path)`

**Purpose:** Creates a new directory.
**Syntax:** `Kernel.vfs.mkdir(path)`
**Arguments:**

* `path` (String): Absolute directory path.
**Return value:** `Promise<Boolean>`
**Events emitted:** `dir-created`
**Permissions required:** `vfs.write`
**Example usage:** `await Kernel.vfs.mkdir('/documents/work');`

### `Kernel.vfs.readDir(path)`

**Purpose:** Lists the contents of a directory.
**Syntax:** `Kernel.vfs.readDir(path)`
**Arguments:**

* `path` (String): Directory path.
**Return value:** `Promise<Array<Object>>` - Array of file/folder metadata objects.
**Events emitted:** None.
**Permissions required:** `vfs.read`
**Example usage:** `const files = await Kernel.vfs.readDir('/documents');`

### `Kernel.vfs.exists(path)`

**Purpose:** Checks if a file or directory exists.
**Syntax:** `Kernel.vfs.exists(path)`
**Arguments:**

* `path` (String): Path to check.
**Return value:** `Promise<Boolean>`

*(Note: `Kernel.openFile()` and `Kernel.saveFile()` act as GUI wrappers triggering system dialogs built on top of the VFS methods.)*

---

## 3. Process & App Management

### `Kernel.process.spawn(manifest)`

**Purpose:** Registers and starts a new application process in memory.
**Syntax:** `Kernel.process.spawn(manifest)`
**Arguments:**

* `manifest` (Object): App manifest containing `name`, `version`, `entryPoint`, and `permissions`.
**Return value:** `Number` - Process ID (PID).
**Events emitted:** `process-spawned`
**Permissions required:** `process.spawn` (System level).
**Example usage:**

```javascript
const pid = Kernel.process.spawn({ name: "Calculator", permissions: [] });

```

**Example output:** `1024`
**Errors:** Throws `ManifestInvalidError` if required fields are missing.

### `Kernel.process.kill(pid)`

**Purpose:** Terminates a running process and cleans up its resources.
**Syntax:** `Kernel.process.kill(pid)`
**Arguments:**

* `pid` (Number): Process ID.
**Return value:** `Boolean` - Success status.
**Events emitted:** `process-killed`
**Permissions required:** `process.kill` (Can kill own processes without this).

### `Kernel.installApp(packageUrl)` / `Kernel.uninstallApp(appId)`

* **Purpose:** Downloads, verifies, and installs an app to `/apps/` or removes it.
* **Events:** `app-installed`, `app-uninstalled`

### `Kernel.launch(appId)`

* **Purpose:** Locates an installed app by ID and invokes `process.spawn()`.

### `Kernel.shell.execute(command)`

* **Purpose:** Executes a terminal string command via the system shell.

---

## 4. Event System

### `Kernel.events.on(event, callback)`

**Purpose:** Subscribes to a system-wide event.
**Syntax:** `Kernel.events.on(event, callback)`
**Arguments:**

* `event` (String): Event name (e.g., `theme-changed`).
* `callback` (Function): Function to execute when event fires.
**Return value:** `Void`
**Example usage:**

```javascript
Kernel.events.on('window-closed', (data) => console.log(data.winId));

```

### `Kernel.events.emit(event, data)`

**Purpose:** Broadcasts an event to the system bus.
**Syntax:** `Kernel.events.emit(event, data)`
**Arguments:**

* `event` (String): Event name.
* `data` (Object): Payload.
**Permissions required:** `events.emit`

---

## 5. System Services & Registry

### `Kernel.registerService(name, serviceInstance)`

**Purpose:** Registers a background daemon/service with the kernel.
**Syntax:** `Kernel.registerService(name, serviceInstance)`
**Arguments:**

* `name` (String): Unique service name.
* `serviceInstance` (Object): The service logic.
**Return value:** `Boolean`
**Events emitted:** `service-started`
**Permissions required:** `system.service.register`

### `Kernel.settings.get(key)` / `Kernel.settings.set(key, value)`

**Purpose:** Reads or updates the global OS registry/settings (e.g., themes, preferences).
**Events emitted:** `settings-changed`
**Example usage:**

```javascript
Kernel.settings.set('theme', 'dark');
const currentTheme = Kernel.settings.get('theme');

```

### `Kernel.notify(title, message)`

**Purpose:** Triggers a system toast notification.
**Syntax:** `Kernel.notify(title, message)`
**Arguments:**

* `title` (String): Notification header.
* `message` (String): Body content.
**Events emitted:** `notification`
**Permissions required:** `notifications.push`

---

## 6. Clipboard & Storage

### `Kernel.clipboard.copy(text)` / `Kernel.clipboard.read()`

**Purpose:** Interfaces with the OS clipboard abstraction.
**Permissions required:** `clipboard.write`, `clipboard.read`
**Events emitted:** `clipboard-copy`, `clipboard-paste`

### `Kernel.storage.set(key, val)` / `Kernel.storage.get(key)` / `Kernel.storage.remove(key)`

**Purpose:** Provides simple key-value local storage for apps (sandboxed per PID/AppID), isolated from the VFS.

```

```

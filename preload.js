const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petShell", {
  getBootstrapState: () => ipcRenderer.invoke("pet:get-bootstrap-state"),
  onStateChange: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pet:state", handler);

    return () => ipcRenderer.removeListener("pet:state", handler);
  },
  onChatMessage: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pet:chat-message", handler);

    return () => ipcRenderer.removeListener("pet:chat-message", handler);
  },
  onContextChange: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pet:context", handler);

    return () => ipcRenderer.removeListener("pet:context", handler);
  },
  onPreferenceChange: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pet:preferences", handler);

    return () => ipcRenderer.removeListener("pet:preferences", handler);
  },
  onMemoryChange: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pet:memory", handler);

    return () => ipcRenderer.removeListener("pet:memory", handler);
  },
  onUiChange: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pet:ui", handler);

    return () => ipcRenderer.removeListener("pet:ui", handler);
  },
  onMotionChange: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pet:motion", handler);

    return () => ipcRenderer.removeListener("pet:motion", handler);
  },
  onCloneMotionChange: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pet:clone-motion", handler);

    return () => ipcRenderer.removeListener("pet:clone-motion", handler);
  },
  onCloneStateChange: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("pet:clone-state", handler);

    return () => ipcRenderer.removeListener("pet:clone-state", handler);
  },
  setState: (payload) => ipcRenderer.send("pet:set-state", payload),
  sendChat: (payload) => ipcRenderer.invoke("pet:send-chat", payload),
  setClone: (payload) => ipcRenderer.invoke("pet:set-clone", payload),
  setEcoMode: (payload) => ipcRenderer.invoke("pet:set-eco-mode", payload),
  setAvatarMode: (payload) => ipcRenderer.invoke("pet:set-avatar-mode", payload),
  setDiffOpen: (payload) => ipcRenderer.invoke("pet:set-diff-open", payload),
  updatePreferences: (payload) => ipcRenderer.invoke("pet:update-preferences", payload),
  saveWorkbuddySecret: (payload) => ipcRenderer.invoke("pet:save-workbuddy-secret", payload),
  clearWorkbuddySecret: () => ipcRenderer.invoke("pet:clear-workbuddy-secret"),
  importCustomPetImage: () => ipcRenderer.invoke("pet:import-custom-pet-image"),
  clearCustomPetImage: () => ipcRenderer.invoke("pet:clear-custom-pet-image"),
  setPanels: (payload) => ipcRenderer.send("pet:set-panels", payload),
  setInteractive: (payload) => ipcRenderer.send("pet:set-interactive", payload),
  beginWindowDrag: (payload) => ipcRenderer.send("pet:begin-window-drag", payload),
  updateWindowDrag: (payload) => ipcRenderer.send("pet:update-window-drag", payload),
  endWindowDrag: (payload) => ipcRenderer.send("pet:end-window-drag", payload),
  beginChatResize: (payload) => ipcRenderer.send("pet:begin-chat-resize", payload),
  updateChatResize: (payload) => ipcRenderer.send("pet:update-chat-resize", payload),
  endChatResize: (payload) => ipcRenderer.send("pet:end-chat-resize", payload),
  approveRequest: (payload) => ipcRenderer.invoke("pet:approve-request", payload),
  rejectRequest: (payload) => ipcRenderer.invoke("pet:reject-request", payload),
  clearArtifact: () => ipcRenderer.send("pet:clear-artifact")
});

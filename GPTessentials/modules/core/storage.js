export async function getFolders() {
    const result = await chrome.storage.sync.get("folders");
    return result.folders ? JSON.parse(result.folders) : {};
}

export async function saveFolders(folders) {
    try {
        await chrome.storage.sync.set({ folders: JSON.stringify(folders) });
    } catch (error) {
        console.error('Error saving folders:', error);
    }
}

export async function getPinnedMsgs() {
    const result = await chrome.storage.sync.get("pin_msgs");
    return result.pin_msgs ? JSON.parse(result.pin_msgs) : {};
}

export async function savePinnedMsgs(pin) {
    try {
        await chrome.storage.sync.set({ pin_msgs: JSON.stringify(pin) });
    } catch (error) {
        console.error('Error saving pinned message:', error);
    }
}

import { SELECTORS, EXT_IDS, ICONS } from "../core/constants.js";
import { getFolders, saveFolders, getPinnedMsgs, savePinnedMsgs } from "../core/storage.js";
import { openChat, getChatTitleFromSidebar } from "../core/navigation.js";
import { createSpriteIcon, createActionButton } from "../core/components.js";

let chats_flag;

async function deleteFolder(folders, folderName) {
    try {
        const menu = document.getElementById(EXT_IDS.FOLDER_MENU);
        if (folders[folderName] && confirm(`⚠️ Delete folder "${folderName}"? This action cannot be undone.`)) {
            delete folders[folderName];
            await saveFolders(folders);
            renderFolders(menu);
            return true;
        } else {
            console.log(`Folder "${folderName}" not found`);
            return false;
        }
    } catch (error) {
        console.error('Error deleting folder:', error);
        return false;
    }
}

async function deleteChatFromFolder(folderName, chatId) {
    try {
        const folders = await getFolders();

        if (folders[folderName] && confirm(`⚠️ Delete chat from folder "${folderName}"? This action cannot be undone.`)) {
            folders[folderName] = folders[folderName].filter(chat => chat.id !== chatId);

            await saveFolders(folders);
            renderChatsInFolder(folderName, folders[folderName]);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting chat from folder:', error);
        return false;
    }
}

async function cleanupDeletedChat(chatId) {
    try {
        const folders = await getFolders();
        let foldersModified = false;

        for (const folderName in folders) {
            const originalLength = folders[folderName].length;
            folders[folderName] = folders[folderName].filter(chat => chat.id !== chatId);

            if (folders[folderName].length !== originalLength) {
                foldersModified = true;
                console.log(`🗑️ Removed chat ${chatId} from folder "${folderName}"`);
            }
        }

        if (foldersModified) {
            await saveFolders(folders);
        }

        const pinMsgs = await getPinnedMsgs();
        if (pinMsgs[chatId]) {
            delete pinMsgs[chatId];
            await savePinnedMsgs(pinMsgs);
            console.log(`🗑️ Removed pinned messages for chat ${chatId}`);
        }

        return true;
    } catch (error) {
        console.error('Error cleaning up deleted chat:', error);
        return false;
    }
}

function observeChatDeletions() {
    let observer;
    let currentNav = null;

    function startObserving() {
        const nav = document.querySelector(SELECTORS.SIDEBAR_NAV);
        if (!nav) return;
        if (currentNav === nav) return;

        if (observer) observer.disconnect();
        currentNav = nav;

        const existingChats = new Set();
        document.querySelectorAll(SELECTORS.CHAT_LINKS).forEach(link => {
            const href = link.getAttribute('href');
            const chatMatch = href.match(/\/c\/([a-zA-Z0-9-]+)/);
            const projectMatch = href.match(/\/g\/(g-[a-zA-Z0-9-]+)/);
            const id = chatMatch ? chatMatch[1] : (projectMatch ? projectMatch[1] : null);
            if (id) existingChats.add(id);
        });

        observer = new MutationObserver(() => {
            const currentChats = new Set();
            const chatLinks = document.querySelectorAll(SELECTORS.CHAT_LINKS);

            if (chatLinks.length === 0) {
                console.log("⚠️ Nav appears empty, skipping deletion check to prevent false positives.");
                return;
            }

            chatLinks.forEach(link => {
                const href = link.getAttribute('href');
                const chatMatch = href.match(/\/c\/([a-zA-Z0-9-]+)/);
                const projectMatch = href.match(/\/g\/(g-[a-zA-Z0-9-]+)/);
                const id = chatMatch ? chatMatch[1] : (projectMatch ? projectMatch[1] : null);
                if (id) currentChats.add(id);
            });

            let missingCount = 0;
            existingChats.forEach(id => {
                if (!currentChats.has(id)) missingCount++;
            });

            if (missingCount > 1) {
                console.log(`⚠️ Ignoring massive deletion event (${missingCount} chats missing) - likely false positive`);
                return;
            }

            existingChats.forEach(chatId => {
                if (!currentChats.has(chatId)) {
                    console.log(`🗑️ Chat potentially deleted: ${chatId}`);
                    cleanupDeletedChat(chatId);
                    existingChats.delete(chatId);
                }
            });

            currentChats.forEach(chatId => {
                if (!existingChats.has(chatId)) {
                    existingChats.add(chatId);
                }
            });
        });

        observer.observe(nav, {
            childList: true,
            subtree: true
        });

        console.log('👀 Monitoring chat deletions on new nav...');
    }

    setInterval(() => {
        const nav = document.querySelector(SELECTORS.SIDEBAR_NAV);

        if (nav && nav !== currentNav) {
            console.log('🔄 Nav element changed, reconnecting observer...');
            waitForSidebarThenObserve();
            startObserving();
        } else if (!nav && currentNav) {
            currentNav = null;
            if (observer) observer.disconnect();
        }
    }, 2000);

    startObserving();
}

async function renameFolderPrompt(oldName) {
    const menu = document.getElementById(EXT_IDS.FOLDER_MENU);
    const newName = prompt(`Rename folder "${oldName}" to:`, oldName);

    if (!newName || newName.trim() === '' || newName === oldName) {
        return false;
    }

    const folders = await getFolders();

    if (folders[newName.trim()]) {
        alert('❌ A folder with this name already exists!');
        return false;
    }

    folders[newName.trim()] = folders[oldName];
    delete folders[oldName];

    await saveFolders(folders);
    renderFolders(menu);
    return true;
}

async function renameChatInFolder(folderName, chatId, oldTitle) {
    const newTitle = prompt(`Rename chat "${oldTitle}" to:`, oldTitle);

    if (!newTitle || newTitle.trim() === '' || newTitle === oldTitle) {
        return false;
    }

    const folders = await getFolders();

    if (folders[folderName]) {
        const chat = folders[folderName].find(c => c.id === chatId);
        if (chat) {
            chat.title = newTitle.trim();
            await saveFolders(folders);
            renderChatsInFolder(folderName, folders[folderName]);
            return true;
        }
    }

    return false;
}

function moveChatToFolder(chatId, folderName, folders, chatTitle) {
    if (folders[folderName]) {
        folders[folderName] = folders[folderName].filter(c => c.id !== chatId);
    }

    folders[folderName] = folders[folderName] || [];
    folders[folderName].push({ id: chatId, title: chatTitle });
}

async function dargDropToFolder(folderElement, folderName) {
    const menu = document.getElementById(EXT_IDS.FOLDER_MENU);
    folderElement.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    folderElement.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const data = e.dataTransfer.getData("text/plain");
        const chatMatch = data.match(/\/c\/([a-zA-Z0-9-]+)/);
        const projectMatch = data.match(/\/g\/(g-[a-zA-Z0-9-]+)/);

        const chatId = chatMatch ? chatMatch[1] : (projectMatch ? projectMatch[1] : null);
        if (!chatId) return;

        const chatTitle = getChatTitleFromSidebar(chatId);

        const folders = await getFolders();
        moveChatToFolder(chatId, folderName, folders, chatTitle);

        await saveFolders(folders);
        renderFolders(menu);
    });
}

async function dargDropInFolder(folderName, chatListDiv) {
    chatListDiv.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    chatListDiv.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const data = e.dataTransfer.getData("text/plain");
        const chatMatch = data.match(/\/c\/([a-zA-Z0-9-]+)/);
        const projectMatch = data.match(/\/g\/(g-[a-zA-Z0-9-]+)/);

        const chatId = chatMatch ? chatMatch[1] : (projectMatch ? projectMatch[1] : null);
        if (!chatId) return;

        const chatTitle = getChatTitleFromSidebar(chatId);

        const folders = await getFolders();
        moveChatToFolder(chatId, folderName, folders, chatTitle);

        await saveFolders(folders);
        renderChatsInFolder(folderName, folders[folderName]);
    });
}

function createFolder(folders, folderMenu) {
    if (folderMenu.querySelector(".new-folder-input")) return;

    const input = document.createElement("input");
    input.className = "new-folder-input px-3 py-2 rounded-md w-full";

    folderMenu.appendChild(input);
    input.focus();

    input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
            const name = input.value.trim();
            if (!name || folders[name]) {
                input.classList.add("error");

                setTimeout(() => {
                    input.classList.remove("error");
                }, 500);
                return;
            }

            folders[name] = [];
            await saveFolders(folders);
            renderFolders(folderMenu);
        }

        if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            if (input.parentNode) input.remove();
        }
    });

    input.addEventListener("blur", () => input.remove());
}

async function renderFolders(folderMenu) {
    chats_flag = false;
    const folders = await getFolders();

    folderMenu.innerHTML = `<strong>🗂️ Folders</strong><hr style="margin: 6px 0;" />`;

    const newFolderBtn = document.createElement("span");
    newFolderBtn.className = "new-folder-btn";
    newFolderBtn.title = "New folder";
    newFolderBtn.innerHTML = ICONS.INLINE_NEW_FOLDER;

    if (Object.keys(folders).length === 0) {
        folderMenu.innerHTML += "<em>No folders yet</em>";
    }

    newFolderBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        createFolder(folders, folderMenu);
    };

    folderMenu.prepend(newFolderBtn);

    Object.entries(folders).forEach(([name, chats]) => {
        const folderEl = document.createElement("a");
        folderEl.innerText = "📁 " + name;
        folderEl.className = 'group __menu-item hoverable gap-1.5 folder-item';

        const deleteFolderBtn = createActionButton({
            title: "Delete folder",
            className: 'folder-action-btn folder-delete-btn',
            iconString: createSpriteIcon(ICONS.SPRITE_DELETE),
            onClick: () => deleteFolder(folders, name)
        });

        const renameFolderBtn = createActionButton({
            title: "Rename folder",
            className: 'folder-action-btn folder-rename-btn',
            iconString: createSpriteIcon(ICONS.SPRITE_RENAME),
            onClick: () => renameFolderPrompt(name)
        });

        folderEl.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            renameFolderPrompt(name);
        };

        folderEl.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            renderChatsInFolder(name, chats)
        };

        dargDropToFolder(folderEl, name);

        folderEl.appendChild(deleteFolderBtn);
        folderEl.appendChild(renameFolderBtn);
        folderMenu.appendChild(folderEl);
    });
}

async function renderChatsInFolder(folderName, chats) {
    let folderMenu = document.getElementById(EXT_IDS.FOLDER_MENU);
    chats_flag = true;
    folderMenu.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>📂 ${folderName}</strong>
      </div>
      <hr style="margin:6px 0;" />
    `;

    const chatListDiv = document.createElement("div");
    chatListDiv.className = "chat-list-container";

    const backBtn = document.createElement("button");
    backBtn.className = "folder-back-btn";
    backBtn.textContent = "🔙 Back";

    if (chats.length === 0) {
        chatListDiv.innerHTML = "<em>No chats in this folder</em>";
    }

    backBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        renderFolders(folderMenu);
    };

    folderMenu.querySelector('div').appendChild(backBtn);

    chats.forEach(chat => {
        const link = document.createElement("a");

        const isProject = chat.id.startsWith('g-');
        const chatUrl = isProject ? `/g/${chat.id}/project` : `/c/${chat.id}`;

        const emoji = isProject ? "🗃️" : "💬";
        link.innerText = emoji + " " + (chat.title || "(Untitled)");
        link.className = 'group __menu-item hoverable gap-1.5 folder-chat-item';

        const deleteChatBtn = createActionButton({
            title: "Remove chat",
            className: 'folder-action-btn folder-delete-btn',
            iconString: createSpriteIcon(ICONS.SPRITE_DELETE),
            onClick: () => deleteChatFromFolder(folderName, chat.id)
        });

        const renameChatBtn = createActionButton({
            title: "Rename chat",
            className: 'folder-action-btn folder-rename-btn',
            iconString: createSpriteIcon(ICONS.SPRITE_RENAME),
            onClick: () => renameChatInFolder(folderName, chat.id, chat.title || "(Untitled)")
        });

        link.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            renameChatInFolder(folderName, chat.id, chat.title || "(Untitled)");
        };

        link.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openChat(chatUrl);
        });

        link.appendChild(deleteChatBtn);
        link.appendChild(renameChatBtn);
        chatListDiv.appendChild(link);
    });

    const oldChatList = folderMenu.querySelector(".chat-list-container");
    if (oldChatList) oldChatList.remove();
    folderMenu.appendChild(chatListDiv);

    if (chats_flag) {
        await dargDropInFolder(folderName, chatListDiv);
    }
}

async function openFolderMenu() {
    const existing = document.getElementById(EXT_IDS.FOLDER_MENU);
    if (existing) {
        existing.remove();
        return;
    }

    const folderMenu = document.createElement("div");
    folderMenu.id = EXT_IDS.FOLDER_MENU;
    folderMenu.className = "folder-menu-container";
    document.body.appendChild(folderMenu);

    await renderFolders(folderMenu);
    folderMenu.style.display = "block";

    let btn = document.getElementById(EXT_IDS.FOLDER_BTN);
    if (btn && btn.offsetWidth === 0) {
        let tinyBtn = document.getElementById(EXT_IDS.FOLDER_BTN + '-tiny');
        if (tinyBtn) btn = tinyBtn;
    }

    if (btn) {
        const btnRect = btn.getBoundingClientRect();
        const menuWidth = folderMenu.offsetWidth;
        const gap = 6;

        const sidebar = btn.closest('#stage-slideover-sidebar')
            || btn.closest('#stage-sidebar-tiny-bar');
        const sidebarRight = sidebar ? sidebar.getBoundingClientRect().right : btnRect.right;

        let left = sidebarRight + gap;
        let top = btnRect.top;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const menuHeight = folderMenu.offsetHeight;

        if (left + menuWidth > vw - 8) left = sidebarRight - menuWidth - gap;
        if (left < 8) left = 8;
        if (top + menuHeight > vh - 8) top = vh - menuHeight - 8;

        folderMenu.style.top = top + "px";
        folderMenu.style.left = left + "px";
    }

    setTimeout(() => {
        const closeHandler = (e) => {
            const menu = document.getElementById(EXT_IDS.FOLDER_MENU);
            if (!menu) {
                document.removeEventListener('click', closeHandler);
                return;
            }
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
}

function createFolderButton() {
    if (document.getElementById(EXT_IDS.FOLDER_BTN)) return;

    const aside = document.querySelector(SELECTORS.SIDEBAR_ASIDE_LAST);
    if (!aside) return;

    const shortAside = document.querySelector(SELECTORS.SIDEBAR_SHORT_ASIDE);
    if (!shortAside) return;

    const link = document.createElement('a');
    link.id = EXT_IDS.FOLDER_BTN;
    link.href = '#';
    link.className = 'group __menu-item hoverable gap-1.5';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'flex items-center justify-center icon';
    iconWrap.innerHTML = ICONS.INLINE_FOLDER;

    const labelWrap = document.createElement('div');
    labelWrap.className = 'flex min-w-0 grow items-center gap-2.5';

    const label = document.createElement('div');
    label.className = 'truncate';
    label.textContent = 'Folders';

    labelWrap.appendChild(label);
    link.appendChild(iconWrap);
    link.appendChild(labelWrap);

    const iconContainer = document.createElement('a');
    iconContainer.id = EXT_IDS.FOLDER_BTN + '-tiny';
    iconContainer.className = 'group __menu-item hoverable gap-1.5';

    const folderIcon = document.createElement('div');
    folderIcon.className = 'flex items-center justify-center icon';
    folderIcon.innerHTML = ICONS.INLINE_FOLDER;

    iconContainer.style.cursor = "pointer";
    iconContainer.title = "Folders";
    iconContainer.appendChild(folderIcon);

    link.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openFolderMenu();
    };

    iconContainer.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openFolderMenu();
    };

    aside.appendChild(link);
    shortAside.insertBefore(iconContainer, shortAside.lastElementChild);
}

let sidebarObserver = null;

function observeSidebar() {
    const sidebarContainer = document.querySelector('#stage-slideover-sidebar');
    if (!sidebarContainer) {
        console.warn('Sidebar container not found');
        return;
    }

    if (sidebarObserver) {
        sidebarObserver.disconnect();
    }

    let debounceTimer = null;

    sidebarObserver = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            createFolderButton();
        }, 200);
    });

    sidebarObserver.observe(sidebarContainer, {
        childList: true,
        subtree: true,
    });

    createFolderButton();
}

function waitForSidebarThenObserve() {
    const interval = setInterval(() => {
        const sidebarContainer = document.querySelector('#stage-slideover-sidebar');
        if (sidebarContainer) {
            clearInterval(interval);
            observeSidebar();
        }
    }, 300);
}

export function initFolders() {
    setTimeout(observeChatDeletions, 1500);
    setTimeout(waitForSidebarThenObserve, 700);
}

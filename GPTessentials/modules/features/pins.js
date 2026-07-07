import { SELECTORS, EXT_IDS, ICONS } from "../core/constants.js";
import { getPinnedMsgs, savePinnedMsgs } from "../core/storage.js";
import { getCurrentChatId, openChat, getChatTitleFromSidebar } from "../core/navigation.js";
import { observeNewMessageThenSendButton } from "../core/observers.js";
import { createSpriteIcon, createActionButton } from "../core/components.js";

async function resetSelectedPins(selectedChatIds) {
    if (selectedChatIds.length === 0) {
        return false;
    }

    if (!confirm(`⚠️ Reset pinned messages for ${selectedChatIds.length} chat(s)? This action cannot be undone.`)) {
        return false;
    }

    try {
        const pin_msgs = await getPinnedMsgs();

        selectedChatIds.forEach(chatId => {
            delete pin_msgs[chatId];
        });

        await savePinnedMsgs(pin_msgs);

        const pinnedMsgMenu = document.getElementById(EXT_IDS.PINNED_MENU);
        if (pinnedMsgMenu) {
            renderPinnedMsg(pinnedMsgMenu);
        }

        return true;
    } catch (error) {
        console.error('Error resetting selected pinned messages:', error);
        alert('❌ Error resetting pinned messages');
        return false;
    }
}

async function renderSelectivePinResetMenu(menuContainer) {
    const pin_msgs = await getPinnedMsgs();
    const chatIds = Object.keys(pin_msgs).filter(chatId => pin_msgs[chatId] && pin_msgs[chatId].length > 0);

    menuContainer.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong style="font-size: 16px;">🗑️ Select Chats to Reset Pins</strong>
      </div>
      <hr style="margin: 0 0 12px 0;" />
    `;

    if (chatIds.length === 0) {
        menuContainer.innerHTML += '<em style="display: block; text-align: center; padding: 20px;">No chats with pinned messages</em>';
    } else {
        const chatListDiv = document.createElement('div');
        chatListDiv.className = 'selective-reset-chat-list';

        chatIds.forEach(chatId => {
            const chatTitle = getChatTitleFromSidebar(chatId);
            const pinCount = pin_msgs[chatId].length;

            const chatItem = document.createElement('div');
            chatItem.className = 'selective-reset-chat-item reset-chat-item';
            chatItem.dataset.chatId = chatId;
            chatItem.dataset.selected = 'false';

            const chatInfo = document.createElement('div');
            chatInfo.className = 'reset-chat-info';

            const chatNameSpan = document.createElement('span');
            chatNameSpan.textContent = `💬 ${chatTitle}`;

            const pinCountSpan = document.createElement('span');
            pinCountSpan.className = 'reset-pin-count';
            pinCountSpan.textContent = `${pinCount} pin${pinCount !== 1 ? 's' : ''}`;

            chatInfo.appendChild(chatNameSpan);
            chatInfo.appendChild(pinCountSpan);

            const openChatBtn = createActionButton({
                title: 'Open chat',
                className: 'reset-chat-open-btn',
                iconString: ICONS.INLINE_OPEN,
                onClick: (e) => {
                    const isProject = chatId.startsWith('g-');
                    const chatUrl = isProject ? `/g/${chatId}/project` : `/c/${chatId}`;
                    openChat(chatUrl);
                }
            });

            chatItem.appendChild(chatInfo);
            chatItem.appendChild(openChatBtn);

            chatItem.addEventListener('click', () => {
                if (chatItem.dataset.selected === 'false') {
                    chatItem.dataset.selected = 'true';
                } else {
                    chatItem.dataset.selected = 'false';
                }
            });

            chatListDiv.appendChild(chatItem);
        });

        menuContainer.appendChild(chatListDiv);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      `;

        const selectAllBtn = document.createElement('button');
        selectAllBtn.textContent = 'Select All';
        selectAllBtn.className = 'modal-action-btn modal-btn-secondary';
        selectAllBtn.onclick = () => {
            const chatItems = menuContainer.querySelectorAll('.selective-reset-chat-item');
            const allSelected = Array.from(chatItems).every(item => item.dataset.selected === 'true');

            chatItems.forEach(item => {
                if (allSelected) {
                    item.dataset.selected = 'false';
                } else {
                    item.dataset.selected = 'true';
                }
            });
            selectAllBtn.textContent = allSelected ? 'Select All' : 'Deselect All';
        };

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Reset Selected';
        confirmBtn.className = 'modal-action-btn modal-btn-primary';
        confirmBtn.onclick = async () => {
            const selectedItems = menuContainer.querySelectorAll('.selective-reset-chat-item[data-selected="true"]');
            const selectedIds = Array.from(selectedItems).map(item => item.dataset.chatId);

            if (selectedIds.length === 0) {
                alert('⚠️ Please select at least one chat');
                return;
            }

            const success = await resetSelectedPins(selectedIds);

            if (success) {
                selectedItems.forEach(item => item.remove());

                const remainingItems = menuContainer.querySelectorAll('.selective-reset-chat-item');
                if (remainingItems.length === 0) {
                    menuContainer.innerHTML = `
              <div style="margin-bottom: 12px;">
                <strong style="font-size: 16px;">🗑️ Select Chats to Reset Pins</strong>
              </div>
              <hr style="margin: 0 0 12px 0; border-color: #666;" />
              <em style="display: block; text-align: center; padding: 20px;">No chats with pinned messages</em>
            `;
                }
            }
        };

        buttonContainer.appendChild(selectAllBtn);
        buttonContainer.appendChild(confirmBtn);
        menuContainer.appendChild(buttonContainer);
    }
}

async function openSelectivePinResetMenu() {
    const existing = document.getElementById(EXT_IDS.SELECTIVE_RESET_MENU);
    if (existing) {
        existing.remove();
    }

    const menuContainer = document.createElement('div');
    menuContainer.id = EXT_IDS.SELECTIVE_RESET_MENU;
    menuContainer.className = 'selective-reset-modal';

    document.body.appendChild(menuContainer);

    await renderSelectivePinResetMenu(menuContainer);
    menuContainer.style.display = 'block';

    const closeHandler = (e) => {
        if (!menuContainer.contains(e.target)) {
            menuContainer.remove();
            document.removeEventListener('click', closeHandler);
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closeHandler);
    }, 100);
}

function scrollToMessage(index) {
    const messages = Array.from(document.querySelectorAll(SELECTORS.TURN_MESSAGE));
    const targetMessage = messages[index];

    if (!targetMessage) return;

    targetMessage.scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(() => {
        targetMessage.style.transition = "background-color 0.5s";
        targetMessage.style.backgroundColor = "var(--main-surface-tertiary)";
    }, 1000);

    setTimeout(() => {
        const rect = targetMessage.getBoundingClientRect();
        const vh = window.innerHeight;
        const headerOffset = 60;

        const isOffTop = rect.bottom < headerOffset;
        const isOffBottom = rect.top > vh - 50;

        if (isOffTop || isOffBottom) {
            targetMessage.scrollIntoView({ behavior: "instant", block: "start" });
        }

        setTimeout(() => {
            setTimeout(() => {
                targetMessage.style.backgroundColor = "";
            }, 1500);
        }, 200);
    }, 1500);
}

async function pinMessage(clickedMessage) {
    const messages = Array.from(document.querySelectorAll(SELECTORS.TURN_MESSAGE));
    const index = messages.indexOf(clickedMessage);
    const time = Date.now();

    const pin_msgs = await getPinnedMsgs();
    const chatId = getCurrentChatId();
    if (!chatId || index === -1) return;

    pin_msgs[chatId] = pin_msgs[chatId] || [];

    if (!pin_msgs[chatId].some(p => p.index === index)) {
        pin_msgs[chatId].push({ index, date: time });
        await savePinnedMsgs(pin_msgs);
        return true;
    }
    return false;
}

async function unpinMessage(msg_index, chatId) {
    try {
        const pinnedMsgMenu = document.getElementById(EXT_IDS.PINNED_MENU);
        const pinMsgs = await getPinnedMsgs();

        if (pinMsgs[chatId] && confirm(`⚠️ Unpin message? This action cannot be undone.`)) {
            pinMsgs[chatId] = pinMsgs[chatId].filter(message => message.index !== msg_index);

            if (pinMsgs[chatId].length === 0) {
                delete pinMsgs[chatId];
            }

            await savePinnedMsgs(pinMsgs);
            renderPinnedMsg(pinnedMsgMenu);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting pinned message:', error);
        return false;
    }
}

async function renamePinnedMessage(msg_index, chatId, currentTitle) {
    const newTitle = prompt("Rename pinned message:", currentTitle);
    if (newTitle === null) return;

    try {
        const pinMsgs = await getPinnedMsgs();

        if (pinMsgs[chatId]) {
            const message = pinMsgs[chatId].find(msg => msg.index === msg_index);
            if (message) {
                if (newTitle.trim() === "") {
                    delete message.title;
                } else {
                    message.title = newTitle.trim();
                }
                await savePinnedMsgs(pinMsgs);

                const pinnedMsgMenu = document.getElementById(EXT_IDS.PINNED_MENU);
                if (pinnedMsgMenu) {
                    renderPinnedMsg(pinnedMsgMenu);
                }
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error renaming pinned message:', error);
        return false;
    }
}

async function openPinnedMsgMenu() {
    const existing = document.getElementById(EXT_IDS.PINNED_MENU);
    if (existing) {
        existing.remove();
        return;
    }

    const pinnedMsgMenu = document.createElement("div");
    pinnedMsgMenu.id = EXT_IDS.PINNED_MENU;
    pinnedMsgMenu.className = "pin-menu-container";
    document.body.appendChild(pinnedMsgMenu);

    await renderPinnedMsg(pinnedMsgMenu);
    pinnedMsgMenu.style.display = "block";

    const btn = document.getElementById(EXT_IDS.PINNED_BTN);
    if (btn) {
        const btnRect = btn.getBoundingClientRect();
        const menuWidth = pinnedMsgMenu.offsetWidth;
        const gap = 6;

        let left = btnRect.left + (btnRect.width / 2) - (menuWidth / 2);
        let top = btnRect.bottom + gap;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const menuHeight = pinnedMsgMenu.offsetHeight;

        if (left + menuWidth > vw - 8) left = vw - menuWidth - 8;
        if (left < 8) left = 8;
        if (top + menuHeight > vh - 8) top = btnRect.top - menuHeight - gap;

        pinnedMsgMenu.style.top = top + "px";
        pinnedMsgMenu.style.left = left + "px";
        pinnedMsgMenu.style.right = "auto";
    }

    setTimeout(() => {
        const closeHandler = (e) => {
            const menu = document.getElementById(EXT_IDS.PINNED_MENU);
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

async function renderPinnedMsg(pinnedMsgMenu) {
    const pin_msgs = await getPinnedMsgs();
    const chatId = getCurrentChatId();
    const pinnedMessages = pin_msgs[chatId];

    pinnedMsgMenu.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>📌 Pinned messages</strong>
        <button id="${EXT_IDS.RESET_ALL_PINS_BTN}" title="Reset all pinned messages" class="pin-reset-btn">🗑️ Reset All</button>
      </div>
      <hr style="margin: 6px 0;" />
    `;

    if (!pinnedMessages || pinnedMessages.length === 0) {
        pinnedMsgMenu.innerHTML += "<em>No pinned messages yet</em>";
    }
    else {
        pinnedMessages.forEach(pin => {
            const pinnedEl = document.createElement("a");
            const date = new Date(pin.date).toLocaleString();
            const displayTitle = "📄 " + (pin.title || date);
            pinnedEl.innerText = displayTitle;
            pinnedEl.className = 'group __menu-item hoverable gap-1.5 pin-menu-item';

            const unpinMsgBtn = createActionButton({
                title: "Unpin message",
                className: 'pin-item-action-btn pin-item-unpin-btn',
                iconString: createSpriteIcon(ICONS.SPRITE_DELETE),
                onClick: () => unpinMessage(pin.index, chatId)
            });

            const renameMsgBtn = createActionButton({
                title: "Rename pinned message",
                className: 'pin-item-action-btn pin-item-rename-btn',
                iconString: createSpriteIcon(ICONS.SPRITE_RENAME),
                onClick: () => renamePinnedMessage(pin.index, chatId, displayTitle.slice(2))
            });

            pinnedEl.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollToMessage(pin.index);
            };

            pinnedEl.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                renamePinnedMessage(pin.index, chatId, displayTitle.slice(2));
            };

            pinnedEl.appendChild(unpinMsgBtn);
            pinnedEl.appendChild(renameMsgBtn);
            pinnedMsgMenu.appendChild(pinnedEl);
        });
    }

    const resetBtn = document.getElementById(EXT_IDS.RESET_ALL_PINS_BTN);
    if (resetBtn) {
        resetBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openSelectivePinResetMenu();
        };
    }
}

export function showMenuButton() {
    if (document.getElementById(EXT_IDS.PINNED_BTN)) return;

    const topRight = document.querySelector(SELECTORS.CONVERSATION_HEADER_ACTIONS) || document.getElementById('conversation-header-actions');

    const pinMenuBtn = document.createElement("button");
    pinMenuBtn.className = "btn relative btn-ghost text-token-text-primary pin-header-btn";
    pinMenuBtn.id = EXT_IDS.PINNED_BTN;
    pinMenuBtn.title = "Pinned messages";

    pinMenuBtn.innerHTML = createSpriteIcon(ICONS.SPRITE_PIN);

    pinMenuBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        openPinnedMsgMenu();
    }
    // Sometime the selector doesn't match if openai loads strangely, check topRight
    if (topRight) {
        topRight.prepend(pinMenuBtn);
    }
}

let messageObserverCleanup = null;

function addPinButtonsToMessages() {
    const actionBars = Array.from(
        document.querySelectorAll(SELECTORS.ACTION_BAR)
    ).map(btn => btn.closest('[role="group"]'));

    console.log(`Found ${actionBars.length} action bars (user + assistant messages)`);

    let addedButtons = 0;

    actionBars.forEach((bar, index) => {
        if (bar.querySelector('.pin-extension-button')) {
            return;
        }

        const pinBtn = document.createElement("button");
        pinBtn.id = `pin-button-${index}`;
        pinBtn.className = "pin-extension-button message-pin-button";
        pinBtn.title = "Pin message";

        pinBtn.innerHTML = createSpriteIcon(ICONS.SPRITE_PIN);

        pinBtn.onclick = async () => {
            const messageContainer = bar.closest(SELECTORS.TURN_MESSAGE);
            const wasPinned = await pinMessage(messageContainer);
            if (wasPinned) {
                pinBtn.innerHTML = createSpriteIcon(ICONS.SPRITE_PIN_SOLID);
                setTimeout(() => pinBtn.innerHTML = createSpriteIcon(ICONS.SPRITE_PIN), 1500);
            }
        };

        try {
            if (bar.children.length > 1) {
                bar.insertBefore(pinBtn, bar.children[1]);
            } else {
                bar.appendChild(pinBtn);
            }
            addedButtons++;
        } catch (e) {
            console.log(`Failed to add button to bar ${index}:`, e);
        }
    });

    console.log(`Added pin buttons to ${addedButtons} out of ${actionBars.length} messages`);
    return addedButtons;
}

export function setup() {
    setTimeout(showMenuButton, 1500);
}

export function onChatChange() {
    if (messageObserverCleanup) {
        messageObserverCleanup();
        console.log("🧹 Cleaned up old message observer");
    }

    showMenuButton();
    addPinButtonsToMessages();
    messageObserverCleanup = observeNewMessageThenSendButton(addPinButtonsToMessages);
}
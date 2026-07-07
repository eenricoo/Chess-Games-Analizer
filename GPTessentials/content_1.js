(function () {
  //📌 PIN MESSAGES
  function getCurrentChatId() {
    // Supports:
    // - /c/<id>
    // - /g/<group>/c/<id>
    // - /g/g-<gpt-id>/project (PROJECTS)
    const chatMatch = location.href.match(/\/(?:g\/[^\/]+\/)?c\/([^\/?#]+)/);
    if (chatMatch) return chatMatch[1];

    const projectMatch = location.href.match(/\/g\/(g-[a-zA-Z0-9-]+)\/project/);
    return projectMatch ? projectMatch[1] : null;
  }


  function isChatPage() {
    return /^(?:\/g\/[^\/]+)?\/c\//.test(location.pathname);
  }



  async function getPinnedMsgs() {
    const result = await chrome.storage.sync.get("pin_msgs");
    return result.pin_msgs ? JSON.parse(result.pin_msgs) : {};
  }


  async function savePinnedMsgs(pin) {
    try {
      await chrome.storage.sync.set({ pin_msgs: JSON.stringify(pin) });
    } catch (error) {
      console.error('Error saving pinned message:', error);
    }
  }


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

      const pinnedMsgMenu = document.getElementById("pinned-messages-menu");
      if (pinnedMsgMenu) {
        renderPinnedMsg(pinnedMsgMenu);
      }

      // alert(`✅ Pinned messages have been reset for ${selectedChatIds.length} chat(s)!`);
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

        const openChatBtn = document.createElement('button');
        openChatBtn.title = 'Open chat';
        openChatBtn.className = 'reset-chat-open-btn';
        openChatBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        `;



        openChatBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isProject = chatId.startsWith('g-');
          const chatUrl = isProject ? `/g/${chatId}/project` : `/c/${chatId}`;
          openChat(chatUrl);
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

      // Add buttons at the bottom
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
    // Remove existing menu if any
    const existing = document.getElementById('selective-pin-reset-menu');
    if (existing) {
      existing.remove();
    }

    // Create the menu container
    const menuContainer = document.createElement('div');
    menuContainer.id = 'selective-pin-reset-menu';
    menuContainer.className = 'selective-reset-modal';

    document.body.appendChild(menuContainer);

    // Pre-render before showing
    await renderSelectivePinResetMenu(menuContainer);
    menuContainer.style.display = 'block';

    // Close menu when clicking outside
    const closeHandler = (e) => {
      if (!menuContainer.contains(e.target)) {
        menuContainer.remove();
        document.removeEventListener('click', closeHandler);
      }
    };

    // Add listener after a brief delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 100);
  }


  function scrollToMessage(index) {
    const messages = Array.from(document.querySelectorAll(
      '#thread section[data-testid^="conversation-turn-"]'
    ));
    const targetMessage = messages[index];

    if (!targetMessage) return;

    // Single smooth scroll
    targetMessage.scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(() => {
      targetMessage.style.transition = "background-color 0.5s";
      targetMessage.style.backgroundColor = "var(--main-surface-tertiary)";
    }, 1000);

    // Wait for scroll animation + content loading, then verify and correct if needed
    setTimeout(() => {
      const rect = targetMessage.getBoundingClientRect();
      const vh = window.innerHeight;
      const headerOffset = 60; // Adjust this if you have a sticky top nav bar

      // Check if the element is out of bounds
      // 1. Pushed off the top (rect.bottom < headerOffset)
      // 2. Pushed off the bottom (rect.top > vh)
      const isOffTop = rect.bottom < headerOffset;
      const isOffBottom = rect.top > vh - 50; // 50px buffer

      if (isOffTop || isOffBottom) {
        targetMessage.scrollIntoView({ behavior: "instant", block: "start" });
      }

      // Highlight after correction
      setTimeout(() => {
        setTimeout(() => {
          targetMessage.style.backgroundColor = "";
        }, 1500);
      }, 200);
    }, 1500); // Wait for smooth scroll to complete + content to load
  }


  async function pinMessage(clickedMessage) {
    const messages = Array.from(document.querySelectorAll(
      '#thread section[data-testid^="conversation-turn-"]'
    ));
    const index = messages.indexOf(clickedMessage);
    const time = Date.now();

    const pin_msgs = await getPinnedMsgs();
    const chatId = getCurrentChatId()
    if (!chatId || index === -1) return;

    pin_msgs[chatId] = pin_msgs[chatId] || [];

    if (!pin_msgs[chatId].some(p => p.index === index)) {
      pin_msgs[chatId].push({ index, date: time });
      await savePinnedMsgs(pin_msgs);
      return true; // Actually pinned
    }
    return false; // Already pinned
  }


  async function unpinMessage(msg_index, chatId) {
    try {
      const pinnedMsgMenu = document.getElementById("pinned-messages-menu");
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

          const pinnedMsgMenu = document.getElementById("pinned-messages-menu");
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


  async function togglePinnedMsgMenu(pinnedMsgMenu) {
    if (!pinnedMsgMenu) {
      console.error('❌ togglePinnedMsgMenu called with null menu');
      return;
    }

    if (pinnedMsgMenu.style.display === "block") {
      pinnedMsgMenu.style.display = "none";
    }
    else {
      // Pre-render before showing
      await renderPinnedMsg(pinnedMsgMenu);
      pinnedMsgMenu.style.display = "block";

      // Position dynamically below the pin button, centered
      const btn = document.getElementById("pinned-msg-menu-btn");
      if (btn) {
        const btnRect = btn.getBoundingClientRect();
        const menuWidth = pinnedMsgMenu.offsetWidth;
        const gap = 6; // px gap between button and menu

        // Center the menu horizontally relative to the button
        let left = btnRect.left + (btnRect.width / 2) - (menuWidth / 2);
        let top = btnRect.bottom + gap;

        // Clamp to viewport edges so the menu never gets clipped
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
    }
  }


  async function renderPinnedMsg(pinnedMsgMenu) {
    const pin_msgs = await getPinnedMsgs();
    const chatId = getCurrentChatId();
    const pinnedMessages = pin_msgs[chatId];
    // console.log(pinnedMessages);

    pinnedMsgMenu.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>📌 Pinned messages</strong>
        <button id="reset-all-pins-btn" title="Reset all pinned messages" class="pin-reset-btn">🗑️ Reset All</button>
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


        const unpinMsgBtn = document.createElement("button");
        unpinMsgBtn.title = "Unpin message";
        unpinMsgBtn.className = 'pin-item-action-btn pin-item-unpin-btn';
        unpinMsgBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg#3ee541" fill="currentColor"></use></svg>`;

        const renameMsgBtn = document.createElement("button");
        renameMsgBtn.title = "Rename pinned message";
        renameMsgBtn.className = 'pin-item-action-btn pin-item-rename-btn';
        renameMsgBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg#6d87e1" fill="currentColor"></use></svg>`;




        unpinMsgBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          unpinMessage(pin.index, chatId);
        };

        renameMsgBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          renamePinnedMessage(pin.index, chatId, displayTitle.slice(2));
        };

        pinnedEl.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          scrollToMessage(pin.index);
        };

        // Right-click to rename
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

    // Add event listener for reset button
    const resetBtn = document.getElementById('reset-all-pins-btn');
    if (resetBtn) {
      resetBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSelectivePinResetMenu();
      };
    }
  }


  let pinMenuListenerAttached = false;

  function createPinnedMsgMenu() {
    if (document.getElementById("pinned-messages-menu")) return;

    const pinnedMsgMenu = document.createElement("div");
    pinnedMsgMenu.id = "pinned-messages-menu";
    pinnedMsgMenu.className = "pin-menu-container";

    // Close menu when clicking outside
    if (!pinMenuListenerAttached) {
      document.addEventListener("click", function (e) {
        const menu = document.getElementById("pinned-messages-menu");
        if (menu && menu.style.display === "block" && !menu.contains(e.target) && !e.target.closest('#pinned-msg-menu-btn')) {
          menu.style.display = "none";
        }
      });
      pinMenuListenerAttached = true;
    }

    document.body.appendChild(pinnedMsgMenu);
  }


  function createPinnedMsgBtn() {
    if (document.getElementById("pinned-msg-menu-btn")) return;

    const topRight = document.getElementById("conversation-header-actions");

    const pinMenuBtn = document.createElement("button");
    pinMenuBtn.className = "btn relative btn-ghost text-token-text-primary pin-header-btn";
    pinMenuBtn.id = "pinned-msg-menu-btn";
    pinMenuBtn.title = "Pinned messages";

    pinMenuBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg#23d2ff" fill="currentColor"></use></svg>
    `;

    pinMenuBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Get fresh reference to menu (don't use captured reference)
      let menu = document.getElementById("pinned-messages-menu");
      if (!menu) {
        console.error('❌ Pin menu not found, recreating...');
        createPinnedMsgMenu();
        // Get fresh reference after creating
        menu = document.getElementById("pinned-messages-menu");
        if (!menu) {
          console.error('❌ Failed to recreate pin menu');
          return;
        }
      }

      togglePinnedMsgMenu(menu);
    }
    if (topRight) {
      topRight.prepend(pinMenuBtn);
    }
  }


  let messageObserverCleanup = null;

  function observeNewMessageThenSendButton(callback) {
    const thread = document.querySelector("#thread");
    if (!thread) {
      console.warn("⚠️ Thread container not found!");
      return;
    }

    let lastMessageCount = Array.from(document.querySelectorAll('#thread section[data-testid^="conversation-turn-"]')).length;
    let stabilizationTimer = null;
    let lastArticle = null;
    let isProcessing = false;

    function isMessageStable(article) {
      const hasActionButtons = article.querySelector('[data-testid$="-turn-action-button"]');
      const hasBlinkingCursor = article.querySelector('[class*="result-streaming"]');

      return hasActionButtons && !hasBlinkingCursor;
    }

    function waitForStability() {
      if (stabilizationTimer) {
        clearTimeout(stabilizationTimer);
      }

      stabilizationTimer = setTimeout(() => {
        const messages = Array.from(document.querySelectorAll('#thread section[data-testid^="conversation-turn-"]'));
        const currentLast = messages[messages.length - 1];

        if (currentLast && isMessageStable(currentLast)) {
          if (isProcessing) {
            console.log("⏭️ Already processing, skipping duplicate call");
            return;
          }

          isProcessing = true;
          console.log("✅ Message stable, adding buttons");

          try {
            callback();
          } catch (err) {
            console.error("❌ Error in callback:", err);
          } finally {
            setTimeout(() => {
              isProcessing = false;
            }, 1000);
          }
        } else if (currentLast) {
          console.log("⏳ Message not stable yet, waiting...");
          waitForStability();
        }
      }, 800);
    }

    const observer = new MutationObserver((mutations) => {
      const currentMessageCount = Array.from(document.querySelectorAll('#thread section[data-testid^="conversation-turn-"]')).length;

      if (currentMessageCount > lastMessageCount) {
        console.log(`📬 New message detected (${lastMessageCount} → ${currentMessageCount})`);
        lastMessageCount = currentMessageCount;
        lastArticle = Array.from(document.querySelectorAll('#thread section[data-testid^="conversation-turn-"]'))[currentMessageCount - 1];
        isProcessing = false;

        waitForStability();
      }
      else if (currentMessageCount === lastMessageCount && lastArticle && !isProcessing) {
        for (const mutation of mutations) {
          if (lastArticle.contains(mutation.target)) {
            waitForStability();
            break;
          }
        }
      }
    });

    observer.observe(thread, {
      childList: true,
      subtree: true,
      characterData: true
    });

    console.log("👀 Started observing for new messages...");

    // Check if the last message is currently being streamed when the observer starts
    const messages = Array.from(document.querySelectorAll('#thread section[data-testid^="conversation-turn-"]'));
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (!isMessageStable(lastMsg)) {
        console.log("⏳ Last message is still being written, waiting for it to stabilize...");
        lastArticle = lastMsg;
        waitForStability();
      }
    }

    return () => {
      observer.disconnect();
      if (stabilizationTimer) {
        clearTimeout(stabilizationTimer);
      }
    };
  }


  function addPinButtonsToMessages() {
    const actionBars = Array.from(
      document.querySelectorAll('[data-testid="copy-turn-action-button"]')
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

      pinBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg#23d2ff" fill="currentColor"></use></svg>
      `;

      pinBtn.onclick = async () => {
        const messageContainer = bar.closest('[data-testid^="conversation-turn-"]');
        const wasPinned = await pinMessage(messageContainer);
        if (wasPinned) {
          pinBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg#fa1dbd" fill="currentColor"></use></svg>`;
          setTimeout(() => pinBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg#23d2ff" fill="currentColor"></use></svg>`,
            1500);
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


  function waitForCorrectChat(callback, maxAttempts = 50) {
    let attempts = 0;
    let initialContent = null;

    const checkCorrectChat = () => {
      const thread = document.querySelector("#thread");
      const currentContent = thread ? thread.innerHTML : "";

      if (attempts === 0) {
        initialContent = currentContent;
        console.log("Recorded initial content for comparison");
      }

      const contentHasChanged = currentContent !== initialContent;

      const actionBars = Array.from(
        document.querySelectorAll('[data-testid="copy-turn-action-button"]')
      ).map(btn => btn.closest('[role="group"]'));

      let hasPopulatedBars = false;
      actionBars.forEach(bar => {
        if (bar.children.length > 0) {
          hasPopulatedBars = true;
        }
      });

      if (contentHasChanged && actionBars.length > 0 && hasPopulatedBars) {
        console.log(`New chat content loaded after ${attempts + 1} attempts`);
        callback();
      } else if (!isChatPage()) {
        console.log("Not on chat page, skipping");
        setTimeout(createPinnedMsgBtn, 750);
        return;
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkCorrectChat, 200);
      }
    };

    checkCorrectChat();
  }


  function watchURL() {
    let currentURL = location.href;

    setInterval(() => {
      let newURL = location.href;
      if (newURL.includes('#settings')) {
        return;
      }
      if (newURL !== currentURL) {
        console.log("URL changed, waiting for chat to stabilize");
        // waitForSidebarThenObserve();

        waitForCorrectChat(() => {
          console.log('from watchURL');

          if (messageObserverCleanup) {
            messageObserverCleanup();
            console.log("🧹 Cleaned up old message observer");
          }

          addPinButtonsToMessages();
          createPinnedMsgBtn();
          messageObserverCleanup = observeNewMessageThenSendButton(addPinButtonsToMessages);
        });

        currentURL = newURL;
      }
    }, 300);
  }


  function init() {
    createPinnedMsgMenu();
    createFolderMenu();

    waitForCorrectChat(() => {
      console.log('from init');

      if (messageObserverCleanup) {
        messageObserverCleanup();
        console.log("🧹 Cleaned up old message observer");
      }

      addPinButtonsToMessages();
      // createPinnedMsgBtn(); it was moved with setTimeout at the end
      messageObserverCleanup = observeNewMessageThenSendButton(addPinButtonsToMessages);
    });

    watchURL();
  }



  // 📁 FOLDERS
  let chats_flag;

  async function getFolders() {
    const result = await chrome.storage.sync.get("folders");
    return result.folders ? JSON.parse(result.folders) : {};
  }


  async function saveFolders(folders) {
    try {
      await chrome.storage.sync.set({ folders: JSON.stringify(folders) });
    } catch (error) {
      console.error('Error saving folders:', error);
    }
  }


  async function deleteFolder(folders, folderName) {
    try {
      const menu = document.getElementById("chat-folder-menu");
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


  // Clean up chat data when chat is deleted
  async function cleanupDeletedChat(chatId) {
    try {
      // Remove from folders
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

      // Remove pinned messages
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


  // Monitor chat deletions in sidebar
  function observeChatDeletions() {
    let observer;
    let currentNav = null;

    function startObserving() {
      // Try to find the nav in either sidebar container
      const nav = document.querySelector('nav') ||
        document.querySelector('#stage-slideover-sidebar nav') ||
        document.querySelector('#stage-popover-sidebar nav');

      if (!nav) return;

      if (currentNav === nav) return; // Already observing this nav

      if (observer) observer.disconnect();

      currentNav = nav;

      const existingChats = new Set();
      // Initial population
      document.querySelectorAll('nav a[href^="/c/"], nav a[href*="/g/"]').forEach(link => {
        const href = link.getAttribute('href');
        const chatMatch = href.match(/\/c\/([a-zA-Z0-9-]+)/);
        const projectMatch = href.match(/\/g\/(g-[a-zA-Z0-9-]+)/);
        const id = chatMatch ? chatMatch[1] : (projectMatch ? projectMatch[1] : null);
        if (id) existingChats.add(id);
      });

      observer = new MutationObserver(() => {
        const currentChats = new Set();
        const chatLinks = document.querySelectorAll('nav a[href^="/c/"], nav a[href*="/g/"]');

        // SAFETY CHECK: If nav is completely empty of chats, it might be loading or resizing.
        // Don't trigger deletions in this case.
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

        // EXTRA SAFETY: If multiple chats disappear at once, it's likely a sidebar refresh/virtual scroll artifact
        let missingCount = 0;
        existingChats.forEach(id => {
          if (!currentChats.has(id)) missingCount++;
        });

        if (missingCount > 1) {
          console.log(`⚠️ Ignoring massive deletion event (${missingCount} chats missing) - likely false positive`);
          return;
        }

        // Find deleted chats
        existingChats.forEach(chatId => {
          if (!currentChats.has(chatId)) {
            // DOUBLE CHECK: Is the element actually gone from the DOM?
            // (The set check is fast, but explicit check confirms)
            console.log(`🗑️ Chat potentially deleted: ${chatId}`);
            cleanupDeletedChat(chatId);
            existingChats.delete(chatId);
          }
        });

        // Add new chats
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

    // Check periodically if we are still observing a valid nav
    setInterval(() => {
      // Re-query for the best available nav
      const nav = document.querySelector('nav') ||
        document.querySelector('#stage-slideover-sidebar nav') ||
        document.querySelector('#stage-popover-sidebar nav');

      if (nav && nav !== currentNav) {
        console.log('🔄 Nav element changed, reconnecting observer...');
        waitForSidebarThenObserve();
        startObserving();
      } else if (!nav && currentNav) {
        // Nav disappeared
        currentNav = null;
        if (observer) observer.disconnect();
      }
    }, 2000);

    startObserving();
  }


  function openChat(chatUrl) {
    const isProject = chatUrl.includes('/project');
    const selector = isProject
      ? `a[href="${chatUrl}"]`
      : `a[href^="${chatUrl}"]`;

    const sidebarLink = document.querySelector(selector);

    if (sidebarLink) {
      sidebarLink.click();
    } else {
      window.location.href = chatUrl.startsWith('http')
        ? chatUrl
        : `https://chatgpt.com${chatUrl}`;
    }
  }


  async function toggleFolderMenu(folderMenu, triggerBtn) {
    if (folderMenu.style.display === "block") {
      folderMenu.style.display = "none";
    }
    else {
      // Pre-render before showing
      await renderFolders(folderMenu);
      folderMenu.style.display = "block";

      // Position dynamically to the right of the sidebar, top-aligned with button
      if (triggerBtn) {
        const btnRect = triggerBtn.getBoundingClientRect();
        const menuWidth = folderMenu.offsetWidth;
        const gap = 6; // px gap between sidebar edge and menu

        // Find the parent sidebar container to position relative to its right edge
        const sidebar = triggerBtn.closest('#stage-slideover-sidebar')
          || triggerBtn.closest('#stage-sidebar-tiny-bar');
        const sidebarRight = sidebar ? sidebar.getBoundingClientRect().right : btnRect.right;

        let left = sidebarRight + gap;
        let top = btnRect.top;

        // Clamp to viewport edges so the menu never gets clipped
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const menuHeight = folderMenu.offsetHeight;

        if (left + menuWidth > vw - 8) left = sidebarRight - menuWidth - gap;
        if (left < 8) left = 8;
        if (top + menuHeight > vh - 8) top = vh - menuHeight - 8;

        folderMenu.style.top = top + "px";
        folderMenu.style.left = left + "px";
      }
    }
  }


  function getChatTitleFromSidebar(chatId) {
    // Search for both regular chats and projects
    const selectors = [
      `nav a[href^="/c/${chatId}"]`,
      `nav a[href*="/g/${chatId}/"]`
    ];

    for (const selector of selectors) {
      const links = document.querySelectorAll(selector);
      for (const link of links) {
        // Try to find the title element within the link
        // ChatGPT stores titles in various nested divs
        const titleEl = link.querySelector('div.truncate') ||
          link.querySelector('.line-clamp-1') ||
          link.querySelector('[class*="text"]');

        if (titleEl) {
          const title = titleEl.textContent.trim();
          if (title && title !== 'New chat') {
            return title;
          }
        }

        // Fallback: get all text content
        const allText = link.textContent.trim();
        if (allText && allText !== 'New chat') {
          return allText;
        }
      }
    }

    return "(Unable to load chat title)";
  }


  async function renameFolderPrompt(oldName) {
    const menu = document.getElementById("chat-folder-menu");
    const newName = prompt(`Rename folder "${oldName}" to:`, oldName);

    if (!newName || newName.trim() === '' || newName === oldName) {
      return false;
    }

    const folders = await getFolders();

    // Check if new name already exists
    if (folders[newName.trim()]) {
      alert('❌ A folder with this name already exists!');
      return false;
    }

    // Rename folder
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
    const menu = document.getElementById("chat-folder-menu");
    folderElement.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    folderElement.addEventListener("drop", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const data = e.dataTransfer.getData("text/plain");

      // Match both regular chats and projects
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
    newFolderBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 5c.55 0 1 .45 1 1v5h5c.55 0 1 .45 1 1s-.45 1-1 1h-5v5c0 .55-.45 1-1 1s-1-.45-1-1v-5H6c-.55 0-1-.45-1-1s.45-1 1-1h5V6c0-.55.45-1 1-1z"/>
      </svg>
    `;

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


      const deleteFolderBtn = document.createElement("button");
      deleteFolderBtn.title = "Delete folder";
      deleteFolderBtn.className = 'folder-action-btn folder-delete-btn';
      deleteFolderBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg#3ee541" fill="currentColor"></use></svg>`;

      const renameFolderBtn = document.createElement("button");
      renameFolderBtn.title = "Rename folder";
      renameFolderBtn.className = 'folder-action-btn folder-rename-btn';
      renameFolderBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg#6d87e1" fill="currentColor"></use></svg>`;




      deleteFolderBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteFolder(folders, name);
      };

      renameFolderBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        renameFolderPrompt(name);
      };

      // Right-click to rename
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
    let folderMenu = document.getElementById("chat-folder-menu");
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

    // Insert the back button into the flex header container
    folderMenu.querySelector('div').appendChild(backBtn);

    chats.forEach(chat => {
      const link = document.createElement("a");

      // Determine if it's a project or regular chat
      const isProject = chat.id.startsWith('g-');
      const chatUrl = isProject ? `/g/${chat.id}/project` : `/c/${chat.id}`;

      // Use different emoji for projects vs chats
      const emoji = isProject ? "🗃️" : "💬";
      link.innerText = emoji + " " + (chat.title || "(Untitled)");
      link.className = 'group __menu-item hoverable gap-1.5 folder-chat-item';

      const deleteChatBtn = document.createElement("button");
      deleteChatBtn.title = "Remove chat";
      deleteChatBtn.className = 'folder-action-btn folder-delete-btn';
      deleteChatBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg#3ee541" fill="currentColor"></use></svg>`;

      const renameChatBtn = document.createElement("button");
      renameChatBtn.title = "Rename chat";
      renameChatBtn.className = 'folder-action-btn folder-rename-btn';
      renameChatBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg#6d87e1" fill="currentColor"></use></svg>`;



      deleteChatBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteChatFromFolder(folderName, chat.id);
      };

      renameChatBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        renameChatInFolder(folderName, chat.id, chat.title || "(Untitled)");
      };

      // Right-click to rename
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

  let folderMenuListenerAttached = false;

  function createFolderMenu() {
    if (document.getElementById("chat-folder-menu")) return;
    console.log("Creating folder menu");
    const folderMenu = document.createElement("div");
    folderMenu.id = "chat-folder-menu";
    folderMenu.className = "folder-menu-container";
    // Close menu when clicking outside
    if (!folderMenuListenerAttached) {
      console.log("Attaching folder menu listener");
      document.addEventListener("click", function (e) {
        const folderMenu = document.getElementById("chat-folder-menu");
        if (folderMenu && folderMenu.style.display === "block" && !folderMenu.contains(e.target)) {
          folderMenu.style.display = "none";
        }
      });
      folderMenuListenerAttached = true;
    }

    document.body.appendChild(folderMenu);
  }


  function createFolderButton() {
    if (document.getElementById('folder-button')) return;

    const aside = document.querySelector('#stage-slideover-sidebar aside.pt-\\(--sidebar-section-first-margin-top\\).last\\:mb-5');
    if (!aside) return;

    const shortAside = document.querySelector("#stage-sidebar-tiny-bar > div.mt-\\(--sidebar-section-first-margin-top\\)");
    if (!shortAside) return;

    const link = document.createElement('a');
    link.id = 'folder-button';
    link.href = '#';
    link.className = 'group __menu-item hoverable gap-1.5';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'flex items-center justify-center icon';
    iconWrap.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      stroke-width="1.5" stroke="currentColor" class="icon" width="20" height="20" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
      d="M2.25 6.75A2.25 2.25 0 014.5 4.5h4.379c.621 0 1.212.292 1.596.792l.9 1.2h6.875a2.25 2.25 0 012.25 2.25v7.875a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 16.5V6.75z" />
      </svg>
    `;

    const labelWrap = document.createElement('div');
    labelWrap.className = 'flex min-w-0 grow items-center gap-2.5';

    const label = document.createElement('div');
    label.className = 'truncate';
    label.textContent = 'Folders';

    labelWrap.appendChild(label);
    link.appendChild(iconWrap);
    link.appendChild(labelWrap);

    const iconContainer = document.createElement('a');
    iconContainer.className = 'group __menu-item hoverable gap-1.5';

    const folderIcon = document.createElement('div');
    folderIcon.className = 'flex items-center justify-center icon';
    folderIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      stroke-width="1.5" stroke="currentColor" class="icon" width="20" height="20" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
      d="M2.25 6.75A2.25 2.25 0 014.5 4.5h4.379c.621 0 1.212.292 1.596.792l.9 1.2h6.875a2.25 2.25 0 012.25 2.25v7.875a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 16.5V6.75z" />
      </svg>
    `;

    iconContainer.style.cursor = "pointer";
    iconContainer.title = "Folders";
    iconContainer.appendChild(folderIcon);

    link.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      let menu = document.getElementById("chat-folder-menu");
      if (!menu) {
        console.error('❌ Folder menu not found. Recreating...');
        createFolderMenu();
        menu = document.getElementById("chat-folder-menu");
        if (!menu) {
          console.error('❌ Failed to recreate folder menu');
          return;
        }
      }

      toggleFolderMenu(menu, link);
    };

    iconContainer.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      let menu = document.getElementById("chat-folder-menu");
      if (!menu) {
        console.error('❌ Folder menu not found. Recreating...');
        createFolderMenu();
        menu = document.getElementById("chat-folder-menu");
        if (!menu) {
          console.error('❌ Failed to recreate folder menu');
          return;
        }
      }

      toggleFolderMenu(menu, iconContainer);
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

    // Disconnect existing observer if any
    if (sidebarObserver) {
      sidebarObserver.disconnect();
    }

    let debounceTimer = null;

    sidebarObserver = new MutationObserver(() => {
      // Debounce to prevent excessive calls during React updates
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


  function get_svg_tool() {
    let hoveredElement = null;

    document.addEventListener("mousemove", (event) => {
      hoveredElement = event.target;
    });

    document.addEventListener("keydown", (event) => {
      // Ctrl + Alt + D
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "d") {
        event.preventDefault(); // optional but recommended

        if (!hoveredElement) return;

        const svg = hoveredElement.closest("svg");
        if (!svg) {
          console.log("No SVG under cursor");
          return;
        }

        console.log("Hovered SVG:", svg);
        console.log("SVG markup:\n", svg.outerHTML);
      }
    });

  }

  function get_style_tool() {
    let hoveredElement = null;

    document.addEventListener("mousemove", (e) => {
      hoveredElement = e.target;
    });

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (!hoveredElement) return;

        const el = hoveredElement.closest("*");
        const styles = getComputedStyle(el);

        console.log("Element:", el);
        console.log("color:", styles.color);
        console.log("background-color:", styles.backgroundColor);
        console.log("border-color:", styles.borderColor);
        console.log("box-shadow:", styles.boxShadow);
        console.log("opacity:", styles.opacity);
      }
    });
  }

  init();
  setTimeout(observeChatDeletions, 1500);
  setTimeout(waitForSidebarThenObserve, 1500);
  setTimeout(createPinnedMsgBtn, 1500)
  // get_svg_tool();
  // get_style_tool();
})();
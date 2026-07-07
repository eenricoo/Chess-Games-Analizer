(async function () {
  const { watchURL, waitForCorrectChat, isChatPage } = await import(chrome.runtime.getURL("modules/core/navigation.js"));
  const pins = await import(chrome.runtime.getURL("modules/features/pins.js"));
  const folders = await import(chrome.runtime.getURL("modules/features/folders.js"));

  // One-time setup
  pins.setup();
  folders.initFolders();

  // React to initial chat load
  if (isChatPage()) {
    waitForCorrectChat(() => pins.onChatChange(), {
      maxAttempts: 50,
      onNotChatPage: () => setTimeout(() => pins.showMenuButton(), 700)
    });
  }

  // React to navigation
  watchURL(() => {
    if (isChatPage()) {
      waitForCorrectChat(() => pins.onChatChange(), {
        maxAttempts: 50,
        onNotChatPage: () => setTimeout(() => pins.showMenuButton(), 700)
      });
    } else {
      setTimeout(() => pins.showMenuButton(), 700);
    }
  });
})();
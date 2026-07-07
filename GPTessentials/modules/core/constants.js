export const SELECTORS = {
    THREAD_CONTAINER: '#thread',
    TURN_MESSAGE: '#thread section[data-testid^="conversation-turn-"]',
    ACTION_BAR: '[data-testid="copy-turn-action-button"]',
    SIDEBAR_NAV: 'nav, #stage-slideover-sidebar nav, #stage-popover-sidebar nav',
    CHAT_LINKS: 'nav a[href^="/c/"], nav a[href*="/g/"]',
    SIDEBAR_ASIDE_LAST: '#stage-slideover-sidebar aside.pt-\\(--sidebar-section-first-margin-top\\).last\\:mb-5',
    SIDEBAR_SHORT_ASIDE: '#stage-sidebar-tiny-bar > div.mt-\\(--sidebar-section-first-margin-top\\)',
    CONVERSATION_HEADER_ACTIONS: '#conversation-header-actions',
    CHAT_TITLE_TRUNCATE: 'div.truncate',
    CHAT_TITLE_LINECLAMP: '.line-clamp-1',
    CHAT_TITLE_TEXT: '[class*="text"]',
    RESULT_STREAMING: '[class*="result-streaming"]',
    TURN_ACTION_BTN: '[data-testid$="-turn-action-button"]'
};

export const EXT_IDS = {
    FOLDER_MENU: 'chat-folder-menu',
    PINNED_MENU: 'pinned-messages-menu',
    FOLDER_BTN: 'folder-button',
    PINNED_BTN: 'pinned-msg-menu-btn',
    SELECTIVE_RESET_MENU: 'selective-pin-reset-menu',
    RESET_ALL_PINS_BTN: 'reset-all-pins-btn'
};

export const ICONS = {
    SPRITE_DELETE: '#3ee541',
    SPRITE_RENAME: '#6d87e1',
    SPRITE_PIN: '#23d2ff',
    SPRITE_PIN_SOLID: '#fa1dbd',
    INLINE_FOLDER: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon" width="20" height="20" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75A2.25 2.25 0 014.5 4.5h4.379c.621 0 1.212.292 1.596.792l.9 1.2h6.875a2.25 2.25 0 012.25 2.25v7.875a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 16.5V6.75z" /></svg>`,
    INLINE_NEW_FOLDER: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5c.55 0 1 .45 1 1v5h5c.55 0 1 .45 1 1s-.45 1-1 1h-5v5c0 .55-.45 1-1 1s-1-.45-1-1v-5H6c-.55 0-1-.45-1-1s.45-1 1-1h5V6c0-.55.45-1 1-1z"/></svg>`,
    INLINE_OPEN: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`
};

export const URL_PATTERNS = {
    CHAT: /\/(?:g\/[^\/]+\/)?c\/([^\/?#]+)/,
    PROJECT: /\/g\/(g-[a-zA-Z0-9-]+)\/project/,
    CHAT_PAGE: /^(?:\/g\/[^\/]+)?\/c\//
};

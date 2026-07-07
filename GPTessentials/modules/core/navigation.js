import { SELECTORS, URL_PATTERNS } from './constants.js';

export function openChat(chatUrl) {
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

export function getCurrentChatId() {
    const chatMatch = location.href.match(URL_PATTERNS.CHAT);
    if (chatMatch) return chatMatch[1];

    const projectMatch = location.href.match(URL_PATTERNS.PROJECT);
    return projectMatch ? projectMatch[1] : null;
}

export function isChatPage() {
    return URL_PATTERNS.CHAT_PAGE.test(location.pathname);
}

export function getChatTitleFromSidebar(chatId) {
    const selectors = [
        `nav a[href^="/c/${chatId}"]`,
        `nav a[href*="/g/${chatId}/"]`
    ];

    for (const selector of selectors) {
        const links = document.querySelectorAll(selector);
        for (const link of links) {
            const titleEl = link.querySelector(SELECTORS.CHAT_TITLE_TRUNCATE) ||
                link.querySelector(SELECTORS.CHAT_TITLE_LINECLAMP) ||
                link.querySelector(SELECTORS.CHAT_TITLE_TEXT);

            if (titleEl) {
                const title = titleEl.textContent.trim();
                if (title && title !== 'New chat') {
                    return title;
                }
            }

            const allText = link.textContent.trim();
            if (allText && allText !== 'New chat') {
                return allText;
            }
        }
    }

    return "(Unable to load chat title)";
}

export function waitForCorrectChat(callback, options = {}) {
    const maxAttempts = options.maxAttempts || 50;
    const onNotChatPage = options.onNotChatPage || (() => { });

    let attempts = 0;
    let initialContent = null;

    const checkCorrectChat = () => {
        const thread = document.querySelector(SELECTORS.THREAD_CONTAINER);
        const currentContent = thread ? thread.innerHTML : "";

        if (attempts === 0) {
            initialContent = currentContent;
            console.log("Recorded initial content for comparison");
        }

        const contentHasChanged = currentContent !== initialContent;

        const actionBars = Array.from(
            document.querySelectorAll(SELECTORS.ACTION_BAR)
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
            onNotChatPage();
            return;
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkCorrectChat, 200);
        }
    };

    checkCorrectChat();
}

export function watchURL(onChangeCallback) {
    let currentURL = location.href;

    setInterval(() => {
        let newURL = location.href;
        if (newURL.includes('#settings')) {
            return;
        }
        if (newURL !== currentURL) {
            console.log("URL changed, triggering callback");
            onChangeCallback();
            currentURL = newURL;
        }
    }, 300);
}

import { SELECTORS } from './constants.js';

export function observeNewMessageThenSendButton(callback) {
    const thread = document.querySelector(SELECTORS.THREAD_CONTAINER);
    if (!thread) {
        console.warn("⚠️ Thread container not found!");
        return () => {};
    }

    let lastMessageCount = Array.from(document.querySelectorAll(SELECTORS.TURN_MESSAGE)).length;
    let stabilizationTimer = null;
    let lastArticle = null;
    let isProcessing = false;

    function isMessageStable(article) {
        const hasActionButtons = article.querySelector(SELECTORS.TURN_ACTION_BTN);
        const hasBlinkingCursor = article.querySelector(SELECTORS.RESULT_STREAMING);

        return hasActionButtons && !hasBlinkingCursor;
    }

    function waitForStability() {
        if (stabilizationTimer) {
            clearTimeout(stabilizationTimer);
        }

        stabilizationTimer = setTimeout(() => {
            const messages = Array.from(document.querySelectorAll(SELECTORS.TURN_MESSAGE));
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
        const currentMessageCount = Array.from(document.querySelectorAll(SELECTORS.TURN_MESSAGE)).length;

        if (currentMessageCount > lastMessageCount) {
            console.log(`📬 New message detected (${lastMessageCount} → ${currentMessageCount})`);
            lastMessageCount = currentMessageCount;
            lastArticle = Array.from(document.querySelectorAll(SELECTORS.TURN_MESSAGE))[currentMessageCount - 1];
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
    const messages = Array.from(document.querySelectorAll(SELECTORS.TURN_MESSAGE));
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

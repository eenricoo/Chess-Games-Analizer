export function createSpriteIcon(spriteHash, width = 20, height = 20) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-gvfid0kn.svg${spriteHash}" fill="currentColor"></use></svg>`;
}

export function createActionButton({ title, iconString, className, onClick }) {
    const btn = document.createElement("button");
    btn.title = title || "";
    if (className) btn.className = className;
    btn.innerHTML = iconString;
    if (onClick) {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick(e);
        };
    }
    return btn;
}

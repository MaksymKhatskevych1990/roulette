const tg = window.Telegram.WebApp;
tg.expand();

const tracks = [
    document.getElementById('track1'),
    document.getElementById('track2'),
    document.getElementById('track3')
];
const spinBtn = document.getElementById('spinBtn');
const resultMsg = document.getElementById('result-message');

// Configuration
const TICKET_HEIGHT = 80;
const GAP = 10;
const ITEM_SIZE = TICKET_HEIGHT + GAP;

// Symbols (Expanded to match backend)
const SYMBOLS = [
    { label: "100", value: 100 },
    { label: "50", value: 50 },
    { label: "25", value: 25 },
    { label: "20", value: 20 },
    { label: "10", value: 10 },
    { label: "5", value: 5 },
    { label: "4", value: 4 },
    { label: "3", value: 3 },
    { label: "2.5", value: 2.5 },
    { label: "2", value: 2 },
    { label: "1.5", value: 1.5 },
    { label: "1", value: 1 },
    { label: "0.5", value: 0.5 }
];

function createTicket(symbol) {
    const el = document.createElement('div');
    el.className = 'ticket';
    el.innerHTML = `
    <div class="ticket-amount">${symbol.label}</div>
    <div class="ticket-label">USDT</div>
  `;
    return el;
}

function initTrack(trackIndex) {
    const track = tracks[trackIndex];
    track.innerHTML = '';
    // Create initial set of items
    for (let i = 0; i < 30; i++) {
        const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        track.appendChild(createTicket(sym));
    }

    // Center initially on Index 2
    // Formula: TranslateY = 110 - (Index * 90)
    // We want to simulate "Falling", so we want to be at the "Bottom" of the list?
    // No, if we are at the bottom, we can't scroll down further easily without appending.
    // Let's stick to the plan: View Index 2.
    const startItemIndex = 2;
    const offset = 110 - (startItemIndex * ITEM_SIZE);
    track.style.transform = `translateY(${offset}px)`;
}

// Init all tracks
tracks.forEach((_, i) => initTrack(i));

async function spin() {
    if (spinBtn.disabled) return;
    spinBtn.disabled = true;
    resultMsg.innerText = "Крутим...";

    try {
        // 1. Get result from backend
        const res = await fetch("/spin", { method: "POST" });
        const data = await res.json();
        const reelValues = data.reels; // [v1, v2, v3]
        const totalWin = data.total_label;

        // 2. Animate each track
        const animations = tracks.map((track, i) => {
            return new Promise(resolve => {
                // Delay start for sequential effect
                setTimeout(() => {
                    const targetValue = reelValues[i];

                    // To animate DOWN (falling), we need to move from a High Negative Offset (showing items far down the list? No.)
                    // We want to move from "Above" to "Center".
                    // Visual: Items fall from top.
                    // This means we are currently looking at Index X.
                    // We want to look at Index Y, where Y < X?
                    // No, if we look at Y < X, we move the strip DOWN.
                    // Example: View Index 50. Transform = -4000.
                    // View Index 2. Transform = -100.
                    // Animation: -4000 -> -100. Strip moves DOWN. Items appear to fall.
                    // So we need to generate a strip where the Winner is at Index 2 (Top).
                    // And we start viewing at Index 50 (Bottom).

                    // 1. Clear and rebuild track
                    track.innerHTML = '';
                    track.style.transition = 'none';

                    // 2. Generate the strip
                    // [Winner, Buffer x 2] -> These are at the top (Index 0, 1, 2...)
                    // Wait, if Winner is at Index 2.
                    // [Buffer, Buffer, Winner, Dummy... Dummy]

                    // Let's build it:
                    // Index 0: Buffer
                    // Index 1: Buffer
                    // Index 2: WINNER
                    // Index 3..N: Dummies

                    const bufferTop = [];
                    for (let k = 0; k < 2; k++) bufferTop.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

                    let winSym = SYMBOLS.find(s => s.value === targetValue);
                    if (!winSym) winSym = { label: targetValue.toString(), value: targetValue };

                    const dummies = [];
                    const spinCount = 30 + (i * 10); // Distance to fall
                    for (let k = 0; k < spinCount; k++) dummies.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

                    // Append to DOM in order:
                    // We want Index 0 at top.
                    // So append Buffer, then Winner, then Dummies.

                    bufferTop.forEach(s => track.appendChild(createTicket(s)));

                    const winTicket = createTicket(winSym);
                    winTicket.style.border = "2px solid #fff";
                    track.appendChild(winTicket);

                    dummies.forEach(s => track.appendChild(createTicket(s)));

                    // 3. Set Initial Position (Viewing Dummies at the bottom)
                    // We want to view Index = (2 + spinCount) roughly?
                    // Let's say we view the last dummy.
                    const startIndex = 2 + spinCount - 2; // A bit up from bottom
                    const startOffset = 110 - (startIndex * ITEM_SIZE);
                    track.style.transform = `translateY(${startOffset}px)`;

                    // Force reflow
                    track.offsetHeight;

                    // 4. Animate to Winner (Index 2)
                    const targetIndex = 2;
                    const targetOffset = 110 - (targetIndex * ITEM_SIZE);

                    track.style.transition = `transform ${3 + i}s cubic-bezier(0.1, 0.9, 0.2, 1)`;
                    track.style.transform = `translateY(${targetOffset}px)`;

                    // Resolve after animation roughly ends
                    setTimeout(resolve, (3 + i) * 1000);

                }, i * 500); // Start delay
            });
        });

        await Promise.all(animations);

        resultMsg.innerText = `🎉 Выпало: ${totalWin}`;
        spinBtn.disabled = false;
        tg.HapticFeedback.notificationOccurred('success');

    } catch (e) {
        console.error(e);
        resultMsg.innerText = "Ошибка сети";
        spinBtn.disabled = false;
    }
}

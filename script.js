/**
 * Labs22 Interactive Wires & UI Logic
 * Ported Wire Logic from Website 4 + Website 5 Features
 */

// Attempt to restore mouse position from session storage (for reloads)
const storedMouse = (() => {
    try {
        const stored = sessionStorage.getItem('labs22_cursor_pos');
        if (stored) return JSON.parse(stored);
    } catch (e) {
        /* ignore */
    }
    return null;
})();

// Global state
const state = {
    mouseX: storedMouse ? storedMouse.x : window.innerWidth / 2,
    mouseY: storedMouse ? storedMouse.y : window.innerHeight / 2,
    isMouseInWindow: !!storedMouse, // Assume in window if we have history
    wireRestLength: window.innerWidth * 0.25,
    isDesktop: window.innerWidth > 1024
};

// Track mouse immediately with CAPTURE phase
window.addEventListener('mousemove', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    state.isMouseInWindow = true;

    // Save position for reload persistence
    try {
        sessionStorage.setItem('labs22_cursor_pos', JSON.stringify({
            x: e.clientX,
            y: e.clientY
        }));
    } catch (e) {
        /* ignore */
    }
}, true);

// TOUCH SUPPORT for wires on mobile
window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        state.mouseX = e.touches[0].clientX;
        state.mouseY = e.touches[0].clientY;
        state.isMouseInWindow = true;
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        state.mouseX = e.touches[0].clientX;
        state.mouseY = e.touches[0].clientY;
        state.isMouseInWindow = true;
    }
}, { passive: true });

// Reset wires to center when touch ends to prevent weird dangling
window.addEventListener('touchend', () => {
    state.isMouseInWindow = false;
}, { passive: true });

window.addEventListener('mouseover', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    state.isMouseInWindow = true;
}, true);

document.addEventListener('mouseleave', () => {
    const cursor = document.querySelector('.cursor-dot');
    if (cursor) cursor.classList.remove('visible');
});

// Document Ready
document.addEventListener('DOMContentLoaded', () => {

    const cursorDot = document.querySelector('.cursor-dot');
    const timerValue = document.getElementById('timerValue');
    const wireSvg = document.getElementById('wireSvg');
    const heroSubtitle = document.querySelector('.hero-subtitle');

    // Timer Sequence
    const timerSteps = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
    let currentStep = 0;

    function runTimer() {
        if (!timerValue) return;
        timerValue.textContent = timerSteps[currentStep];
        currentStep++;

        if (currentStep < timerSteps.length) {
            setTimeout(runTimer, 150);
        } else {
            // Trigger wire init
            setTimeout(() => {
                initializeWires();

                // Reveal subtitle and button
                if (heroSubtitle) {
                    setTimeout(() => {
                        heroSubtitle.classList.add('visible');
                    }, 500);
                }

                // Make words full black
                const allWords = document.querySelectorAll('.hero-title .word');
                allWords.forEach(w => w.classList.add('hooked'));

                const heroActions = document.querySelector('.hero-actions');
                if (heroActions) {
                    setTimeout(() => {
                        heroActions.classList.add('visible');
                    }, 600);
                }

            }, 200);
        }
    }

    setTimeout(runTimer, 500);

    // --- Science-First Reveal Logic (Website 5) ---
    const revealText = document.getElementById('revealText');
    if (revealText) {
        const text = revealText.innerText;
        revealText.innerHTML = text.split(' ').map(word => `<span class="reveal-word">${word}</span>`).join(' ');
        const words = revealText.querySelectorAll('.reveal-word');

        window.addEventListener('scroll', () => {
            const baseTrigger = window.innerHeight * 0.8;
            words.forEach((word, index) => {
                const rect = word.getBoundingClientRect();
                const effectiveTrigger = baseTrigger - (index * 15);
                if (rect.top < effectiveTrigger) {
                    word.classList.add('active');
                } else {
                    word.classList.remove('active');
                }
            });
        }, { passive: true });
    }

    // --- Services Scroll Interaction (Website 5) ---
    const stickyCards = document.querySelectorAll('.sticky-project-card');

    // Initialize stack index for CSS calc()
    stickyCards.forEach((card, index) => {
        card.style.setProperty('--stack-index', index);
    });

    window.addEventListener('scroll', () => {
        const cardStates = [];
        stickyCards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            const style = window.getComputedStyle(card);
            const stickyTop = parseInt(style.top);
            const isStuck = rect.top <= (stickyTop + 5);
            cardStates.push({ card, isStuck, index });
        });

        const stuckCards = cardStates.filter(s => s.isStuck);

        cardStates.forEach(state => {
            const { card, isStuck } = state;
            if (isStuck) {
                card.classList.add('is-active');
                const stuckIndex = stuckCards.findIndex(s => s.card === card);
                const depth = (stuckCards.length - 1) - stuckIndex;
                const scale = Math.max(0.8, 1 - (depth * 0.05));
                card.style.transform = `scale(${scale})`;
            } else {
                card.classList.remove('is-active');
                card.style.transform = '';
            }
        });
    }, { passive: true });

    // --- Arc Ticker (Website 5) ---
    const brandContainer = document.getElementById('brand-arc-ticker');
    const brandImages = [
        'brand identity/Bunzos.jpg', 'brand identity/Rainforest mockup.jpg', 'brand identity/Still.jpg',
        'brand identity/Yoko.jpg', 'brand identity/ego.jpg', 'brand identity/furnistaa.jpg',
        'brand identity/kloz 1.jpg', 'brand identity/kloz 2.jpg', 'brand identity/toggleart.jpg'
    ];

    let tickerItems = [];
    let tickerOffset = 0;
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let isAutoPlaying = true;

    let CARD_WIDTH = 320;
    let CARD_HEIGHT = 400;
    let CARD_GAP = 20;
    let CARD_STEP = 340;
    let MAX_ROTATION = 35;
    let TOTAL_WIDTH = 0;
    const BASE_SPEED = 0.8;
    let SCROLL_BOOST = 0.1;

    function updateTickerConfig() {
        const width = window.innerWidth;
        if (width <= 768) {
            CARD_WIDTH = 280;
            CARD_HEIGHT = 350;
            CARD_GAP = -20;
            MAX_ROTATION = 14;
            SCROLL_BOOST = 0.04;
        } else if (width <= 1024) {
            CARD_WIDTH = 260;
            CARD_HEIGHT = 330;
            CARD_GAP = -15;
            MAX_ROTATION = 20;
            SCROLL_BOOST = 0.07;
        } else {
            CARD_WIDTH = 320;
            CARD_HEIGHT = 400;
            CARD_GAP = 20; /* Increased for more breathing room */
            MAX_ROTATION = 25;
            SCROLL_BOOST = 0.1;
        }
    }

    function updateTickerConfigFull() {
        updateTickerConfig();
        CARD_STEP = CARD_WIDTH + CARD_GAP;
        if (typeof tickerItems !== 'undefined' && tickerItems.length > 0) {
            TOTAL_WIDTH = tickerItems.length * (CARD_WIDTH + CARD_GAP);
        }
    }
    updateTickerConfigFull();

    isAutoPlaying = true;

    if (brandContainer) {
        brandContainer.innerHTML = '';
        const doubleList = [...brandImages, ...brandImages];
        doubleList.forEach((src) => {
            const div = document.createElement('div');
            div.className = 'arc-ticker-item';
            const img = document.createElement('img');
            img.src = src;
            img.loading = 'lazy';
            img.decoding = 'async';
            div.appendChild(img);
            brandContainer.appendChild(div);
            tickerItems.push(div);
        });
    }

    // Initial calculation of TOTAL_WIDTH
    updateTickerConfigFull();

    // Center the middle card (index 4 of 9) initially
    if (TOTAL_WIDTH > 0) {
        tickerOffset = (4 * (CARD_WIDTH + CARD_GAP)) - (window.innerWidth / 2) + (CARD_WIDTH / 2);
    }

    function updateArcTicker() {
        if (!brandContainer || tickerItems.length === 0) return;

        const containerRect = brandContainer.getBoundingClientRect();
        const containerTop = containerRect.top;
        const containerLeft = containerRect.left;
        const viewportHeight = window.innerHeight;

        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;
        // lastScrollY updated in wire animate loop or here? 
        // We'll update it here to be safe for this independent loop, but be careful of conflicts.
        // Actually, let's keep it here.
        lastScrollY = currentScrollY;

        const scrollZoneThreshold = viewportHeight * 0.66;
        const isInScrollZone = containerTop < scrollZoneThreshold;

        if (isInScrollZone) {
            scrollVelocity += scrollDelta * SCROLL_BOOST;
        }
        scrollVelocity *= 0.92;

        if (isAutoPlaying) {
            tickerOffset += BASE_SPEED + scrollVelocity;
        } else {
            tickerOffset += scrollVelocity;
        }

        const halfWidth = TOTAL_WIDTH / 2;
        if (tickerOffset >= halfWidth) tickerOffset -= halfWidth;
        else if (tickerOffset < 0) tickerOffset += halfWidth;

        // Force screen center to exactly half viewport for mobile breakout
        const screenWidth = window.innerWidth;
        const screenCenter = screenWidth / 2;

        // On mobile 100vw breakout, containerLeft should effectively be 0
        const isMobile = screenWidth <= 768;
        const effectiveContainerLeft = isMobile ? 0 : containerLeft;

        tickerItems.forEach((item, index) => {
            let baseX = index * (CARD_WIDTH + CARD_GAP);
            let currentX = baseX - tickerOffset;

            // Loop logic: Recycle when item is fully off-screen left
            while (currentX < -CARD_WIDTH) currentX += TOTAL_WIDTH / 2;
            while (currentX > screenWidth + CARD_WIDTH) currentX -= TOTAL_WIDTH / 2;

            const actualScreenX = currentX + effectiveContainerLeft;
            const cardCenterScreen = actualScreenX + (CARD_WIDTH / 2);
            const distFromCenter = cardCenterScreen - screenCenter;
            const normalized = distFromCenter / (window.innerWidth * 0.5);
            const clampedNorm = Math.max(-1.5, Math.min(1.5, normalized));

            const isMobile = window.innerWidth <= 768;
            const yDropMult = isMobile ? 20 : 150; // Much flatter arc on mobile
            const yDrop = Math.pow(clampedNorm, 2) * yDropMult;
            const rotation = clampedNorm * MAX_ROTATION;

            // Subtler scale changes on mobile
            const maxScale = isMobile ? 1.02 : 1.2;
            const scaleMult = isMobile ? 0.15 : 0.35;
            const scale = maxScale - (Math.abs(clampedNorm) * scaleMult);

            item.style.width = CARD_WIDTH + 'px';
            item.style.height = CARD_HEIGHT + 'px';
            item.style.transform = `translate3d(${currentX}px, ${yDrop}px, 0) rotate(${rotation}deg) scale(${scale})`;
            item.style.zIndex = Math.round(100 - Math.abs(clampedNorm * 100));
        });

        requestAnimationFrame(updateArcTicker);
    }

    const prevBtn = document.getElementById('arc-prev');
    const nextBtn = document.getElementById('arc-next');
    // Using dynamic CARD_STEP calculated in updateTickerConfig

    // SWIPE LOGIC FOR MOBILE
    let touchStartX = 0;
    let touchLastX = 0;
    let isDragging = false;

    if (brandContainer) {
        brandContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                isAutoPlaying = false; // Stop auto-play immediately
                touchStartX = e.touches[0].clientX;
                touchLastX = touchStartX;
                isDragging = true;
                scrollVelocity = 0; // Kill momentum
            }
        }, { passive: true });

        brandContainer.addEventListener('touchmove', (e) => {
            if (!isDragging || e.touches.length === 0) return;
            const currentX = e.touches[0].clientX;
            const deltaX = touchLastX - currentX; // Drag left = positive delta

            // Apply drag directly to offset (sensitize by 1.5x)
            tickerOffset += deltaX * 1.5;

            touchLastX = currentX;
        }, { passive: true });

        brandContainer.addEventListener('touchend', () => {
            isDragging = false;
            const swipeDist = touchStartX - touchLastX;
            const threshold = 50; // Min swipe distance

            // Snap to next/prev card based on swipe direction
            if (Math.abs(swipeDist) > threshold) {
                const step = CARD_WIDTH + CARD_GAP;
                const shift = getCenteringShift();
                const currentIndex = (tickerOffset + shift) / step;

                // If swiped LEFT (positive), go next. If RIGHT (negative), go prev.
                const direction = swipeDist > 0 ? 1 : -1;
                const targetIndex = Math.round(currentIndex) + direction;

                animateToOffset(targetIndex * step - shift);
            } else {
                // If small swipe, just release with minor momentum
                scrollVelocity = swipeDist * 0.05;
            }
        }, { passive: true });
    }

    const getCenteringShift = () => {
        const screenWidth = window.innerWidth;
        const containerLeft = brandContainer ? brandContainer.getBoundingClientRect().left : 0;
        const isMobile = screenWidth <= 768;
        const effectiveLeft = isMobile ? 0 : containerLeft;
        return (screenWidth / 2) - (CARD_WIDTH / 2) - effectiveLeft;
    };

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            isAutoPlaying = false;
            const step = CARD_WIDTH + CARD_GAP;
            const shift = getCenteringShift();
            const currentIndex = (tickerOffset + shift) / step;
            const targetIndex = Math.round(currentIndex - 0.1) - 1;
            animateToOffset(targetIndex * step - shift);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            isAutoPlaying = false;
            const step = CARD_WIDTH + CARD_GAP;
            const shift = getCenteringShift();
            const currentIndex = (tickerOffset + shift) / step;
            const targetIndex = Math.round(currentIndex + 0.1) + 1;
            animateToOffset(targetIndex * step - shift);
        });
    }

    function animateToOffset(targetOffset) {
        const startOffset = tickerOffset;
        const distance = targetOffset - startOffset;
        const duration = 400;
        const startTime = performance.now();
        function animateStep(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            tickerOffset = startOffset + (distance * eased);
            const halfWidth = TOTAL_WIDTH / 2;
            if (tickerOffset >= halfWidth) tickerOffset -= halfWidth;
            if (tickerOffset < 0) tickerOffset += halfWidth;
            if (progress < 1) requestAnimationFrame(animateStep);
        }
        requestAnimationFrame(animateStep);
    }

    if (brandContainer) updateArcTicker();


    // ========================================
    // Wire & Physics Setup (PORTED FROM WEBSITE 4)
    // ========================================

    const wires = [
        document.getElementById('wire1'),
        document.getElementById('wire2'),
        document.getElementById('wire3'),
        document.getElementById('wire4'),
        document.getElementById('wire5')
    ];

    // Create connection dots (from Website 4 logic)
    const connectionDots = [];
    if (wireSvg) {
        for (let i = 0; i < 5; i++) {
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("r", "3");
            dot.setAttribute("fill", "#ff6b35");
            dot.style.opacity = "0";
            dot.style.transition = "opacity 0.5s ease";
            wireSvg.appendChild(dot);
            connectionDots.push(dot);
        }
    }

    const MAX_TEXT_MOVEMENT = 100;
    const MOVEMENT_EASE = 0.08;
    const VIBRATION_AMPLITUDE = 2;
    const VIBRATION_SPEED = 0.4;
    const CURSOR_CONNECTION_OFFSET_X = 0;
    const CURSOR_CONNECTION_OFFSET_Y = 0;

    let time = 0;
    let wiresInitialized = false;

    // Realistic Wire Physics (Verlet Integration)
    let wirePhysics = [];
    const GRAVITY = 0.4;
    const AIR_RESISTANCE = 0.96;
    const WIRE_LENGTH = 150;
    const WIRE_SEGMENTS = 14;
    const WIRE_ITERATIONS = 25; // Higher iterations = stiffer, less stretchy wires
    const SEGMENT_LENGTH = WIRE_LENGTH / WIRE_SEGMENTS;

    let isDetached = false;
    let wordAnchors = [];

    function getLastLetterPosition(wordElement) {
        const walker = document.createTreeWalker(wordElement, NodeFilter.SHOW_TEXT, null, false);
        let lastTextNode = null;
        while (walker.nextNode()) lastTextNode = walker.currentNode;

        if (!lastTextNode || lastTextNode.textContent.trim() === '') {
            const rect = wordElement.getBoundingClientRect();
            return {
                x: rect.right - rect.width * 0.2,
                y: rect.bottom - rect.height * 0.25
            };
        }

        const range = document.createRange();
        const textLength = lastTextNode.textContent.length;
        range.setStart(lastTextNode, Math.max(0, textLength - 1));
        range.setEnd(lastTextNode, textLength);
        const rect = range.getBoundingClientRect();

        return {
            x: rect.right - (rect.width * 0.38),
            y: rect.bottom - (rect.height * 0.18)
        };
    }

    function updateWordAnchors() {
        wordAnchors = [];
        const words = document.querySelectorAll('.word[data-wire]');
        words.forEach((word) => {
            const pos = getLastLetterPosition(word);
            wordAnchors.push(pos);
        });
    }

    function generateWirePath(nodes) {
        if (!nodes || nodes.length < 2) return "";
        let path = `M ${nodes[0].x} ${nodes[0].y}`;
        // Use quadratic curves for smooth chain look
        for (let i = 1; i < nodes.length - 1; i++) {
            const xc = (nodes[i].x + nodes[i + 1].x) / 2;
            const yc = (nodes[i].y + nodes[i + 1].y) / 2;
            path += ` Q ${nodes[i].x} ${nodes[i].y}, ${xc} ${yc}`;
        }
        const last = nodes[nodes.length - 1];
        path += ` L ${last.x} ${last.y}`;
        return path;
    }

    function initializeWires() {
        updateWordAnchors();

        // Check if we should start detached (only if scrolled OR on mobile)
        const isMobile = window.innerWidth <= 768;
        const shouldStartDetached = window.scrollY > 100 || isMobile;

        // Initialize physics for each wire (multi-segment)
        wirePhysics = [];
        for (let i = 0; i < wires.length; i++) {
            const anchor = wordAnchors[i] || { x: state.mouseX, y: state.mouseY };
            const nodes = [];
            const segments = WIRE_SEGMENTS;

            for (let j = 0; j < segments; j++) {
                nodes.push({
                    x: anchor.x,
                    y: anchor.y + (j * SEGMENT_LENGTH),
                    oldX: anchor.x,
                    oldY: anchor.y + (j * SEGMENT_LENGTH),
                    forceX: 0,
                    forceY: 0
                });
            }

            wirePhysics.push({
                nodes: nodes,
                segments: segments,
                id: i
            });
        }

        if (wireSvg) wireSvg.classList.add('visible');

        if (shouldStartDetached) {
            isDetached = true;
            document.body.classList.add('scrolled');
            if (cursorDot) cursorDot.classList.remove('visible');
        } else {
            isDetached = false;
            if (cursorDot) {
                cursorDot.classList.add('visible');
                cursorDot.style.left = `${state.mouseX}px`;
                cursorDot.style.top = `${state.mouseY}px`;
            }
        }

        connectionDots.forEach(dot => dot.style.opacity = "1");

        wiresInitialized = true;
        animate();
    }

    function animate() {
        requestAnimationFrame(animate);
        // Completely stop on mobile
        if (window.innerWidth <= 768) return;
        if (!wiresInitialized) return;
        time++;

        // 1. Update Anchors
        updateWordAnchors();

        let avgAnchorX = 0;
        let avgAnchorY = 0;
        if (wordAnchors.length > 0) {
            wordAnchors.forEach(a => {
                avgAnchorX += a.x;
                avgAnchorY += a.y;
            });
            avgAnchorX /= wordAnchors.length;
            avgAnchorY /= wordAnchors.length;
        }

        const cursorConnectX = state.mouseX + CURSOR_CONNECTION_OFFSET_X;
        const cursorConnectY = state.mouseY + CURSOR_CONNECTION_OFFSET_Y;

        // 2. State Management
        const distToText = Math.sqrt(Math.pow(cursorConnectX - avgAnchorX, 2) + Math.pow(cursorConnectY - avgAnchorY, 2));
        const REATTACH_THRESHOLD = 300;

        let shouldBeDetached = false;

        // 1. Scroll-based detach (Desktop & Mobile)
        if (window.scrollY > 100) {
            shouldBeDetached = true;
            if (distToText < REATTACH_THRESHOLD) shouldBeDetached = false;
        }

        // 2. Mobile Touch Logic
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            shouldBeDetached = true; // Always detached on mobile
        }

        if (shouldBeDetached && !isDetached) {
            isDetached = true;
            document.body.classList.add('scrolled');
            if (cursorDot) cursorDot.classList.remove('visible');
        } else if (!shouldBeDetached && isDetached) {
            isDetached = false;
            document.body.classList.remove('scrolled');
            if (cursorDot) cursorDot.classList.add('visible');
        }

        if (cursorDot && !isDetached) {
            cursorDot.style.left = `${state.mouseX}px`;
            cursorDot.style.top = `${state.mouseY}px`;
        }

        // 3. Physics Simulation
        wirePhysics.forEach((wp, index) => {
            if (!wires[index]) return;
            const anchor = wordAnchors[index];
            if (!anchor) return;
            const nodes = wp.nodes;

            // Update Nodes (Verlet Integration)
            nodes.forEach((node, i) => {
                // Pin the first node to the word anchor
                if (i === 0) {
                    node.x = anchor.x;
                    node.y = anchor.y;
                    return;
                }

                // Node physics
                const vx = (node.x - node.oldX) * AIR_RESISTANCE;
                const vy = (node.y - node.oldY) * AIR_RESISTANCE;

                node.oldX = node.x;
                node.oldY = node.y;

                node.x += vx;
                node.y += vy + GRAVITY;
            });

            // Constraint Solving
            for (let it = 0; it < WIRE_ITERATIONS; it++) {
                // Pin ends logic
                // ON MOBILE: ALWAYS detach (ignore touch) to allow free dangling
                const isMobileFrame = window.innerWidth <= 768;

                if (!isDetached && !isMobileFrame) {
                    const lastNode = nodes[nodes.length - 1];
                    lastNode.x = cursorConnectX;
                    lastNode.y = cursorConnectY;
                }

                for (let i = 0; i < nodes.length - 1; i++) {
                    const n1 = nodes[i];
                    const n2 = nodes[i + 1];

                    const dx = n2.x - n1.x;
                    const dy = n2.y - n1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist === 0) continue;
                    const diff = SEGMENT_LENGTH - dist;
                    const percent = diff / dist / 2;
                    const offsetX = dx * percent;
                    const offsetY = dy * percent;

                    if (i === 0) {
                        // First node is fixed
                        n2.x += offsetX * 2;
                        n2.y += offsetY * 2;
                    } else if (i === nodes.length - 2 && !isDetached && !isMobileFrame) {
                        // Last node is fixed when attached
                        n1.x -= offsetX * 2;
                        n1.y -= offsetY * 2;
                    } else {
                        n1.x -= offsetX;
                        n1.y -= offsetY;
                        n2.x += offsetX;
                        n2.y += offsetY;
                    }
                }
            }

            // Tension & Vibration Calculation (Visual Only)
            const firstNode = nodes[0];
            const lastNode = nodes[nodes.length - 1];
            const currentDist = Math.sqrt(Math.pow(lastNode.x - firstNode.x, 2) + Math.pow(lastNode.y - firstNode.y, 2));
            const tension = Math.max(0, Math.min(1, (currentDist - WIRE_LENGTH * 0.9) / (WIRE_LENGTH * 0.4)));

            // Harmonic vibration: REMOVED as per user request
            let vibX = 0;
            let vibY = 0;

            // Temporarily displace nodes for rendering to create "buzz" effect (Disabled: offsets are 0)
            for (let i = 1; i < nodes.length - 1; i++) {
                const nodeFactor = Math.sin((i / (nodes.length - 1)) * Math.PI);
                nodes[i].x += vibX * nodeFactor;
                nodes[i].y += vibY * nodeFactor;
            }

            // Sync connection circle (the orange dot)
            if (connectionDots[index]) {
                connectionDots[index].setAttribute("cx", anchor.x);
                connectionDots[index].setAttribute("cy", anchor.y);
            }

            // Render SVG path
            wires[index].setAttribute('d', generateWirePath(nodes));

            // Manage opacity for detached wires
            if (isDetached) {
                wires[index].style.opacity = '0.3';
            } else {
                wires[index].style.opacity = '1';
            }

            // Restore nodes after render
            for (let i = 1; i < nodes.length - 1; i++) {
                const nodeFactor = Math.sin((i / (nodes.length - 1)) * Math.PI);
                nodes[i].x -= vibX * nodeFactor;
                nodes[i].y -= vibY * nodeFactor;
            }

            // Tension color shift
            const r = Math.round(255 - tension * 30);
            const g = Math.round(107 - tension * 20);
            const b = Math.round(53 - tension * 15);
            wires[index].style.stroke = `rgb(${r}, ${g}, ${b})`;
        });
    }


    window.addEventListener('resize', () => {
        state.wireRestLength = window.innerWidth * 0.25;
        state.isDesktop = window.innerWidth > 1024;
        updateWordAnchors();
        updateTickerConfigFull(); // Correctly update TOTAL_WIDTH on resize
    });

    // Footer text animation (Website 5)
    const footerCatchyText = document.querySelector('.footer-catchy-text');
    if (footerCatchyText) {
        const footerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, { threshold: 0.3 });
        footerObserver.observe(footerCatchyText);
    }

    // Hide nav-cta when footer reveal begins
    const navCta = document.querySelector('.nav-cta');
    if (navCta) {
        window.addEventListener('scroll', () => {
            const scrollPos = window.scrollY;
            const docHeight = document.documentElement.scrollHeight;
            const winHeight = window.innerHeight;

            // Hide as soon as we start entering the footer gap (last 100vh of page)
            if (scrollPos > docHeight - winHeight * 1.2) {
                navCta.classList.add('hidden');
            } else {
                navCta.classList.remove('hidden');
            }
        }, { passive: true });
    }

    // Footer Visibility Guard (Prevents peeking on mobile)
    const footer = document.getElementById('footer');
    if (footer) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    footer.style.visibility = 'visible';
                    footer.style.pointerEvents = 'auto';
                } else {
                    footer.style.visibility = 'hidden';
                    footer.style.pointerEvents = 'none';
                }
            });
        }, { threshold: 0.01 });
        observer.observe(footer);
    }
});

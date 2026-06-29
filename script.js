/**
 * Valentine's Day Interactive App
 * Pure ES6 — zero dependencies
 */

'use strict';

/* ─────────────────────────────────────────
   DOM REFS
───────────────────────────────────────── */
const mainScreen    = document.getElementById('main-screen');
const yesScreen     = document.getElementById('yes-screen');
const yesBtn        = document.getElementById('yes-btn');
const noBtn         = document.getElementById('no-btn');
const questionCard  = document.getElementById('question-card');
const yesCard       = document.getElementById('yes-card');
const heartsEl      = document.getElementById('hearts-container');
const sparklesEl    = document.getElementById('sparkles-container');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx           = confettiCanvas.getContext('2d');

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let noClickCount  = 0;
let heartInterval = null;
let confettiRAF   = null;
let confettiPieces = [];
let noMoveTimeout  = null;
const NO_MESSAGES  = [
  'No',
  'What if I asked really nicely?',
  'Please?',
  "I'm begging",
  'Think again',
  'Are you sure?',
  'Last chance',
  'Pretty please',
  "Don't break my heart",
  'Still no?',
  "I'll cry",
  "You don't mean that",
  'Come on',
  "You're making this hard",
  'Please click yes',
  '😭',
];

/* ─────────────────────────────────────────
   AUDIO  (Web Audio API — no files needed)
───────────────────────────────────────── */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playPop() {
  try {
    const ac  = getAudioCtx();
    const osc = ac.createOscillator();
    const env = ac.createGain();

    osc.connect(env);
    env.connect(ac.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ac.currentTime + 0.1);

    env.gain.setValueAtTime(0.22, ac.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);

    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.2);
  } catch (_) { /* AudioContext blocked — silent fail */ }
}

function playCelebration() {
  try {
    const ac = getAudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C

    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const env = ac.createGain();
      osc.connect(env);
      env.connect(ac.destination);

      osc.type = 'sine';
      const t = ac.currentTime + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);

      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.18, t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch (_) { /* silent fail */ }
}

/* ─────────────────────────────────────────
   NO BUTTON — GROW YES / SHRINK & MOVE NO
───────────────────────────────────────── */
function getRandomPosition(el) {
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const w   = el.offsetWidth  + 16;
  const h   = el.offsetHeight + 16;
  const x   = Math.random() * (vw - w);
  const y   = Math.random() * (vh - h);
  return { x, y };
}

function moveNoBtn() {
  // Switch to fixed positioning so it can roam anywhere on screen
  noBtn.style.position = 'fixed';
  noBtn.style.bottom   = 'auto';

  const { x, y } = getRandomPosition(noBtn);
  noBtn.style.left = `${x}px`;
  noBtn.style.top  = `${y}px`;

  // Bounce animation
  noBtn.style.transition = 'left 0.25s cubic-bezier(0.34,1.56,0.64,1), top 0.25s cubic-bezier(0.34,1.56,0.64,1), transform 0.15s ease, font-size 0.3s ease, padding 0.3s ease';
}

noBtn.addEventListener('click', () => {
  noClickCount++;
  playPop();

  // Update message
  const msg = NO_MESSAGES[Math.min(noClickCount, NO_MESSAGES.length - 1)];
  noBtn.textContent = msg;

  // Shrink NO (min 0.6em font)
  const newFontSize = Math.max(0.6, 1.0 - noClickCount * 0.035);
  const newPadding  = Math.max(6,   14  - noClickCount * 0.8);
  noBtn.style.fontSize = `${newFontSize}rem`;
  noBtn.style.padding  = `${newPadding}px ${newPadding * 2}px`;

  // Grow YES
  const yesFactor = 1 + noClickCount * 0.12;
  yesBtn.style.transform = `scale(${Math.min(yesFactor, 2.6)})`;

  // Move NO to a random spot
  moveNoBtn();

  // Accessibility: update aria-label
  noBtn.setAttribute('aria-label', `No button: ${msg}`);
});

/* Keyboard: pressing Enter/Space on NO still triggers click above.
   For arrow-key accessibility, make NO escape on keydown */
noBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    noBtn.click();
  }
});

/* ─────────────────────────────────────────
   YES BUTTON
───────────────────────────────────────── */
yesBtn.addEventListener('click', () => {
  playCelebration();
  triggerYesSequence();
});

yesBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    yesBtn.click();
  }
});

/* ─────────────────────────────────────────
   YES SEQUENCE
───────────────────────────────────────── */
function triggerYesSequence() {
  // Fade out main screen
  mainScreen.style.transition = 'opacity 0.5s ease';
  mainScreen.style.opacity    = '0';

  setTimeout(() => {
    mainScreen.style.display = 'none';
    yesScreen.classList.remove('hidden');

    // Start effects
    startHearts();
    startConfetti();
    spawnSparklesLoop();
  }, 480);
}

/* ─────────────────────────────────────────
   FLOATING HEARTS
───────────────────────────────────────── */
const HEART_EMOJIS = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🩷', '💖', '💗', '💝'];

function createHeart() {
  const heart = document.createElement('span');
  heart.className = 'heart';
  heart.textContent = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];

  const size      = 14 + Math.random() * 26;  // 14–40px
  const xPercent  = Math.random() * 96;        // 0–96vw
  const duration  = 2.8 + Math.random() * 3.2; // 2.8–6s

  heart.style.fontSize        = `${size}px`;
  heart.style.left            = `${xPercent}vw`;
  heart.style.animationDuration = `${duration}s`;

  heartsEl.appendChild(heart);

  // Remove after animation completes
  heart.addEventListener('animationend', () => heart.remove(), { once: true });
}

function startHearts() {
  // Immediate burst
  for (let i = 0; i < 8; i++) {
    setTimeout(createHeart, i * 60);
  }
  // Then continuous
  heartInterval = setInterval(createHeart, 150);
  // Stop generating after 10 s but leave existing ones to float away
  setTimeout(() => clearInterval(heartInterval), 10_000);
}

/* ─────────────────────────────────────────
   CONFETTI
───────────────────────────────────────── */
const CONFETTI_COLORS = [
  '#ff6b9d', '#ff8fab', '#ffd700', '#ff4d6d',
  '#a8dadc', '#457b9d', '#e63946', '#2ec4b6',
  '#f72585', '#7b2d8b',
];

class ConfettiPiece {
  constructor(cx, cy) {
    this.x   = cx;
    this.y   = cy;
    this.vx  = (Math.random() - 0.5) * 14;
    this.vy  = -(Math.random() * 12 + 6);
    this.ay  = 0.4;           // gravity
    this.w   = 6 + Math.random() * 10;
    this.h   = 4 + Math.random() * 7;
    this.rot = Math.random() * Math.PI * 2;
    this.dRot= (Math.random() - 0.5) * 0.25;
    this.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    this.alpha = 1;
    this.life  = 0;
    this.maxLife = 90 + Math.random() * 60;
    this.shape = Math.random() < 0.35 ? 'circle' : 'rect';
  }

  update() {
    this.vx *= 0.99;
    this.vy += this.ay;
    this.x  += this.vx;
    this.y  += this.vy;
    this.rot += this.dRot;
    this.life++;
    this.alpha = Math.max(0, 1 - this.life / this.maxLife);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle   = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    }
    ctx.restore();
  }

  get dead() { return this.life >= this.maxLife; }
}

function resizeCanvas() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function startConfetti() {
  resizeCanvas();

  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;

  // Initial burst
  for (let i = 0; i < 160; i++) confettiPieces.push(new ConfettiPiece(cx, cy));

  // Second wave
  setTimeout(() => {
    for (let i = 0; i < 80; i++) confettiPieces.push(new ConfettiPiece(cx, cy));
  }, 600);

  function loop() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces = confettiPieces.filter(p => !p.dead);
    confettiPieces.forEach(p => { p.update(); p.draw(ctx); });

    if (confettiPieces.length > 0) {
      confettiRAF = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  confettiRAF = requestAnimationFrame(loop);
}

/* ─────────────────────────────────────────
   SPARKLES
───────────────────────────────────────── */
function spawnSparkle() {
  const s = document.createElement('div');
  s.className = 'sparkle';

  const x  = 10 + Math.random() * 80;  // vw %
  const y  = 10 + Math.random() * 80;  // vh %
  const tx = (Math.random() - 0.5) * 120;
  const ty = -(30 + Math.random() * 90);
  const dur= 0.6 + Math.random() * 0.7;
  const colors = ['#ff6b9d','#ffd700','#ff8fab','#fff','#a8dadc'];
  const color  = colors[Math.floor(Math.random() * colors.length)];

  s.style.left = `${x}vw`;
  s.style.top  = `${y}vh`;
  s.style.background = color;
  s.style.setProperty('--tx', `translate(${tx}px, ${ty}px)`);
  s.style.animationDuration = `${dur}s`;

  sparklesEl.appendChild(s);
  s.addEventListener('animationend', () => s.remove(), { once: true });
}

function spawnSparklesLoop() {
  let count = 0;
  const max  = 60;
  const tick = () => {
    spawnSparkle();
    if (++count < max) setTimeout(tick, 80 + Math.random() * 60);
  };
  tick();
}

/* ─────────────────────────────────────────
   RESIZE HANDLER
───────────────────────────────────────── */
window.addEventListener('resize', () => {
  resizeCanvas();

  // If NO btn is fixed-positioned, re-clamp to viewport
  if (noBtn.style.position === 'fixed') {
    moveNoBtn();
  }
});

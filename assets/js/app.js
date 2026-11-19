/* ============================================================
   ARCANA — 3-Card AI Tarot Experience
   Main Application Script (Interactive Deck + Vision Photo Mode)
   ============================================================ */

(function () {
  'use strict';

  // ── 20-Card Canonical Catalog (Optimized WebP with JPEG fallback) ───
  const CARDS_CATALOG = [
    { id: 'card_00', number: 'Card 0',  name: 'The Fool',           fileName: 'Card 0 - The Fool.webp',         fallback: 'Card 0 - The Fool.jpg' },
    { id: 'card_01', number: 'Card 1',  name: 'The Magician',       fileName: 'Card 1 - The Magician .webp',    fallback: 'Card 1 - The Magician .jpg' },
    { id: 'card_02', number: 'Card 2',  name: 'The High Priestess',  fileName: 'Card 2 - The High Priestess.webp', fallback: 'Card 2 - The High Priestess.jpg' },
    { id: 'card_03', number: 'Card 3',  name: 'The Empress',        fileName: 'Card 3 - The Empress.webp',       fallback: 'Card 3 - The Empress.jpg' },
    { id: 'card_04', number: 'Card 4',  name: 'The Emperor',        fileName: 'Card 4 - The Emperor.webp',       fallback: 'Card 4 - The Emperor.jpg' },
    { id: 'card_05', number: 'Card 5',  name: 'The Herophant',      fileName: 'Card 5 - The Herophant.webp',     fallback: 'Card 5 - The Herophant.jpg' },
    { id: 'card_06', number: 'Card 6',  name: 'The Lovers',         fileName: 'Card 6 - The Lovers.webp',        fallback: 'Card 6 - The Lovers.jpg' },
    { id: 'card_07', number: 'Card 7',  name: 'The Chariot',        fileName: 'Card 7 - The Chariot.webp',       fallback: 'Card 7 - The Chariot.jpg' },
    { id: 'card_08', number: 'Card 8',  name: 'The Strength',       fileName: 'Card 8 - The Strength.webp',      fallback: 'Card 8 - The Strength.jpg' },
    { id: 'card_09', number: 'Card 9',  name: 'The Hermit',         fileName: 'Card 9 - The Hermit.webp',        fallback: 'Card 9 - The Hermit.jpg' },
    { id: 'card_10', number: 'Card 10', name: 'Wheel Of Fortune',   fileName: 'Card 10 - Wheel Of Fortune.webp', fallback: 'Card 10 - Wheel Of Fortune.jpg' },
    { id: 'card_11', number: 'Card 11', name: 'Justice',            fileName: 'Card 11 - Justice.webp',          fallback: 'Card 11 - Justice.jpg' },
    { id: 'card_12', number: 'Card 12', name: 'The Hanged Man',     fileName: 'Card 12 - The Hanged Man.webp',   fallback: 'Card 12 - The Hanged Man.jpg' },
    { id: 'card_13', number: 'Card 13', name: 'Death',              fileName: 'Card 13 - Death.webp',            fallback: 'Card 13 - Death.jpg' },
    { id: 'card_14', number: 'Card 14', name: 'Temperance',         fileName: 'Card 14 - Temperance.webp',       fallback: 'Card 14 - Temperance.jpg' },
    { id: 'card_15', number: 'Card 15', name: 'The Devil',          fileName: 'Card 15 - The Devil.webp',        fallback: 'Card 15 - The Devil.jpg' },
    { id: 'card_16', number: 'Card 16', name: 'The Tower',          fileName: 'Card 16 - The Tower.webp',        fallback: 'Card 16 - The Tower.jpg' },
    { id: 'card_17', number: 'Card 17', name: 'The Star',           fileName: 'Card 17 - The Star.webp',         fallback: 'Card 17 - The Star.jpg' },
    { id: 'card_18', number: 'Card 18', name: 'The Moon',           fileName: 'Card 18 - The Moon.webp',         fallback: 'Card 18 - The Moon.jpg' },
    { id: 'card_19', number: 'Card 19', name: 'The Sun',            fileName: 'Card 19 - The Sun.webp',          fallback: 'Card 19 - The Sun.jpg' }
  ];

  // ── DOM References ──────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Tabs
  const tabDeck             = $('#tabDeck');
  const tabPhoto            = $('#tabPhoto');
  const deckModeContainer   = $('#deckModeContainer');
  const photoModeContainer  = $('#photoModeContainer');
  const cardLibrarySection  = $('#cardLibrarySection');

  // Deck Mode Elements
  const cardCounter         = $('#cardCounter');
  const drawRandomBtn       = $('#drawRandomBtn');
  const clearSpreadBtn      = $('#clearSpreadBtn');
  const cardLibraryEl       = $('#cardLibrary');

  // 3 Deck Slots
  const POSITIONS = ['past', 'present', 'future'];
  const POS_LABELS = { past: 'Past', present: 'Present', future: 'Future' };

  const slotEls = {
    past: {
      slot: $('#slotPast'),
      prompt: $('#promptPast'),
      display: $('#displayPast'),
      img: $('#imgPast'),
      name: $('#namePast'),
      orientBtn: $('#orientPast'),
      removeBtn: $('#slotRemovePast')
    },
    present: {
      slot: $('#slotPresent'),
      prompt: $('#promptPresent'),
      display: $('#displayPresent'),
      img: $('#imgPresent'),
      name: $('#namePresent'),
      orientBtn: $('#orientPresent'),
      removeBtn: $('#slotRemovePresent')
    },
    future: {
      slot: $('#slotFuture'),
      prompt: $('#promptFuture'),
      display: $('#displayFuture'),
      img: $('#imgFuture'),
      name: $('#nameFuture'),
      orientBtn: $('#orientFuture'),
      removeBtn: $('#slotRemoveFuture')
    }
  };

  // Common Controls
  const questionEl          = $('#question');
  const charCount           = $('#charCount');
  const readBtn             = $('#readBtn');
  const cancelBtn           = $('#cancelBtn');
  const statusEl            = $('#status');
  const readingEl           = $('#reading');
  const resultEl            = $('#result');
  const readingSub          = $('#readingSub');
  const spreadSummaryPills  = $('#spreadSummaryPills');
  const copyBtn             = $('#copyBtn');
  const newBtn              = $('#newBtn');
  const stopServerBtn       = $('#stopServerBtn');
  const photoCounter        = $('#photoCounter');

  // ── State ───────────────────────────────────────────────────
  let currentMode = 'deck'; // 'deck' | 'photo'
  let spread = 'general';
  let currentReading = '';
  let isRequesting = false;
  let currentAbortController = null;

  // Deck Slots State: { id, number, name, fileName, reversed: boolean } or null
  const deckSlots = {
    past: null,
    present: null,
    future: null
  };

  // Photo Mode Slots State
  const photoSlots = [
    { data: null, mime: null, name: null },
    { data: null, mime: null, name: null },
    { data: null, mime: null, name: null }
  ];

  const MAX_QUESTION  = 500;
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const API_ENDPOINT  = '/api/reading';

  // ── Mode Switcher Logic ─────────────────────────────────────
  function switchMode(mode) {
    currentMode = mode;
    const isDeck = mode === 'deck';

    if (tabDeck) tabDeck.classList.toggle('active', isDeck);
    if (tabPhoto) tabPhoto.classList.toggle('active', !isDeck);

    if (deckModeContainer) deckModeContainer.style.display = isDeck ? '' : 'none';
    if (cardLibrarySection) cardLibrarySection.style.display = isDeck ? '' : 'none';
    if (photoModeContainer) photoModeContainer.style.display = isDeck ? 'none' : 'block';

    if (isDeck) {
      updateDeckUI();
      readBtn.textContent = 'Reveal my reading ✦';
    } else {
      updatePhotoCounter();
      readBtn.textContent = 'Reveal reading from photo ✦';
    }
    setStatus('');
  }

  if (tabDeck) tabDeck.addEventListener('click', () => switchMode('deck'));
  if (tabPhoto) tabPhoto.addEventListener('click', () => switchMode('photo'));

  // ── Status & Dynamic Progress Helpers ───────────────────────
  function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('error', !!isError);
  }

  let progressTimer = null;
  function startProgressFeedback() {
    stopProgressFeedback();
    const stages = [
      { text: 'Consulting the 3-card spread archetypes' },
      { text: 'Connecting Past foundation with Present dynamics' },
      { text: 'Unfolding emerging Future potentials' },
      { text: 'Synthesizing deeply grounded guidance' }
    ];
    let step = 0;
    const runNext = () => {
      if (!isRequesting || !statusEl) return;
      statusEl.innerHTML = `<span>✧</span> ${stages[step].text}<span class="loading-dots"></span>`;
      statusEl.classList.remove('error');
      step = (step + 1) % stages.length;
      progressTimer = setTimeout(runNext, 2600);
    };
    runNext();
  }

  function stopProgressFeedback() {
    if (progressTimer) {
      clearTimeout(progressTimer);
      progressTimer = null;
    }
  }

  function setLoading(active) {
    if (!statusEl) return;
    if (active) {
      startProgressFeedback();
    } else {
      stopProgressFeedback();
    }
  }

  // ── Deck Mode Slot Management ───────────────────────────────
  function updateDeckUI() {
    const filledCount = POSITIONS.filter((pos) => deckSlots[pos] !== null).length;
    if (cardCounter) {
      cardCounter.textContent = `${filledCount} / 3 cards selected`;
      cardCounter.classList.toggle('ready', filledCount === 3);
    }

    // Determine the next target slot waiting for placement
    let nextAssigned = false;
    POSITIONS.forEach((pos) => {
      const el = slotEls[pos];
      if (!el || !el.slot) return;
      const isFilled = deckSlots[pos] !== null;

      el.slot.classList.toggle('filled', isFilled);

      if (!isFilled && !nextAssigned) {
        el.slot.classList.add('next');
        nextAssigned = true;
      } else {
        el.slot.classList.remove('next');
      }
    });

    // Update library button badges
    CARDS_CATALOG.forEach((card) => {
      const btn = $(`[data-card-id="${card.id}"]`);
      if (!btn) return;

      const assignedPos = POSITIONS.find((pos) => deckSlots[pos] && deckSlots[pos].id === card.id);
      const badge = btn.querySelector('.lib-selected-badge');

      if (assignedPos) {
        btn.classList.add('selected');
        if (badge) {
          badge.textContent = POS_LABELS[assignedPos];
          badge.style.display = 'inline-block';
        }
      } else {
        btn.classList.remove('selected');
        if (badge) {
          badge.style.display = 'none';
        }
      }
    });
  }

  function assignCardToSlot(pos, card, reversed = false) {
    deckSlots[pos] = {
      id: card.id,
      number: card.number,
      name: card.name,
      fileName: card.fileName,
      reversed: !!reversed
    };

    const el = slotEls[pos];
    if (el) {
      if (el.img) {
        el.img.decoding = 'async';
        el.img.src = `tarot-cards-images/${encodeURIComponent(card.fileName)}`;
        el.img.alt = `${card.name} (${card.number})`;
        el.img.classList.toggle('reversed', !!reversed);
        el.img.onerror = () => {
          if (card.fallback && !el.img.dataset.fallbackTried) {
            el.img.dataset.fallbackTried = '1';
            el.img.src = `tarot-cards-images/${encodeURIComponent(card.fallback)}`;
          }
        };
      }
      if (el.name) {
        el.name.textContent = `${card.name}`;
      }
      if (el.orientBtn) {
        el.orientBtn.classList.toggle('is-reversed', !!reversed);
        const labelSpan = el.orientBtn.querySelector('.orient-label');
        if (labelSpan) labelSpan.textContent = reversed ? 'Reversed' : 'Upright';
      }
      if (el.prompt) el.prompt.style.display = 'none';
      if (el.display) el.display.style.display = 'flex';
      if (el.slot) el.slot.classList.add('filled');
    }

    updateDeckUI();
  }

  function clearDeckSlot(pos) {
    deckSlots[pos] = null;
    const el = slotEls[pos];
    if (el) {
      if (el.img) {
        el.img.src = '';
        el.img.alt = '';
        el.img.classList.remove('reversed');
      }
      if (el.name) el.name.textContent = '';
      if (el.orientBtn) {
        el.orientBtn.classList.remove('is-reversed');
        const labelSpan = el.orientBtn.querySelector('.orient-label');
        if (labelSpan) labelSpan.textContent = 'Upright';
      }
      if (el.display) el.display.style.display = 'none';
      if (el.prompt) el.prompt.style.display = '';
      if (el.slot) el.slot.classList.remove('filled');
    }

    updateDeckUI();
    setStatus('');
  }

  function toggleOrientation(pos) {
    if (!deckSlots[pos]) return;
    deckSlots[pos].reversed = !deckSlots[pos].reversed;
    const isRev = deckSlots[pos].reversed;

    const el = slotEls[pos];
    if (el) {
      if (el.img) el.img.classList.toggle('reversed', isRev);
      if (el.orientBtn) {
        el.orientBtn.classList.toggle('is-reversed', isRev);
        const labelSpan = el.orientBtn.querySelector('.orient-label');
        if (labelSpan) labelSpan.textContent = isRev ? 'Reversed' : 'Upright';
      }
    }
  }

  // Bind Slot Remove & Orientation Toggles
  POSITIONS.forEach((pos) => {
    const el = slotEls[pos];
    if (!el) return;

    if (el.removeBtn) {
      el.removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearDeckSlot(pos);
      });
    }

    if (el.orientBtn) {
      el.orientBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleOrientation(pos);
      });
    }
  });

  // ── Render Card Library Grid ────────────────────────────────
  function renderCardLibrary() {
    if (!cardLibraryEl) return;
    cardLibraryEl.innerHTML = '';

    CARDS_CATALOG.forEach((card) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lib-card-btn';
      btn.dataset.cardId = card.id;
      btn.title = `${card.name} (${card.number}) — Click to select`;

      btn.innerHTML = `
        <div class="lib-card-img-wrap">
          <img class="lib-card-img" src="tarot-cards-images/${encodeURIComponent(card.fileName)}" alt="${card.name}" loading="lazy" decoding="async">
        </div>
        <div class="lib-card-name">${card.name}</div>
        <div class="lib-card-num">${card.number}</div>
        <span class="lib-selected-badge" style="display:none;"></span>
      `;

      const cardImg = btn.querySelector('.lib-card-img');
      if (cardImg) {
        cardImg.onerror = () => {
          if (card.fallback && !cardImg.dataset.fallbackTried) {
            cardImg.dataset.fallbackTried = '1';
            cardImg.src = `tarot-cards-images/${encodeURIComponent(card.fallback)}`;
          }
        };
      }

      btn.addEventListener('click', () => handleCardLibraryClick(card));
      cardLibraryEl.appendChild(btn);
    });
  }

  function handleCardLibraryClick(card) {
    // If already in a slot, deselect it
    const existingPos = POSITIONS.find((pos) => deckSlots[pos] && deckSlots[pos].id === card.id);
    if (existingPos) {
      clearDeckSlot(existingPos);
      return;
    }

    // Otherwise, place into first available empty slot
    const firstEmptyPos = POSITIONS.find((pos) => deckSlots[pos] === null);
    if (!firstEmptyPos) {
      setStatus('Your spread is full. Remove a card or click "Clear spread" to choose another.');
      return;
    }

    assignCardToSlot(firstEmptyPos, card, false);

    const filledCount = POSITIONS.filter((pos) => deckSlots[pos] !== null).length;
    if (filledCount === 3) {
      setStatus(`${card.name} placed in ${POS_LABELS[firstEmptyPos]}. Your 3-card spread is ready — reveal your reading.`);
    } else {
      setStatus(`${card.name} placed in ${POS_LABELS[firstEmptyPos]}. Choose ${3 - filledCount} more.`);
    }
  }

  // ── Quick Toolbar Actions ───────────────────────────────────
  if (drawRandomBtn) {
    drawRandomBtn.addEventListener('click', () => {
      // Pick 3 unique random cards
      const shuffled = [...CARDS_CATALOG].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);

      POSITIONS.forEach((pos, idx) => {
        const randomReversed = Math.random() < 0.35; // 35% chance of reversal
        assignCardToSlot(pos, selected[idx], randomReversed);
      });

      setStatus('3 cards drawn! Add your question and reveal your reading.');
    });
  }

  if (clearSpreadBtn) {
    clearSpreadBtn.addEventListener('click', () => {
      POSITIONS.forEach((pos) => clearDeckSlot(pos));
      setStatus('Spread cleared. Click cards from the deck below to build your spread.');
    });
  }

  // ── Photo Mode Logic ────────────────────────────────────────
  function updatePhotoCounter() {
    if (!photoCounter) return;
    const filledCount = photoSlots.filter((s) => s.data !== null).length;
    photoCounter.textContent = `${filledCount} / 3 photos uploaded`;
    photoCounter.classList.toggle('ready', filledCount === 3);
  }

  function resizeImage(dataUrl, maxDim = 1200, quality = 0.85) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', quality),
          mime: 'image/jpeg'
        });
      };
      img.onerror = () => resolve({ dataUrl, mime: 'image/jpeg' });
      img.src = dataUrl;
    });
  }

  function loadPhotoSlot(index, file) {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus(`Card ${index + 1}: Please choose a JPG, PNG or WEBP image.`, true);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus(`Card ${index + 1}: Image exceeds 25 MB.`, true);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setStatus(`Could not read file for Card ${index + 1}.`, true);
    reader.onload = async () => {
      const optimized = await resizeImage(reader.result);

      photoSlots[index].data = optimized.dataUrl;
      photoSlots[index].mime = optimized.mime;
      photoSlots[index].name = file.name;

      const num = index + 1;
      const preview = $(`#preview${num}`);
      const prompt  = $(`#prompt${num}`);
      const nameEl  = $(`#fileName${num}`);
      const remBtn  = $(`#removeBtn${num}`);
      const slotBox = $(`#slotContainer${num}`);

      if (preview) {
        preview.src = optimized.dataUrl;
        preview.style.display = 'block';
      }
      if (prompt) prompt.style.display = 'none';
      if (remBtn) remBtn.style.display = 'inline-flex';
      if (nameEl) nameEl.textContent = file.name;
      if (slotBox) slotBox.classList.add('filled');

      updatePhotoCounter();
      const filled = photoSlots.filter((s) => s.data !== null).length;
      if (filled === 3) {
        setStatus('All 3 card photos uploaded. Reveal your reading.');
      } else {
        setStatus(`Card ${num} uploaded. Please upload ${3 - filled} more.`);
      }
    };
    reader.readAsDataURL(file);
  }

  function clearPhotoSlot(index) {
    photoSlots[index].data = null;
    photoSlots[index].mime = null;
    photoSlots[index].name = null;

    const num = index + 1;
    const preview = $(`#preview${num}`);
    const prompt  = $(`#prompt${num}`);
    const nameEl  = $(`#fileName${num}`);
    const remBtn  = $(`#removeBtn${num}`);
    const input   = $(`#photo${num}`);
    const slotBox = $(`#slotContainer${num}`);

    if (preview) {
      preview.src = '';
      preview.style.display = 'none';
    }
    if (prompt) prompt.style.display = '';
    if (nameEl) nameEl.textContent = 'Empty';
    if (remBtn) remBtn.style.display = 'none';
    if (slotBox) slotBox.classList.remove('filled');
    if (input) input.value = '';

    updatePhotoCounter();
    setStatus('');
  }

  // Bind Photo Mode Inputs
  for (let i = 0; i < 3; i++) {
    const num = i + 1;
    const input = $(`#photo${num}`);
    const dropzone = $(`#dropzone${num}`);
    const remBtn = $(`#removeBtn${num}`);

    if (input) {
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          loadPhotoSlot(i, e.target.files[0]);
        }
      });
    }

    if (dropzone) {
      ['dragenter', 'dragover'].forEach((ev) => {
        dropzone.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag');
        });
      });
      ['dragleave', 'drop'].forEach((ev) => {
        dropzone.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          loadPhotoSlot(i, e.dataTransfer.files[0]);
        }
      });
    }

    if (remBtn) {
      remBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearPhotoSlot(i);
      });
    }
  }

  // Prevent browser drag drop defaults outside zones
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  // ── Spread / Category Chips ─────────────────────────────────
  $$('.spread').forEach((btn) => {
    btn.addEventListener('click', () => {
      spread = btn.dataset.spread;
      $$('.spread').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  // ── Question Input & Counter ────────────────────────────────
  if (questionEl && charCount) {
    questionEl.addEventListener('input', () => {
      const len = questionEl.value.length;
      charCount.textContent = `${len} / ${MAX_QUESTION}`;
      charCount.style.color = len > MAX_QUESTION ? 'var(--danger)' : '';
    });
  }

  // ── Convert Deck Image to DataURL (for Gemini Multimodal) ───
  function cardToDataUrl(imgEl) {
    return new Promise((resolve) => {
      if (!imgEl || !imgEl.complete || imgEl.naturalWidth === 0) {
        resolve(null);
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(imgEl.naturalWidth, 800);
        canvas.height = Math.round((canvas.width / imgEl.naturalWidth) * imgEl.naturalHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(null);
      }
    });
  }

  // ── Lightweight Markdown Renderer ───────────────────────────
  function renderMarkdown(md) {
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^(?!<[hubloi])((?!<).+)$/gm, '<p>$1</p>');
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
  }

  // ── Submit Reading ──────────────────────────────────────────
  readBtn.addEventListener('click', async () => {
    if (isRequesting) return;

    // Check internet connectivity
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      setStatus('You appear to be offline. Please check your internet connection and try again.', true);
      return;
    }

    stopVoiceReader();

    let payloadCards = [];
    const question = (questionEl ? questionEl.value : '').trim().substring(0, MAX_QUESTION);

    if (currentMode === 'deck') {
      const missing = POSITIONS.filter((pos) => deckSlots[pos] === null);
      if (missing.length > 0) {
        const missingLabels = missing.map((p) => POS_LABELS[p]).join(', ');
        setStatus(`Please select all 3 cards from the deck (${missingLabels} missing).`, true);
        return;
      }

      // Performance Optimization: In deck mode, send archetypes directly
      // Cards are already canonical Major Arcana items fully defined in system prompt.
      // This eliminates base64 canvas rendering latency, saves ~700 KB payload, and accelerates AI inference.
      payloadCards = [
        {
          position: 1,
          label: 'Past',
          name: deckSlots.past.name,
          number: deckSlots.past.number,
          reversed: deckSlots.past.reversed
        },
        {
          position: 2,
          label: 'Present',
          name: deckSlots.present.name,
          number: deckSlots.present.number,
          reversed: deckSlots.present.reversed
        },
        {
          position: 3,
          label: 'Future',
          name: deckSlots.future.name,
          number: deckSlots.future.number,
          reversed: deckSlots.future.reversed
        }
      ];
    } else {
      // Photo Mode: Multimodal vision payload
      const missing = [];
      photoSlots.forEach((s, idx) => {
        if (!s.data) missing.push(`Card ${idx + 1}`);
      });

      if (missing.length > 0) {
        setStatus(`Please upload all 3 card photos (${missing.join(', ')} missing). Exactly 3 are required.`, true);
        return;
      }

      payloadCards = [
        { position: 1, label: 'Past',    image: photoSlots[0].data },
        { position: 2, label: 'Present', image: photoSlots[1].data },
        { position: 3, label: 'Future',  image: photoSlots[2].data }
      ];
    }

    isRequesting = true;
    readBtn.disabled = true;
    readBtn.textContent = 'Interpreting spread…';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    if (readingEl) readingEl.style.display = 'none';
    setLoading(true);

    currentAbortController = new AbortController();

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: currentAbortController.signal,
        body: JSON.stringify({
          cards: payloadCards,
          question: question,
          spread: spread,
          mode: currentMode
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 423) {
          showLockScreen();
          throw new Error(data.error || 'ARCANA is currently locked. The experience will begin shortly.');
        }
        if (res.status === 429) {
          throw new Error(data.error || 'The AI service quota is currently reached. Please wait a moment or try again later.');
        }
        if (res.status === 504) {
          throw new Error('The AI reading request timed out. Please try revealing again.');
        }
        throw new Error(data.error || 'The reading could not be generated. Please try again.');
      }

      currentReading = data.reading || 'No reading was returned.';
      if (resultEl) resultEl.innerHTML = renderMarkdown(currentReading);

      // Render summary pills
      if (spreadSummaryPills) {
        spreadSummaryPills.innerHTML = '';
        if (currentMode === 'deck') {
          POSITIONS.forEach((pos) => {
            const card = deckSlots[pos];
            if (card) {
              const pill = document.createElement('span');
              pill.className = 'summary-pill';
              pill.innerHTML = `<strong>${POS_LABELS[pos]}:</strong> ${card.name} (${card.reversed ? 'Reversed ↺' : 'Upright'})`;
              spreadSummaryPills.appendChild(pill);
            }
          });
        }
      }

      if (readingSub) {
        readingSub.textContent = `3-Card Spread · Grounded Reading · ${new Date().toLocaleDateString()}`;
      }

      if (readingEl) {
        readingEl.style.display = 'block';
        readingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Initialize AI Voice Reader for the new reading
      initVoiceReaderForCurrentReading();

      setStatus('');
    } catch (err) {
      if (err.name === 'AbortError') {
        setStatus('Reading interpretation was cancelled.');
      } else if (err.message && err.message.includes('Failed to fetch')) {
        setStatus('Connection to the server failed. Please check your internet connection.', true);
      } else {
        setStatus(err.message, true);
      }
    } finally {
      setLoading(false);
      isRequesting = false;
      readBtn.disabled = false;
      readBtn.textContent = currentMode === 'deck' ? 'Reveal my reading ✦' : 'Reveal reading from photo ✦';
      if (cancelBtn) cancelBtn.style.display = 'none';
      currentAbortController = null;
    }
  });

  // ── Terminate / Cancel Execution ────────────────────────────
  function terminateExecution() {
    stopVoiceReader();
    if (isRequesting && currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
      isRequesting = false;
      readBtn.disabled = false;
      readBtn.textContent = currentMode === 'deck' ? 'Reveal my reading ✦' : 'Reveal reading from photo ✦';
      if (cancelBtn) cancelBtn.style.display = 'none';
      setStatus('Interpretation terminated by user.');
    }
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      terminateExecution();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isRequesting) {
      terminateExecution();
    }
  });

  // ── Copy Reading ────────────────────────────────────────────
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(currentReading);
        copyBtn.textContent = 'Copied ✓';
        setTimeout(() => (copyBtn.textContent = 'Copy reading'), 1400);
      } catch {
        setStatus('Copy is unavailable in this browser.', true);
      }
    });
  }

  // ── New Reading ─────────────────────────────────────────────
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      stopVoiceReader();
      if (voiceReaderWrapper) voiceReaderWrapper.style.display = 'none';
      if (readingEl) readingEl.style.display = 'none';
      if (currentMode === 'deck') {
        POSITIONS.forEach((pos) => clearDeckSlot(pos));
      } else {
        for (let i = 0; i < 3; i++) clearPhotoSlot(i);
      }
      if (questionEl) questionEl.value = '';
      if (charCount) charCount.textContent = `0 / ${MAX_QUESTION}`;
      spread = 'general';
      $$('.spread').forEach((b) =>
        b.classList.toggle('active', b.dataset.spread === 'general')
      );
      $('#home').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ============================================================
  // AI VOICE READER — NARRATION & TEXT-TO-SPEECH ENGINE
  // ============================================================
  const voiceReaderWrapper     = $('#voiceReaderWrapper');
  const listenBtn              = $('#listenBtn');
  const listenBtnText          = $('#listenBtnText');
  const listenWaveAnim         = $('#listenWaveAnim');
  const voiceSettingsToggleBtn = $('#voiceSettingsToggleBtn');
  const voicePlayerCard        = $('#voicePlayerCard');
  const playerStatusDot        = $('#playerStatusDot');
  const playerStatusText       = $('#playerStatusText');
  const playerLangBadge        = $('#playerLangBadge');
  const playerLangText         = $('#playerLangText');
  const playerProgressTrack    = $('#playerProgressTrack');
  const playerProgressFill     = $('#playerProgressFill');
  const playerCurrentSection   = $('#playerCurrentSection');
  const playerProgressPercent  = $('#playerProgressPercent');
  const ctrlReplayBtn          = $('#ctrlReplayBtn');
  const ctrlPlayPauseBtn       = $('#ctrlPlayPauseBtn');
  const ctrlPlayIcon           = $('#ctrlPlayIcon');
  const ctrlPauseIcon          = $('#ctrlPauseIcon');
  const ctrlStopBtn            = $('#ctrlStopBtn');
  const voiceSettingsPanel     = $('#voiceSettingsPanel');
  const voiceSelect            = $('#voiceSelect');
  const rateSlider             = $('#rateSlider');
  const rateValue              = $('#rateValue');
  const pitchSlider            = $('#pitchSlider');
  const pitchValue             = $('#pitchValue');
  const filterAllVoices        = $('#filterAllVoices');
  const filterEnVoices         = $('#filterEnVoices');
  const filterHiVoices         = $('#filterHiVoices');
  const resetVoiceDefaultsBtn  = $('#resetVoiceDefaultsBtn');

  const voiceState = {
    isPlaying: false,
    isPaused: false,
    currentChunkIndex: 0,
    chunks: [],
    voices: [],
    selectedVoice: null,
    rate: 0.95,
    pitch: 1.0,
    detectedLang: 'en',
    voiceFilter: 'all',
    keepAliveTimer: null
  };

  // Language Detection
  function detectLanguage(text) {
    if (!text) return 'en';
    const hindiMatches = text.match(/[\u0900-\u097F]/g);
    if (hindiMatches && hindiMatches.length > 10) {
      return 'hi';
    }
    return 'en';
  }

  // Natural Markdown Cleaner & Section Segmenter for Speech
  function cleanMarkdownForSpeech(mdText) {
    if (!mdText) return [];

    const lines = mdText.split(/\r?\n/);
    const sections = [];
    let currentSectionName = 'Overview';
    let currentSectionLines = [];

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('## ') || line.startsWith('### ')) {
        if (currentSectionLines.length > 0) {
          sections.push({ name: currentSectionName, text: currentSectionLines.join(' ') });
          currentSectionLines = [];
        }
        currentSectionName = line.replace(/^#+\s*/, '').trim();
      } else {
        currentSectionLines.push(line);
      }
    }
    if (currentSectionLines.length > 0) {
      sections.push({ name: currentSectionName, text: currentSectionLines.join(' ') });
    }

    const speechChunks = [];

    sections.forEach((sec) => {
      let cleanHeader = sec.name
        .replace(/[*_#`~]/g, '')
        .replace(/✦|✧|↺/g, '')
        .trim();

      let text = sec.text
        .replace(/^[•\-\*]\s+/gm, '')
        .replace(/((?:Card\s*\d+)\s*\([^)]+\))/gi, (m) => m.replace(/[()]/g, ''))
        .replace(/\(([^)]+)\)/g, ', $1, ')
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^>\s*/gm, '')
        .replace(/↺/g, 'Reversed')
        .replace(/[✦✧★☆—–]/g, ' ')
        .replace(/&amp;/g, ' and ')
        .replace(/&lt;/g, ' ')
        .replace(/&gt;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const fullSectionText = `${cleanHeader}. ${text}`;

      // Chunk into ~120-160 character sentences to avoid Chrome 15-second cutoff bug
      const sentenceRegex = /[^.!?।]+[.!?।](\s|$)|[^.!?।]+$/g;
      const rawSentences = fullSectionText.match(sentenceRegex) || [fullSectionText];

      rawSentences.forEach((s) => {
        const trimmed = s.trim();
        if (trimmed.length > 0 && /[a-zA-Z0-9\u0900-\u097F]/.test(trimmed)) {
          speechChunks.push({
            section: cleanHeader,
            text: trimmed
          });
        }
      });
    });

    return speechChunks;
  }

  function prepareVoiceChunks() {
    voiceState.detectedLang = detectLanguage(currentReading);
    voiceState.chunks = cleanMarkdownForSpeech(currentReading);
    voiceState.currentChunkIndex = 0;

    autoSelectBestVoice();

    if (playerLangText) {
      playerLangText.textContent = voiceState.detectedLang === 'hi' ? 'Hindi Detected' : 'English Detected';
    }
  }

  // Voice Loading and Population
  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    const all = window.speechSynthesis.getVoices();
    if (!all || all.length === 0) return;
    voiceState.voices = all;

    autoSelectBestVoice();
    populateVoiceSelect();
  }

  function autoSelectBestVoice() {
    if (!voiceState.voices || voiceState.voices.length === 0) return;

    const targetLang = voiceState.detectedLang; // 'hi' or 'en'
    let best = null;

    if (targetLang === 'hi') {
      best = voiceState.voices.find((v) => v.lang.startsWith('hi'));
    }

    if (!best) {
      // Find natural / premium English voice
      best = voiceState.voices.find((v) =>
        v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))
      ) || voiceState.voices.find((v) =>
        v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Victoria'))
      ) || voiceState.voices.find((v) => v.lang.startsWith('en')) || voiceState.voices[0];
    }

    if (best) {
      voiceState.selectedVoice = best;
    }
  }

  function populateVoiceSelect() {
    if (!voiceSelect || !voiceState.voices.length) return;
    voiceSelect.innerHTML = '';

    const filter = voiceState.voiceFilter;
    let filtered = voiceState.voices;

    if (filter === 'en') {
      filtered = voiceState.voices.filter((v) => v.lang.startsWith('en'));
    } else if (filter === 'hi') {
      filtered = voiceState.voices.filter((v) => v.lang.startsWith('hi'));
    }

    if (filtered.length === 0) {
      filtered = voiceState.voices;
    }

    // Sort voices prioritizing matching language
    const targetLang = voiceState.detectedLang;
    const sorted = [...filtered].sort((a, b) => {
      const aMatches = a.lang.startsWith(targetLang) ? 1 : 0;
      const bMatches = b.lang.startsWith(targetLang) ? 1 : 0;
      return bMatches - aMatches;
    });

    sorted.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})${v.default ? ' — System Default' : ''}`;
      if (voiceState.selectedVoice && voiceState.selectedVoice.name === v.name) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });
  }

  // Playback queue & Chunk Runner
  function speakNextChunk() {
    if (!voiceState.isPlaying || voiceState.isPaused) return;

    if (voiceState.currentChunkIndex >= voiceState.chunks.length) {
      stopVoiceReader();
      if (playerStatusText) playerStatusText.textContent = 'Narration completed ✦';
      if (playerCurrentSection) playerCurrentSection.textContent = 'Complete';
      if (playerProgressPercent) playerProgressPercent.textContent = '100%';
      if (playerProgressFill) playerProgressFill.style.width = '100%';
      return;
    }

    const chunk = voiceState.chunks[voiceState.currentChunkIndex];
    const utterance = new SpeechSynthesisUtterance(chunk.text);

    if (voiceState.selectedVoice) {
      utterance.voice = voiceState.selectedVoice;
    }
    utterance.rate = voiceState.rate;
    utterance.pitch = voiceState.pitch;
    utterance.lang = voiceState.detectedLang === 'hi' ? 'hi-IN' : 'en-US';

    utterance.onstart = () => {
      updateProgressUI(voiceState.currentChunkIndex);
      updatePlayerUI();
    };

    utterance.onend = () => {
      if (!voiceState.isPlaying || voiceState.isPaused) return;
      voiceState.currentChunkIndex++;

      const nextChunk = voiceState.chunks[voiceState.currentChunkIndex];
      const pauseDuration = (nextChunk && nextChunk.section !== chunk.section) ? 550 : 120;

      setTimeout(() => {
        if (voiceState.isPlaying && !voiceState.isPaused) {
          speakNextChunk();
        }
      }, pauseDuration);
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('Speech synthesis warning:', e.error);
      voiceState.currentChunkIndex++;
      if (voiceState.isPlaying && !voiceState.isPaused) {
        setTimeout(speakNextChunk, 150);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function playVoiceReader() {
    if (!('speechSynthesis' in window)) {
      setStatus('Text-to-speech is not supported by your browser.', true);
      return;
    }

    if (voiceState.chunks.length === 0) {
      prepareVoiceChunks();
    }

    if (voiceState.chunks.length === 0) {
      setStatus('No reading text available to narrate.', true);
      return;
    }

    if (voiceState.isPaused && window.speechSynthesis.paused) {
      voiceState.isPaused = false;
      voiceState.isPlaying = true;
      window.speechSynthesis.resume();
      updatePlayerUI();
      startKeepAlive();
      return;
    }

    window.speechSynthesis.cancel();
    voiceState.isPlaying = true;
    voiceState.isPaused = false;
    updatePlayerUI();
    startKeepAlive();
    // 50ms decoupling tick prevents cancellation race condition on Chromium/Edge
    setTimeout(() => {
      if (!voiceState.isPlaying || voiceState.isPaused) return;
      speakNextChunk();
    }, 50);
  }

  function pauseVoiceReader() {
    if (!voiceState.isPlaying || voiceState.isPaused) return;
    voiceState.isPaused = true;
    window.speechSynthesis.pause();
    stopKeepAlive();
    updatePlayerUI();
  }

  function stopVoiceReader() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopKeepAlive();
    voiceState.isPlaying = false;
    voiceState.isPaused = false;
    voiceState.currentChunkIndex = 0;
    updatePlayerUI();
    updateProgressUI(0);
  }

  function replayVoiceReader() {
    stopVoiceReader();
    voiceState.currentChunkIndex = 0;
    setTimeout(() => {
      playVoiceReader();
    }, 120);
  }

  function startKeepAlive() {
    stopKeepAlive();
    voiceState.keepAliveTimer = setInterval(() => {
      if (!voiceState.isPlaying || voiceState.isPaused) return;
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 12000);
  }

  function stopKeepAlive() {
    if (voiceState.keepAliveTimer) {
      clearInterval(voiceState.keepAliveTimer);
      voiceState.keepAliveTimer = null;
    }
  }

  function updateProgressUI(index) {
    if (voiceState.chunks.length === 0) return;
    const chunk = voiceState.chunks[index] || voiceState.chunks[0];
    const pct = Math.min(100, Math.round(((index + 1) / voiceState.chunks.length) * 100));

    if (playerProgressFill) playerProgressFill.style.width = `${pct}%`;
    if (playerProgressPercent) playerProgressPercent.textContent = `${pct}%`;
    if (playerCurrentSection) playerCurrentSection.textContent = chunk ? chunk.section : 'Reading';
    if (playerProgressTrack) playerProgressTrack.setAttribute('aria-valuenow', pct);
  }

  function updatePlayerUI() {
    const isPlaying = voiceState.isPlaying && !voiceState.isPaused;
    const isPaused = voiceState.isPlaying && voiceState.isPaused;

    if (listenBtn) {
      listenBtn.classList.toggle('playing', isPlaying);
    }
    if (listenBtnText) {
      if (isPlaying) {
        listenBtnText.textContent = 'Pause Reading';
      } else if (isPaused) {
        listenBtnText.textContent = 'Resume Reading';
      } else {
        listenBtnText.textContent = 'Listen to Reading';
      }
    }
    if (listenWaveAnim) {
      listenWaveAnim.style.display = isPlaying ? 'inline-flex' : 'none';
    }

    if (ctrlPlayPauseBtn) {
      ctrlPlayPauseBtn.classList.toggle('is-playing', isPlaying);
    }
    if (ctrlPlayIcon) {
      ctrlPlayIcon.style.display = isPlaying ? 'none' : 'inline-flex';
    }
    if (ctrlPauseIcon) {
      ctrlPauseIcon.style.display = isPlaying ? 'inline-flex' : 'none';
    }

    if (playerStatusDot) {
      playerStatusDot.className = 'player-dot' + (isPlaying ? ' active' : (isPaused ? ' paused' : ''));
    }
    if (playerStatusText) {
      if (isPlaying) {
        const cur = voiceState.chunks[voiceState.currentChunkIndex];
        playerStatusText.textContent = cur ? `Speaking: ${cur.section}` : 'Speaking reading…';
      } else if (isPaused) {
        playerStatusText.textContent = 'Narration Paused';
      } else {
        playerStatusText.textContent = 'Ready to narrate';
      }
    }
  }

  function initVoiceReaderForCurrentReading() {
    if (!voiceReaderWrapper) return;
    stopVoiceReader();
    prepareVoiceChunks();

    voiceReaderWrapper.style.display = 'block';
    if (voicePlayerCard) voicePlayerCard.classList.remove('open');
    if (voiceSettingsToggleBtn) voiceSettingsToggleBtn.classList.remove('active');
    if (voiceSettingsPanel) voiceSettingsPanel.classList.remove('open');

    updatePlayerUI();
    updateProgressUI(0);
  }

  // Bind Voice Reader Controls
  if (listenBtn) {
    listenBtn.addEventListener('click', () => {
      if (voicePlayerCard) voicePlayerCard.classList.add('open');

      if (voiceState.isPlaying && !voiceState.isPaused) {
        pauseVoiceReader();
      } else {
        playVoiceReader();
      }
    });
  }

  if (ctrlPlayPauseBtn) {
    ctrlPlayPauseBtn.addEventListener('click', () => {
      if (voiceState.isPlaying && !voiceState.isPaused) {
        pauseVoiceReader();
      } else {
        playVoiceReader();
      }
    });
  }

  if (ctrlStopBtn) {
    ctrlStopBtn.addEventListener('click', () => {
      stopVoiceReader();
    });
  }

  if (ctrlReplayBtn) {
    ctrlReplayBtn.addEventListener('click', () => {
      replayVoiceReader();
    });
  }

  if (playerProgressTrack) {
    playerProgressTrack.addEventListener('click', (e) => {
      if (voiceState.chunks.length === 0) return;
      const rect = playerProgressTrack.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetIndex = Math.min(
        voiceState.chunks.length - 1,
        Math.floor(ratio * voiceState.chunks.length)
      );

      voiceState.currentChunkIndex = targetIndex;
      updateProgressUI(targetIndex);

      if (voiceState.isPlaying) {
        window.speechSynthesis.cancel();
        setTimeout(() => {
          if (voiceState.isPlaying && !voiceState.isPaused) {
            speakNextChunk();
          }
        }, 50);
      }
    });
  }

  if (voiceSettingsToggleBtn && voiceSettingsPanel) {
    voiceSettingsToggleBtn.addEventListener('click', () => {
      const isOpen = voiceSettingsPanel.classList.toggle('open');
      voiceSettingsToggleBtn.classList.toggle('active', isOpen);
      voiceSettingsToggleBtn.setAttribute('aria-expanded', isOpen);
      if (isOpen && voicePlayerCard) {
        voicePlayerCard.classList.add('open');
      }
    });
  }

  if (voiceSelect) {
    voiceSelect.addEventListener('change', () => {
      const name = voiceSelect.value;
      const found = voiceState.voices.find((v) => v.name === name);
      if (found) {
        voiceState.selectedVoice = found;
        if (voiceState.isPlaying && !voiceState.isPaused) {
          window.speechSynthesis.cancel();
          speakNextChunk();
        }
      }
    });
  }

  if (rateSlider && rateValue) {
    rateSlider.addEventListener('input', () => {
      const val = parseFloat(rateSlider.value);
      voiceState.rate = val;
      rateValue.textContent = `${val.toFixed(2)}x`;
    });
  }

  if (pitchSlider && pitchValue) {
    pitchSlider.addEventListener('input', () => {
      const val = parseFloat(pitchSlider.value);
      voiceState.pitch = val;
      pitchValue.textContent = val.toFixed(2);
    });
  }

  if (filterAllVoices) {
    filterAllVoices.addEventListener('click', () => {
      voiceState.voiceFilter = 'all';
      $$('.quick-voice-chip').forEach((c) => c.classList.toggle('active', c === filterAllVoices));
      populateVoiceSelect();
    });
  }

  if (filterEnVoices) {
    filterEnVoices.addEventListener('click', () => {
      voiceState.voiceFilter = 'en';
      $$('.quick-voice-chip').forEach((c) => c.classList.toggle('active', c === filterEnVoices));
      populateVoiceSelect();
    });
  }

  if (filterHiVoices) {
    filterHiVoices.addEventListener('click', () => {
      voiceState.voiceFilter = 'hi';
      $$('.quick-voice-chip').forEach((c) => c.classList.toggle('active', c === filterHiVoices));
      populateVoiceSelect();
    });
  }

  if (resetVoiceDefaultsBtn) {
    resetVoiceDefaultsBtn.addEventListener('click', () => {
      voiceState.rate = 0.95;
      voiceState.pitch = 1.0;
      if (rateSlider) rateSlider.value = 0.95;
      if (rateValue) rateValue.textContent = '0.95x';
      if (pitchSlider) pitchSlider.value = 1.0;
      if (pitchValue) pitchValue.textContent = '1.0';
      voiceState.voiceFilter = 'all';
      $$('.quick-voice-chip').forEach((c) => c.classList.toggle('active', c === filterAllVoices));
      autoSelectBestVoice();
      populateVoiceSelect();
    });
  }

  // Voice Event Listeners
  if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  window.addEventListener('beforeunload', () => stopVoiceReader());
  window.addEventListener('pagehide', () => stopVoiceReader());

  // ============================================================
  // ARCANA JUDGE MODE — SECURE ADMIN LOCK & PRESENTATION ENGINE
  // ============================================================
  const lockScreenOverlay       = $('#lockScreenOverlay');
  const lockEmblemTrigger       = $('#lockEmblemTrigger');
  const lockStatusMessage       = $('#lockStatusMessage');
  const lockAdminTriggerBtn     = $('#lockAdminTriggerBtn');
  const adminModal              = $('#adminModal');
  const adminModalCloseBtn      = $('#adminModalCloseBtn');
  const adminModalCancelBtn     = $('#adminModalCancelBtn');
  const adminLoginForm          = $('#adminLoginForm');
  const adminPinInput           = $('#adminPinInput');
  const adminPinToggleBtn       = $('#adminPinToggleBtn');
  const adminPinError           = $('#adminPinError');
  const adminUnlockSubmitBtn    = $('#adminUnlockSubmitBtn');
  const adminBar                = $('#adminBar');
  const adminLockBtn            = $('#adminLockBtn');
  const adminSettingsBtn        = $('#adminSettingsBtn');
  const adminSettingsModal      = $('#adminSettingsModal');
  const adminSettingsCloseBtn   = $('#adminSettingsCloseBtn');
  const adminSettingsSaveBtn    = $('#adminSettingsSaveBtn');
  const adminSettingsLockNowBtn = $('#adminSettingsLockNowBtn');
  const adminLogoutBtn          = $('#adminLogoutBtn');
  const autoLockSelect          = $('#autoLockSelect');

  let isAppLocked = true;
  let isAdminAuthenticated = false;
  let adminToken = sessionStorage.getItem('arcana_admin_token') || '';
  let autoLockMinutes = 0;
  let lastActivityTime = Date.now();
  let lockPollTimer = null;
  let autoLockInterval = null;

  function showLockScreen(message) {
    isAppLocked = true;
    // Immediately halt active voice narration
    stopVoiceReader();
    // Immediately terminate any active reading request
    if (isRequesting) {
      terminateExecution();
    }
    if (lockStatusMessage && message) {
      lockStatusMessage.textContent = message;
    }
    if (lockScreenOverlay) {
      lockScreenOverlay.classList.remove('hidden');
      lockScreenOverlay.style.display = 'flex';
    }
    document.body.classList.add('arcana-locked');
  }

  function hideLockScreen() {
    isAppLocked = false;
    if (lockScreenOverlay) {
      lockScreenOverlay.classList.add('hidden');
      setTimeout(() => {
        if (!isAppLocked && lockScreenOverlay) {
          lockScreenOverlay.style.display = 'none';
        }
      }, 350);
    }
    document.body.classList.remove('arcana-locked');
  }

  function openAdminModal() {
    if (adminModal) {
      adminModal.style.display = 'flex';
      if (adminPinInput) {
        adminPinInput.value = '';
        setTimeout(() => adminPinInput.focus(), 50);
      }
      if (adminPinError) {
        adminPinError.style.display = 'none';
        adminPinError.textContent = '';
      }
    }
  }

  function closeAdminModal() {
    if (adminModal) {
      adminModal.style.display = 'none';
      if (adminPinInput) adminPinInput.value = '';
      if (adminPinError) adminPinError.style.display = 'none';
    }
  }

  function openSettingsModal() {
    if (adminSettingsModal) {
      adminSettingsModal.style.display = 'flex';
      if (autoLockSelect) {
        autoLockSelect.value = String(autoLockMinutes);
      }
    }
  }

  function closeSettingsModal() {
    if (adminSettingsModal) {
      adminSettingsModal.style.display = 'none';
    }
  }

  // Check Lock Status from Backend
  async function fetchLockStatus() {
    try {
      const res = await fetch('/api/lock-status', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.autoLockMinutes !== undefined) {
        autoLockMinutes = Number(data.autoLockMinutes) || 0;
        if (autoLockSelect) autoLockSelect.value = String(autoLockMinutes);
      }
      if (data.locked) {
        if (!isAppLocked) {
          showLockScreen('Locked by Administrator');
        }
      } else {
        if (isAppLocked) {
          hideLockScreen();
        }
      }
    } catch {}
  }

  // Submit Admin Unlock Request
  async function handleAdminUnlock(e) {
    if (e && e.preventDefault) e.preventDefault();
    const pin = (adminPinInput ? adminPinInput.value : '').trim();
    if (!pin) {
      if (adminPinError) {
        adminPinError.textContent = 'Please enter your Master Admin PIN.';
        adminPinError.style.display = 'block';
      }
      if (adminPinInput) adminPinInput.focus();
      return;
    }

    if (adminUnlockSubmitBtn) {
      adminUnlockSubmitBtn.disabled = true;
      adminUnlockSubmitBtn.innerHTML = '<span>Verifying…</span>';
    }

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', pin: pin })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        if (adminPinError) {
          adminPinError.textContent = data.error || 'Incorrect Admin PIN. Please verify your credentials.';
          adminPinError.style.display = 'block';
        }
        const card = adminModal ? adminModal.querySelector('.admin-modal-card') : null;
        if (card) {
          card.classList.remove('shake-error');
          void card.offsetWidth;
          card.classList.add('shake-error');
        }
        if (adminPinInput) {
          adminPinInput.value = '';
          adminPinInput.focus();
        }
        return;
      }

      // Unlock successful
      if (data.token) {
        adminToken = data.token;
        sessionStorage.setItem('arcana_admin_token', data.token);
      }
      isAdminAuthenticated = true;
      if (data.autoLockMinutes !== undefined) {
        autoLockMinutes = Number(data.autoLockMinutes) || 0;
        if (autoLockSelect) autoLockSelect.value = String(autoLockMinutes);
      }
      if (adminBar) adminBar.style.display = 'flex';
      closeAdminModal();
      hideLockScreen();
      lastActivityTime = Date.now();
    } catch (err) {
      if (adminPinError) {
        adminPinError.textContent = 'Connection error. Please check your network and try again.';
        adminPinError.style.display = 'block';
      }
    } finally {
      if (adminUnlockSubmitBtn) {
        adminUnlockSubmitBtn.disabled = false;
        adminUnlockSubmitBtn.innerHTML = '<span>Unlock Arcana ✦</span>';
      }
    }
  }

  // Admin Lock Action
  async function handleAdminLock() {
    if (adminLockBtn) {
      adminLockBtn.disabled = true;
    }
    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock', token: adminToken })
      });
    } catch {}
    showLockScreen('Arcana has been locked by Administrator');
    closeSettingsModal();
    if (adminLockBtn) adminLockBtn.disabled = false;
  }

  // Save Settings (Auto-Lock Timeout)
  async function handleSaveSettings() {
    const minutes = autoLockSelect ? Number(autoLockSelect.value) : 0;
    if (adminSettingsSaveBtn) {
      adminSettingsSaveBtn.disabled = true;
      adminSettingsSaveBtn.textContent = 'Saving…';
    }
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-timeout', token: adminToken, autoLockMinutes: minutes })
      });
      if (res.ok) {
        autoLockMinutes = minutes;
        if (adminSettingsSaveBtn) adminSettingsSaveBtn.textContent = 'Saved ✓';
        setTimeout(() => {
          if (adminSettingsSaveBtn) {
            adminSettingsSaveBtn.disabled = false;
            adminSettingsSaveBtn.textContent = 'Save Settings';
          }
          closeSettingsModal();
        }, 500);
        return;
      }
    } catch {}
    if (adminSettingsSaveBtn) {
      adminSettingsSaveBtn.disabled = false;
      adminSettingsSaveBtn.textContent = 'Save Settings';
    }
  }

  // Admin Logout
  function handleAdminLogout() {
    sessionStorage.removeItem('arcana_admin_token');
    adminToken = '';
    isAdminAuthenticated = false;
    if (adminBar) adminBar.style.display = 'none';
    closeSettingsModal();
  }

  // Verify existing token on initial load
  async function verifyStoredAdminToken() {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-token', token: adminToken })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid) {
          isAdminAuthenticated = true;
          if (adminBar) adminBar.style.display = 'flex';
          if (data.autoLockMinutes !== undefined) {
            autoLockMinutes = Number(data.autoLockMinutes) || 0;
            if (autoLockSelect) autoLockSelect.value = String(autoLockMinutes);
          }
          return;
        }
      }
    } catch {}
    sessionStorage.removeItem('arcana_admin_token');
    adminToken = '';
    isAdminAuthenticated = false;
    if (adminBar) adminBar.style.display = 'none';
  }

  // Activity & Inactivity tracking
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach((evt) => {
    window.addEventListener(evt, () => {
      lastActivityTime = Date.now();
    }, { passive: true });
  });

  function checkInactivity() {
    if (isAppLocked || autoLockMinutes <= 0) return;
    const elapsedMin = (Date.now() - lastActivityTime) / 60000;
    if (elapsedMin >= autoLockMinutes) {
      handleAdminLock();
    }
  }

  // Event Bindings for Judge Mode
  if (lockAdminTriggerBtn) {
    lockAdminTriggerBtn.addEventListener('click', () => openAdminModal());
  }
  if (lockEmblemTrigger) {
    lockEmblemTrigger.addEventListener('click', () => openAdminModal());
  }

  // Secret Triple-Click on header brand
  const brandEl = $('.brand');
  if (brandEl) {
    let brandClicks = 0;
    let brandClickTimer = null;
    brandEl.addEventListener('click', () => {
      brandClicks++;
      clearTimeout(brandClickTimer);
      brandClickTimer = setTimeout(() => { brandClicks = 0; }, 800);
      if (brandClicks >= 3) {
        brandClicks = 0;
        openAdminModal();
      }
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Alt + L or Ctrl + Shift + A
    if ((e.altKey && (e.key === 'l' || e.key === 'L')) || (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A'))) {
      e.preventDefault();
      openAdminModal();
      return;
    }
    if (e.key === 'Escape') {
      closeAdminModal();
      closeSettingsModal();
    }
  });

  // PIN Show/Hide Toggle
  if (adminPinToggleBtn && adminPinInput) {
    adminPinToggleBtn.addEventListener('click', () => {
      const isPwd = adminPinInput.type === 'password';
      adminPinInput.type = isPwd ? 'text' : 'password';
      adminPinToggleBtn.textContent = isPwd ? '🔒' : '👁';
    });
  }

  // Admin Form Submit & Close handlers
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', handleAdminUnlock);
  }
  if (adminUnlockSubmitBtn) {
    adminUnlockSubmitBtn.addEventListener('click', handleAdminUnlock);
  }
  if (adminModalCloseBtn) {
    adminModalCloseBtn.addEventListener('click', closeAdminModal);
  }
  if (adminModalCancelBtn) {
    adminModalCancelBtn.addEventListener('click', closeAdminModal);
  }
  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) closeAdminModal();
    });
  }

  // Admin Floating Bar Controls
  if (adminLockBtn) {
    adminLockBtn.addEventListener('click', handleAdminLock);
  }
  if (adminSettingsBtn) {
    adminSettingsBtn.addEventListener('click', openSettingsModal);
  }
  if (adminSettingsCloseBtn) {
    adminSettingsCloseBtn.addEventListener('click', closeSettingsModal);
  }
  if (adminSettingsLockNowBtn) {
    adminSettingsLockNowBtn.addEventListener('click', handleAdminLock);
  }
  if (adminSettingsSaveBtn) {
    adminSettingsSaveBtn.addEventListener('click', handleSaveSettings);
  }
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', handleAdminLogout);
  }
  if (adminSettingsModal) {
    adminSettingsModal.addEventListener('click', (e) => {
      if (e.target === adminSettingsModal) closeSettingsModal();
    });
  }

  // Startup Initialization for Judge Mode
  fetchLockStatus();
  verifyStoredAdminToken();
  lockPollTimer = setInterval(fetchLockStatus, 6000);
  autoLockInterval = setInterval(checkInactivity, 10000);

  // ── Terminate Dev Server (Dev Only) ─────────────────────────
  if (stopServerBtn && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    stopServerBtn.style.display = 'inline-flex';
    stopServerBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to terminate the local development server?')) return;
      stopServerBtn.disabled = true;
      stopServerBtn.textContent = 'Terminating server…';
      try {
        await fetch('/api/shutdown', { method: 'POST' });
        setStatus('Local server terminated. You can now close this tab.');
        stopServerBtn.textContent = 'Server Stopped';
      } catch {
        setStatus('Local server terminated.');
        stopServerBtn.textContent = 'Server Stopped';
      }
    });
  }

  // ── Initialize App ──────────────────────────────────────────
  renderCardLibrary();
  updateDeckUI();
})();

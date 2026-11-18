/* ============================================================
   ARCANA — 3-Card AI Tarot Experience
   Main Application Script
   ============================================================ */

(function () {
  'use strict';

  // ── DOM references ──────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const questionEl   = $('#question');
  const charCount    = $('#charCount');
  const readBtn      = $('#readBtn');
  const statusEl     = $('#status');
  const readingEl    = $('#reading');
  const resultEl     = $('#result');
  const readingSub   = $('#readingSub');
  const copyBtn      = $('#copyBtn');
  const newBtn       = $('#newBtn');
  const cardCounter  = $('#cardCounter');
  const cancelBtn    = $('#cancelBtn');
  const stopServerBtn = $('#stopServerBtn');

  // ── 3-Slot Configuration ────────────────────────────────────
  const SLOTS_COUNT = 3;
  const slots = [
    { data: null, mime: null, name: null },
    { data: null, mime: null, name: null },
    { data: null, mime: null, name: null }
  ];

  let spread         = 'general';
  let currentReading = '';
  let isRequesting   = false;
  let currentAbortController = null;

  const MAX_FILE_SIZE  = 25 * 1024 * 1024; // 25 MB (camera photos supported; optimized via canvas)
  const MAX_QUESTION   = 500;
  const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp'];
  const API_ENDPOINT   = '/.netlify/functions/reading';

  // ── Update Counter UI ───────────────────────────────────────
  function updateCounter() {
    const filledCount = slots.filter((s) => s.data !== null).length;
    cardCounter.textContent = `${filledCount} / ${SLOTS_COUNT} cards selected`;
    cardCounter.classList.toggle('ready', filledCount === SLOTS_COUNT);
  }

  // ── Client-side Image Optimization ──────────────────────────
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

  // ── Load File into Slot ─────────────────────────────────────
  function loadSlotFile(index, file) {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus(`Card ${index + 1}: Please choose a JPG, PNG or WEBP image.`, true);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus(`Card ${index + 1}: Image exceeds 5 MB. Please choose a smaller file.`, true);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setStatus(`Could not read file for Card ${index + 1}.`, true);
    reader.onload = async () => {
      // Optimize image resolution for fast transmission & AI vision
      const optimized = await resizeImage(reader.result);

      slots[index].data = optimized.dataUrl;
      slots[index].mime = optimized.mime;
      slots[index].name = file.name;

      const num = index + 1;
      const preview = $(`#preview${num}`);
      const prompt  = $(`#prompt${num}`);
      const nameEl  = $(`#fileName${num}`);
      const remBtn  = $(`#removeBtn${num}`);
      const slotBox = $(`#slotContainer${num}`);

      preview.src = optimized.dataUrl;
      preview.style.display = 'block';
      prompt.style.display = 'none';

      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      nameEl.textContent = `${file.name} (${sizeMB}MB)`;
      remBtn.classList.add('visible');
      slotBox.classList.add('filled');

      updateCounter();
      const filled = slots.filter((s) => s.data !== null).length;
      if (filled === SLOTS_COUNT) {
        setStatus('All 3 cards ready. Add an optional question and reveal your reading.');
      } else {
        setStatus(`Card ${num} uploaded. Please upload ${SLOTS_COUNT - filled} more card(s).`);
      }
    };
    reader.readAsDataURL(file);
  }

  // ── Clear a Slot ────────────────────────────────────────────
  function clearSlot(index) {
    slots[index].data = null;
    slots[index].mime = null;
    slots[index].name = null;

    const num = index + 1;
    const preview = $(`#preview${num}`);
    const prompt  = $(`#prompt${num}`);
    const nameEl  = $(`#fileName${num}`);
    const remBtn  = $(`#removeBtn${num}`);
    const input   = $(`#photo${num}`);
    const slotBox = $(`#slotContainer${num}`);

    preview.src = '';
    preview.style.display = 'none';
    prompt.style.display = '';
    nameEl.textContent = 'Empty';
    remBtn.classList.remove('visible');
    slotBox.classList.remove('filled');
    if (input) input.value = '';

    updateCounter();
    setStatus('');
  }

  // Prevent browser from navigating away if file is dropped outside zone
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  // ── Bind Slots (Inputs & Drag-Drop) ──────────────────────────
  for (let i = 0; i < SLOTS_COUNT; i++) {
    const num = i + 1;
    const input    = $(`#photo${num}`);
    const dropzone = $(`#dropzone${num}`);
    const remBtn   = $(`#removeBtn${num}`);

    if (input) {
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          loadSlotFile(i, e.target.files[0]);
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
          loadSlotFile(i, e.dataTransfer.files[0]);
        }
      });
    }

    if (remBtn) {
      remBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearSlot(i);
      });
    }
  }

  // ── Spread / Category selection ─────────────────────────────
  $$('.spread').forEach((btn) => {
    btn.addEventListener('click', () => {
      spread = btn.dataset.spread;
      $$('.spread').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  // ── Character counter ───────────────────────────────────────
  if (questionEl && charCount) {
    questionEl.addEventListener('input', () => {
      const len = questionEl.value.length;
      charCount.textContent = len + ' / ' + MAX_QUESTION;
      charCount.style.color = len > MAX_QUESTION ? 'var(--danger)' : '';
    });
  }

  // ── Status helpers ──────────────────────────────────────────
  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', !!isError);
  }

  function setLoading(active) {
    if (active) {
      statusEl.innerHTML = 'Examining the 3 cards and consulting the deck<span class="loading-dots"></span>';
      statusEl.classList.remove('error');
    }
  }

  // ── Markdown → HTML (lightweight) ──────────────────────────
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

    // Validate that ALL 3 cards are uploaded
    const missing = [];
    slots.forEach((s, idx) => {
      if (!s.data) missing.push(`Card ${idx + 1}`);
    });

    if (missing.length > 0) {
      setStatus(`Please upload all 3 cards (${missing.join(', ')} missing). Exactly 3 are required.`, true);
      return;
    }

    const question = questionEl.value.trim().substring(0, MAX_QUESTION);

    isRequesting = true;
    readBtn.disabled = true;
    readBtn.textContent = 'Reading the 3 cards…';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    readingEl.style.display = 'none';
    setLoading(true);

    currentAbortController = new AbortController();

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: currentAbortController.signal,
        body: JSON.stringify({
          cards: [
            { position: 1, label: 'Card 1 (Foundation)', image: slots[0].data },
            { position: 2, label: 'Card 2 (Present)',    image: slots[1].data },
            { position: 3, label: 'Card 3 (Outcome)',    image: slots[2].data }
          ],
          question: question,
          spread:   spread
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'The reading could not be generated.');
      }

      currentReading = data.reading || 'No reading was returned.';
      resultEl.innerHTML = renderMarkdown(currentReading);
      readingSub.textContent = '3-Card Spread · Grounded Reading · ' + new Date().toLocaleDateString();

      readingEl.style.display = 'block';
      readingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setStatus('');
    } catch (err) {
      if (err.name === 'AbortError') {
        setStatus('Reading interpretation was cancelled.');
      } else {
        setStatus(err.message, true);
      }
    } finally {
      isRequesting = false;
      readBtn.disabled = false;
      readBtn.textContent = 'Reveal my reading ✦';
      if (cancelBtn) cancelBtn.style.display = 'none';
      currentAbortController = null;
    }
  });

  // ── Terminate / Cancel Reading Handler ──────────────────────
  function terminateExecution() {
    if (isRequesting && currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
      isRequesting = false;
      readBtn.disabled = false;
      readBtn.textContent = 'Reveal my reading ✦';
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

  // Allow pressing Escape key to cancel interpretation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isRequesting) {
      terminateExecution();
    }
  });

  // ── Terminate Local Server (Dev only) ───────────────────────
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

  // ── Copy Reading ────────────────────────────────────────────
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentReading);
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => (copyBtn.textContent = 'Copy reading'), 1400);
    } catch {
      setStatus('Copy is unavailable in this browser.', true);
    }
  });

  // ── New Reading ─────────────────────────────────────────────
  newBtn.addEventListener('click', () => {
    readingEl.style.display = 'none';
    for (let i = 0; i < SLOTS_COUNT; i++) {
      clearSlot(i);
    }
    questionEl.value = '';
    if (charCount) charCount.textContent = '0 / ' + MAX_QUESTION;
    spread = 'general';
    $$('.spread').forEach((b) =>
      b.classList.toggle('active', b.dataset.spread === 'general')
    );
    $('#home').scrollIntoView({ behavior: 'smooth' });
  });

  // Initialize counter
  updateCounter();
})();

const editor = document.getElementById('editor');
const saveDot = document.getElementById('save-dot');
const saveLabel = document.getElementById('save-label');
let saveTimer = null;
let currentFontSize = 15;
let currentZoom = 100;
let findMatches = [];
let findIndex = 0;
let isFullscreen = false;

/* ─── LOAD / SAVE ─── */
function loadSaved() {
  try {
    const s = localStorage.getItem('np_content');
    if (s) { editor.innerHTML = s; updateCounts(); }
  } catch (e) { }
}

function autoSave() {
  saveDot.className = 'saving';
  saveLabel.textContent = 'Saving…';
  try { localStorage.setItem('np_content', editor.innerHTML); } catch (e) { }
  setTimeout(() => { saveDot.className = ''; saveLabel.textContent = 'Saved'; }, 700);
}

function onEdit() {
  updateCounts();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autoSave, 1000);
}

function updateCounts() {
  const text = editor.innerText || '';
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const lines = text.split('\n').length;
  document.getElementById('word-count').textContent = 'Words: ' + words;
  document.getElementById('char-count').textContent = 'Chars: ' + text.length;
  document.getElementById('line-count').textContent = 'Lines: ' + lines;
}

/* ─── MENUS ─── */
function toggleMenu(id) {
  const isOpen = document.getElementById(id).classList.contains('open');
  closeAllMenus();
  if (!isOpen) {
    document.getElementById(id).classList.add('open');
    const btn = document.getElementById(id).previousElementSibling;
    if (btn) btn.classList.add('active');
  }
}

function closeAllMenus() {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.menu-trigger').forEach(b => b.classList.remove('active'));
}

document.addEventListener('click', e => {
  if (!e.target.closest('.menu-item')) closeAllMenus();
});

/* ─── COMMANDS ─── */
function cmd(c) { document.execCommand(c); editor.focus(); closeAllMenus(); }

async function pasteText() {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      if (item.types.includes('text/html')) {
        // HTML ke saath paste karo (background, bold, color sab aayega)
        const blob = await item.getType('text/html');
        const html = await blob.text();
        document.execCommand('insertHTML', false, html);
        closeAllMenus();
        return;
      }
      if (item.types.includes('text/plain')) {
        // Fallback: plain text
        const blob = await item.getType('text/plain');
        const text = await blob.text();
        document.execCommand('insertText', false, text);
        closeAllMenus();
        return;
      }
    }
  } catch (e) {
    // Permission denied ya purana browser — browser ka default paste
    document.execCommand('paste');
  }
  closeAllMenus();
}

/* ─── FILE OPS ─── */
function newDoc() {
  closeAllMenus();
  if (editor.innerText.trim()) {
    document.getElementById('modal-new').classList.add('open');
  } else { confirmNew(); }
}
function confirmNew() {
  editor.innerHTML = '';
  document.getElementById('doc-name-display').textContent = 'untitled.txt';
  closeModal('modal-new');
  updateCounts();
  editor.focus();
}

function openFile() {
  closeAllMenus();
  document.getElementById('file-input').click();
}
function handleFileOpen(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('doc-name-display').textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => { editor.innerText = ev.target.result; updateCounts(); };
  reader.readAsText(file);
  e.target.value = '';
}

function saveFile() {
  closeAllMenus();
  const name = document.getElementById('doc-name-display').textContent || 'note.txt';
  downloadText(editor.innerText, name);
}

function saveFileAs() {
  closeAllMenus();
  document.getElementById('save-as-name').value = document.getElementById('doc-name-display').textContent || 'note.txt';
  document.getElementById('modal-save-as').classList.add('open');
}
function confirmSaveAs() {
  const name = document.getElementById('save-as-name').value || 'note.txt';
  document.getElementById('doc-name-display').textContent = name;
  downloadText(editor.innerText, name);
  closeModal('modal-save-as');
}

function downloadText(text, name) {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function printDoc() { closeAllMenus(); window.print(); }

/* ─── FONT ─── */
// function changeFontFamily(val) { editor.style.fontFamily = val; editor.focus(); }
function changeFontFamily(val) {
  editor.focus();
  const sel = window.getSelection();

  // Agar text selected hai to sirf us par apply karo
  if (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed) {
    document.execCommand('fontName', false, val);
    return;
  }

  // Koi selection nahi — ek invisible span inject karo
  // jo aage typed text ko naye font mein rakhega
  const span = document.createElement('span');
  span.style.fontFamily = val;
  span.appendChild(document.createTextNode('\u200b')); // zero-width space

  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    range.insertNode(span);
    // Cursor ko span ke andar move karo
    range.setStart(span.firstChild, 1);
    range.setEnd(span.firstChild, 1);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.appendChild(span);
  }
}

function changeFontSize(val) {
  currentFontSize = parseInt(val);
  editor.focus();
  const sel = window.getSelection();

  // Agar text selected hai to sirf us par apply karo
  if (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed) {
    document.execCommand('fontSize', false, '7'); // placeholder size
    // execCommand sirf 1-7 values leta hai, isliye span dhundh ke override karo
    editor.querySelectorAll('font[size="7"]').forEach(el => {
      el.removeAttribute('size');
      el.style.fontSize = val + 'px';
    });
    return;
  }

  // Koi selection nahi — cursor position par span inject karo
  const span = document.createElement('span');
  span.style.fontSize = val + 'px';
  span.appendChild(document.createTextNode('\u200b')); // zero-width space

  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    range.insertNode(span);
    range.setStart(span.firstChild, 1);
    range.setEnd(span.firstChild, 1);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.appendChild(span);
  }
}

/* ─── ZOOM ─── */
function zoomIn() { currentZoom = Math.min(200, currentZoom + 10); applyZoom(); }
function zoomOut() { currentZoom = Math.max(50, currentZoom - 10); applyZoom(); }
function zoomReset() { currentZoom = 100; applyZoom(); }
function applyZoom() {
  const scale = currentZoom / 100;
  editor.style.fontSize = (currentFontSize * scale) + 'px';
  editor.style.lineHeight = (1.7 * scale) + 'em'; // optional: line height bhi scale ho
  document.getElementById('zoom-label').textContent = currentZoom + '%';
  closeAllMenus();
}

/* ─── FULLSCREEN ─── */
function toggleFullscreen() {
  closeAllMenus();
  const icon = document.getElementById('fs-icon');

  if (!document.fullscreenElement) {
    // Browser native fullscreen — poora page fullscreen hoga
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Fullscreen failed:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

// Icon ko sync karo browser ke saath (ESC se bhi kaam karega)
document.addEventListener('fullscreenchange', () => {
  const icon = document.getElementById('fs-icon');
  if (document.fullscreenElement) {
    icon.className = 'fa-solid fa-compress';
    isFullscreen = true;
  } else {
    icon.className = 'fa-solid fa-expand';
    isFullscreen = false;
  }
});

/* ─── INSERT ─── */
function insertText(str) {
  closeAllMenus();
  editor.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(str));
    range.collapse(false);
  } else {
    editor.appendChild(document.createTextNode(str));
  }
  onEdit();
}

function fmtDate1() { const d = new Date(); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); }
function fmtDate2() { const d = new Date(); return d.toLocaleDateString('en-US'); }
function fmtDate3() { const d = new Date(); return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
function fmtDate4() { const d = new Date(); return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
function fmtDate5() { const d = new Date(); return d.toLocaleTimeString('en-US'); }
function fmtDate6() { const d = new Date(); return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function fmtDate7() { return new Date().toISOString().slice(0, 19); }

/* ─── SPECIAL CHARS ─── */
const specialChars = [
  '©', '®', '™', '€', '£', '¥', '¢', '°', 'µ', '±', '×', '÷', '≠', '≤', '≥', '∞', '√', '∑', '∏', '∂',
  'α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'π', 'σ', 'φ', 'ψ', 'ω', 'Α', 'Β', 'Γ', 'Δ', 'Ω',
  '←', '→', '↑', '↓', '↔', '↕', '⇐', '⇒', '⇔', '↩', '↪',
  '•', '·', '‣', '◦', '▪', '▫', '■', '□', '▲', '△', '▼', '▽', '◆', '◇', '○', '●',
  '"', '"', '\'', '\'', '«', '»', '‹', '›', '„', '‚', '—', '–', '…', '¡', '¿',
  '½', '⅓', '⅔', '¼', '¾', '⅛', '⅜', '⅝', '⅞',
  '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '⁰',
  'Á', 'É', 'Í', 'Ó', 'Ú', 'á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', 'ä', 'ö', 'ß', 'ç', 'â', 'ê', 'î', 'ô', 'û'
];

function openSpecialChars() {
  closeAllMenus();
  const grid = document.getElementById('char-grid');
  if (!grid.children.length) {
    specialChars.forEach(ch => {
      const btn = document.createElement('button');
      btn.className = 'char-btn';
      btn.title = 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      btn.textContent = ch;
      btn.onclick = () => { insertText(ch); };
      grid.appendChild(btn);
    });
  }
  document.getElementById('modal-special').classList.add('open');
}

/* ─── FIND & REPLACE ─── */
function openFindBar() { closeAllMenus(); toggleFindBar(true); }

function toggleFindBar(forceOpen) {
  closeAllMenus();
  const bar = document.getElementById('find-bar');
  const shouldOpen = forceOpen !== undefined ? forceOpen : !bar.classList.contains('open');
  if (shouldOpen) {
    bar.classList.add('open');
    document.getElementById('find-input').focus();
  } else { closeFindBar(); }
}

function closeFindBar() {
  document.getElementById('find-bar').classList.remove('open');
  clearHighlights();
}

function clearHighlights() {
  editor.querySelectorAll('mark').forEach(m => {
    m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
    m.parentNode && m.parentNode.normalize();
  });
  findMatches = [];
  document.getElementById('find-count').textContent = '';
}

function doFind() {
  clearHighlights();
  const query = document.getElementById('find-input').value;
  if (!query) return;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let count = 0;
  editor.innerHTML = editor.innerHTML.replace(new RegExp(escaped, 'gi'), match => { count++; return `<mark>${match}</mark>`; });
  findMatches = Array.from(editor.querySelectorAll('mark'));
  document.getElementById('find-count').textContent = count ? count + ' match' + (count > 1 ? 'es' : '') : 'No match';
  findIndex = 0;
  highlightCurrent();
}

function highlightCurrent() {
  findMatches.forEach((m, i) => m.className = i === findIndex ? 'current' : '');
  if (findMatches[findIndex]) findMatches[findIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function findNext() { if (!findMatches.length) return; findIndex = (findIndex + 1) % findMatches.length; highlightCurrent(); }
function findPrev() { if (!findMatches.length) return; findIndex = (findIndex - 1 + findMatches.length) % findMatches.length; highlightCurrent(); }

function doReplace() {
  const rep = document.getElementById('replace-input').value;
  if (!findMatches[findIndex]) return;
  findMatches[findIndex].outerHTML = rep;
  findMatches.splice(findIndex, 1);
  document.getElementById('find-count').textContent = findMatches.length + ' match' + (findMatches.length !== 1 ? 'es' : '');
  if (findIndex >= findMatches.length) findIndex = 0;
  highlightCurrent();
  onEdit();
}

function doReplaceAll() {
  const query = document.getElementById('find-input').value;
  const rep = document.getElementById('replace-input').value;
  if (!query) return;
  clearHighlights();
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let count = 0;
  editor.innerHTML = editor.innerHTML.replace(new RegExp(escaped, 'gi'), () => { count++; return rep; });
  document.getElementById('find-count').textContent = count ? 'Replaced ' + count : 'Not found';
  onEdit();
}

function findKeyDown(e) {
  if (e.key === 'Enter') { e.shiftKey ? findPrev() : findNext(); }
  if (e.key === 'Escape') closeFindBar();
}
function replaceKeyDown(e) {
  if (e.key === 'Enter') doReplace();
  if (e.key === 'Escape') closeFindBar();
}

/* ─── SHORTCUTS MODAL ─── */
function openShortcuts() { closeAllMenus(); document.getElementById('modal-shortcuts').classList.add('open'); }
function openAbout() { closeAllMenus(); document.getElementById('modal-about').classList.add('open'); }

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ─── KEYBOARD ─── */
function editorKeyDown(e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); newDoc(); }
    if (e.key === 'o' || e.key === 'O') { e.preventDefault(); openFile(); }
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      e.shiftKey ? saveFileAs() : saveFile();
    }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); printDoc(); }
    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); toggleFindBar(); }
    if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn(); }
    if (e.key === '-') { e.preventDefault(); zoomOut(); }
    if (e.key === '0') { e.preventDefault(); zoomReset(); }
  }
  if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
  if (e.key === 'Escape') { closeFindBar(); closeAllMenus(); }
  if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    '); }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAllMenus(); }
});

/* ─── INIT ─── */
loadSaved();
updateCounts();

function detectAdBlock() {
  let ad = document.createElement('div');
  ad.innerHTML = "&nbsp;";
  ad.className = "adsbox";
  document.body.appendChild(ad);

  setTimeout(() => {
    if (ad.offsetHeight === 0) {
      showAdblockPopup();
    }
    ad.remove();
  }, 100);
}

function showAdblockPopup() {
  let div = document.createElement("div");
  div.innerHTML = `
    <div style="
      position:fixed;
      top:0;left:0;
      width:100%;height:100%;
      background:rgba(0,0,0,0.8);
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:999999;
      text-align:center;
      padding:20px;
    ">
      <div>
        <h2>AdBlock Detected 😢</h2>
        <p>Please disable AdBlock to support this website.</p>
      </div>
    </div>
  `;
  document.body.appendChild(div);
}

// run on load
window.addEventListener("load", detectAdBlock);

function toggleDarkMode() {
  const body = document.documentElement;
  const icon = document.getElementById('theme-icon');
  const currentTheme = body.getAttribute('data-theme');

  if (currentTheme === 'dark') {
    body.removeAttribute('data-theme');
    icon.classList.replace('fa-sun', 'fa-moon');
    localStorage.setItem('theme', 'light');
  } else {
    body.setAttribute('data-theme', 'dark');
    icon.classList.replace('fa-moon', 'fa-sun');
    localStorage.setItem('theme', 'dark');
  }
}

// Page load hote hi purana theme apply karne ke liye
window.onload = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('theme-icon').classList.replace('fa-moon', 'fa-sun');
  }
};

(adsbygoogle = window.adsbygoogle || []).push({});
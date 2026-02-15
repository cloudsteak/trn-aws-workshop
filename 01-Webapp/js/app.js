// ==================== QUOTES ====================
let currentCategory = '';

async function fetchQuotes(category) {
    const url = category
        ? `${CONFIG.QUOTES_URL}?category=${category}`
        : CONFIG.QUOTES_URL;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function fetchRandomQuote(category) {
    const url = category
        ? `${CONFIG.QUOTES_RANDOM_URL}?category=${category}`
        : CONFIG.QUOTES_RANDOM_URL;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

function showQuote(q) {
    const card = document.getElementById('quoteCard');
    card.classList.add('loading');
    setTimeout(() => {
        document.getElementById('quoteText').textContent = q.text;
        document.getElementById('quoteAuthor').textContent = '— ' + q.author;
        const cat = document.getElementById('quoteCategory');
        if (q.category) { cat.textContent = q.category; cat.style.display = 'inline-block'; }
        else { cat.style.display = 'none'; }
        card.classList.remove('loading');
    }, 200);
}

function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = '⚠️ ' + msg;
    el.classList.add('visible');
    document.getElementById('statusDot').classList.add('error');
    document.getElementById('statusText').textContent = 'Hiba – ellenőrizd a js/config.js fájlt!';
}

function hideError() {
    document.getElementById('errorMsg').classList.remove('visible');
    document.getElementById('statusDot').classList.remove('error');
}

function renderList(quotes) {
    document.getElementById('quotesGrid').innerHTML = quotes.map(q => `
        <div class="mini-card">
            <div class="quote-text">"${q.text}"</div>
            <div class="quote-author">— ${q.author}</div>
            ${q.category ? `<div class="quote-category">${q.category}</div>` : ''}
        </div>
    `).join('');
}

async function loadRandomQuote() {
    try { hideError(); showQuote(await fetchRandomQuote(currentCategory)); }
    catch (e) { showError('Nem sikerült betölteni: ' + e.message); }
}

async function loadAll(category) {
    try {
        hideError();
        const quotes = await fetchQuotes(category);
        renderList(quotes);
        document.getElementById('statusDot').classList.remove('error');
        document.getElementById('statusText').textContent =
            'Kapcsolódva ✓ | ' + quotes.length + ' idézet';
        if (quotes.length > 0) showQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    } catch (e) { showError('Nem sikerült betölteni: ' + e.message); }
}

function filterCategory(btn) {
    document.querySelectorAll('.btn-secondary').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    loadAll(currentCategory);
}

// ==================== CHATBOT ====================
let chatOpen = false;

function toggleChat() {
    chatOpen = !chatOpen;
    document.getElementById('chatWindow').classList.toggle('open', chatOpen);
    document.getElementById('chatFab').textContent = chatOpen ? '✕' : '🤖';
    if (chatOpen) document.getElementById('chatInput').focus();
}

function addChatMessage(text, sender) {
    const messages = document.getElementById('chatMessages');
    const msg = document.createElement('div');
    msg.className = 'chat-msg ' + sender;
    msg.innerHTML = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
}

async function sendChat() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addChatMessage(text, 'user');

    const typing = addChatMessage('Gondolkodom...', 'ai typing');
    document.getElementById('chatSend').disabled = true;

    try {
        const res = await fetch(CONFIG.CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        typing.remove();
        addChatMessage(data.reply, 'ai');
    } catch (e) {
        typing.remove();
        addChatMessage('⚠️ Hiba: ' + e.message + '<br><small>Ellenőrizd a js/config.js beállításokat!</small>', 'ai');
    }

    document.getElementById('chatSend').disabled = false;
    document.getElementById('chatInput').focus();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => loadAll(''));

// ==================== HEALTH CHECK ====================
function resetHealth() {
    const ids = ['health-ec2', 'health-apigw', 'health-lambda-q', 'health-lambda-c', 'health-rds', 'health-bedrock'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const dot = el.querySelector('.h-dot');
        const txt = el.querySelector('.h-detail');
        if (dot) dot.className = 'h-dot';
        if (txt) txt.textContent = 'Ellenőrzés...';
    });
}

async function checkHealth() {
    resetHealth();
    // Kis szünet, hogy a felhasználó lássa a reset-et
    await new Promise(r => setTimeout(r, 300));

    const components = {
        ec2:       { el: document.getElementById('health-ec2'),       status: true, label: 'EC2 + Apache' },
        apiGw:     { el: document.getElementById('health-apigw'),     status: false, label: 'API Gateway' },
        lambdaQ:   { el: document.getElementById('health-lambda-q'),  status: false, label: 'Lambda (quotes)' },
        lambdaC:   { el: document.getElementById('health-lambda-c'),  status: false, label: 'Lambda (chat)' },
        rds:       { el: document.getElementById('health-rds'),       status: false, label: 'RDS MySQL' },
        bedrock:   { el: document.getElementById('health-bedrock'),   status: false, label: 'Bedrock AI' },
    };

    // EC2 mindig OK ha az oldal betöltődött
    setHealth(components.ec2, true);

    // Quotes Lambda + API GW + RDS
    try {
        const res = await fetch(CONFIG.QUOTES_URL + '/health');
        if (res.ok) {
            setHealth(components.apiGw, true);
            const data = await res.json();
            if (data.lambda) setHealth(components.lambdaQ, true);
            if (data.database) {
                setHealth(components.rds, true, data.quote_count + ' idézet');
            } else {
                setHealth(components.rds, false, data.database_error || 'Nincs kapcsolat');
            }
        } else {
            setHealth(components.apiGw, false, 'HTTP ' + res.status);
        }
    } catch (e) {
        // Ha CORS hiba vagy network error → API GW nem elérhető
        if (CONFIG.API_BASE_URL.includes('XXXXXXXXXX')) {
            setHealth(components.apiGw, false, 'config.js nincs beállítva');
        } else {
            setHealth(components.apiGw, false, e.message);
        }
    }

    // Chat Lambda + Bedrock
    try {
        const res = await fetch(CONFIG.CHAT_URL + '/health');
        if (res.ok) {
            // Ha API GW még nem volt OK, most az
            if (!components.apiGw.status) setHealth(components.apiGw, true);
            const data = await res.json();
            if (data.lambda) setHealth(components.lambdaC, true);
            if (data.bedrock) {
                setHealth(components.bedrock, true);
            } else {
                setHealth(components.bedrock, false, data.bedrock_error || 'Nincs hozzáférés');
            }
        }
    } catch (e) {
        // Chat Lambda nem elérhető – nem baj, lehet hogy a /chat route még nincs
    }
}

function setHealth(comp, ok, detail) {
    if (!comp.el) return;
    comp.status = ok;
    const dot = comp.el.querySelector('.h-dot');
    const txt = comp.el.querySelector('.h-detail');
    dot.className = 'h-dot ' + (ok ? 'ok' : 'err');
    if (txt) txt.textContent = detail || (ok ? 'Elérhető' : 'Nem elérhető');
}

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
    if (!el) return;
    el.textContent = '⚠️ ' + msg;
    el.classList.add('visible');
}

function hideError() {
    const el = document.getElementById('errorMsg');
    if (el) el.classList.remove('visible');
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
        const data = await fetchQuotes(category);

        // Ha a Lambda fut de nincs DB → status üzenet jön vissza
        if (data.status === 'no_db' || data.status === 'db_error') {
            const qt = document.getElementById('quoteText');
            const qa = document.getElementById('quoteAuthor');
            const qc = document.getElementById('quoteCategory');
            const qg = document.getElementById('quotesGrid');
            if (qt) qt.textContent = data.message;
            if (qa) qa.textContent = '';
            if (qc) qc.style.display = 'none';
            if (qg) qg.innerHTML = '';
            return;
        }

        renderList(data);
        if (data.length > 0) showQuote(data[Math.floor(Math.random() * data.length)]);
    } catch (e) {
        const qt = document.getElementById('quoteText');
        const qa = document.getElementById('quoteAuthor');
        if (CONFIG.API_BASE_URL.includes('XXXXXXXXXX')) {
            if (qt) qt.textContent = 'Az API Gateway URL nincs beállítva a config.js-ben';
            if (qa) qa.textContent = '';
        } else {
            showError('Nem sikerült betölteni: ' + e.message);
        }
    }
}

function filterCategory(btn) {
    document.querySelectorAll('.btn-secondary').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    loadAll(currentCategory);
}

// ==================== CHATBOT ====================
let chatOpen = false;
let chatHistory = JSON.parse(sessionStorage.getItem('chatHistory') || '[]');

function saveChatHistory() {
    sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

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
    chatHistory.push({ role: 'user', content: text });
    saveChatHistory();

    const typing = addChatMessage('Gondolkodom...', 'ai typing');
    document.getElementById('chatSend').disabled = true;

    try {
        const res = await fetch(CONFIG.CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: chatHistory })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        typing.remove();
        addChatMessage(data.reply, 'ai');
        chatHistory.push({ role: 'assistant', content: data.reply });
        saveChatHistory();
    } catch (e) {
        typing.remove();
        addChatMessage('⚠️ Hiba: ' + e.message + '<br><small>Ellenőrizd a js/config.js beállításokat!</small>', 'ai');
    }

    document.getElementById('chatSend').disabled = false;
    document.getElementById('chatInput').focus();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    loadAll('');

    // Korábbi chat üzenetek visszatöltése
    chatHistory.forEach(msg => {
        addChatMessage(msg.content, msg.role === 'user' ? 'user' : 'ai');
    });
});

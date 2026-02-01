const POPULAR_STOCKS = [
    { ticker: 'AAPL', name: 'Apple Inc.' },
    { ticker: 'MSFT', name: 'Microsoft Corporation' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.' },
    { ticker: 'TSLA', name: 'Tesla Inc.' },
    { ticker: 'META', name: 'Meta Platforms Inc.' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation' },
    { ticker: 'NFLX', name: 'Netflix Inc.' },
    { ticker: 'MARUTI.NS', name: 'Maruti Suzuki India' },
    { ticker: 'BHARTIARTL.NS', name: 'Bharti Airtel Limited' },
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services' },
    { ticker: 'INFY.NS', name: 'Infosys Limited' },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Limited' },
    { ticker: 'ICICIBANK.NS', name: 'ICICI Bank Limited' },
    { ticker: 'WIPRO.NS', name: 'Wipro Limited' },
    { ticker: 'SBIN.NS', name: 'State Bank of India' },
    { ticker: 'TATAMOTORS.NS', name: 'Tata Motors Limited' },
    { ticker: 'TATASTEEL.NS', name: 'Tata Steel Limited' },
    { ticker: 'ITC.NS', name: 'ITC Limited' },
    { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
    { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
    { ticker: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
    { ticker: 'LT.NS', name: 'Larsen & Toubro' },
    { ticker: 'ADANIENT.NS', name: 'Adani Enterprises' },
    { ticker: 'AIRTEL', name: 'Bharti Airtel', alias: 'BHARTIARTL.NS' },
    { ticker: 'ZOMATO.NS', name: 'Zomato Limited' },
    { ticker: 'PAYTM.NS', name: 'Paytm' },
];

const CURRENCY_SYMBOLS = { USD: '$', INR: '₹', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥' };

let portfolio = [];
let stockCache = {};
let apiKey = '';

function getCurrencySymbol(currency) {
    return CURRENCY_SYMBOLS[currency] || currency + ' ';
}

function init() {
    document.getElementById('mainInput').addEventListener('input', handleInput);
    document.getElementById('mainInput').addEventListener('keydown', handleKeydown);
    document.getElementById('analyzeBtn').addEventListener('click', analyzePortfolio);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('detailsToggle').addEventListener('click', toggleDetails);
    document.getElementById('apiKeyInput').addEventListener('input', handleApiKeyChange);

    const savedKey = sessionStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKey = savedKey;
        document.getElementById('apiKeyInput').value = savedKey;
        updateApiStatus(true);
    }
}

function handleApiKeyChange(e) {
    apiKey = e.target.value.trim();
    if (apiKey) {
        sessionStorage.setItem('gemini_api_key', apiKey);
        updateApiStatus(true);
    } else {
        sessionStorage.removeItem('gemini_api_key');
        updateApiStatus(false);
    }
}

function updateApiStatus(connected) {
    const status = document.getElementById('apiStatus');
    status.className = connected ? 'api-status connected' : 'api-status disconnected';
    status.innerHTML = connected ? '● Ready' : '○ Enter API Key';
}

function handleInput(e) {
    const input = e.target;
    const text = input.value;
    const cursorPos = input.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
        const query = atMatch[1];
        showSearchResults(query);
    } else {
        hideSearchPopup();
    }
}

function handleKeydown(e) {
    const popup = document.getElementById('searchPopup');
    if (!popup.classList.contains('active')) return;

    const items = popup.querySelectorAll('.search-item[data-ticker]');
    if (items.length === 0) return;

    let current = popup.querySelector('.search-item.selected');
    let idx = current ? Array.from(items).indexOf(current) : -1;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (current) current.classList.remove('selected');
        idx = (idx + 1) % items.length;
        items[idx].classList.add('selected');
        items[idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (current) current.classList.remove('selected');
        idx = idx <= 0 ? items.length - 1 : idx - 1;
        items[idx].classList.add('selected');
        items[idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = current || items[0];
        if (selected) selectStock(selected.dataset.ticker);
    } else if (e.key === 'Escape') {
        hideSearchPopup();
    }
}

function showSearchResults(query) {
    const popup = document.getElementById('searchPopup');
    const q = query.toLowerCase();

    let matches = POPULAR_STOCKS.filter(s =>
        s.ticker.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.alias && s.alias.toLowerCase().includes(q))
    );

    if (matches.length === 0 && q.length >= 2) {
        matches = [{ ticker: q.toUpperCase(), name: 'Search: ' + q.toUpperCase(), isSearch: true }];
    }

    if (matches.length === 0) {
        popup.innerHTML = '<div class="search-loading">Type to search stocks...</div>';
    } else {
        popup.innerHTML = matches.slice(0, 8).map((s, i) => `
            <div class="search-item ${i === 0 ? 'selected' : ''}" data-ticker="${s.alias || s.ticker}" data-name="${s.name}">
                <div>
                    <span class="search-ticker">${s.ticker}</span>
                    <span class="search-name">${s.name}</span>
                </div>
                ${s.isSearch ? '<span style="color: var(--text-muted);">↵ to search</span>' : ''}
            </div>
        `).join('');

        popup.querySelectorAll('.search-item').forEach(item => {
            item.addEventListener('click', () => selectStock(item.dataset.ticker));
        });
    }

    popup.classList.add('active');
}

async function selectStock(ticker) {
    hideSearchPopup();

    const input = document.getElementById('mainInput');
    const text = input.value;
    const cursorPos = input.selectionStart;
    const beforeCursor = text.substring(0, cursorPos);
    const afterCursor = text.substring(cursorPos);
    const newBefore = beforeCursor.replace(/@\w*$/, '');

    input.value = newBefore + '[' + ticker + '] ' + afterCursor;
    const newCursorPos = newBefore.length + ticker.length + 3;
    input.setSelectionRange(newCursorPos, newCursorPos);
    input.focus();

    if (portfolio.some(s => s.ticker === ticker)) return;

    if (stockCache[ticker]) {
        addToPortfolio(stockCache[ticker]);
        return;
    }

    try {
        const res = await fetch(`/api/stock/${ticker}`);
        const data = await res.json();
        if (!data.error) {
            stockCache[ticker] = data;
            addToPortfolio(data);
        } else {
            alert('Stock not found: ' + ticker);
        }
    } catch (e) {
        alert('Failed to fetch stock data');
    }
}

function addToPortfolio(data) {
    if (portfolio.some(s => s.ticker === data.ticker)) return;
    portfolio.push({ ticker: data.ticker, name: data.name, price: data.price, currency: data.currency || 'USD', quantity: 1 });
    renderChips();
    updateTotal();
}

function hideSearchPopup() {
    document.getElementById('searchPopup').classList.remove('active');
}

function renderChips() {
    const container = document.getElementById('stockChips');
    container.innerHTML = '';

    portfolio.forEach((stock, idx) => {
        const chip = document.createElement('div');
        chip.className = 'stock-chip';
        const sym = getCurrencySymbol(stock.currency);
        chip.innerHTML = `
            <span class="chip-ticker">${stock.ticker}</span>
            <span class="chip-price">${sym}${stock.price.toFixed(2)}</span>
            <div class="chip-qty">
                <button class="qty-btn minus">−</button>
                <span class="chip-qty-value">${stock.quantity}</span>
                <button class="qty-btn plus">+</button>
            </div>
            <button class="chip-remove">✕</button>
        `;

        chip.querySelector('.minus').addEventListener('click', () => {
            portfolio[idx].quantity = Math.max(1, portfolio[idx].quantity - 1);
            renderChips();
            updateTotal();
        });

        chip.querySelector('.plus').addEventListener('click', () => {
            portfolio[idx].quantity += 1;
            renderChips();
            updateTotal();
        });

        chip.querySelector('.chip-remove').addEventListener('click', () => {
            const ticker = portfolio[idx].ticker;
            portfolio.splice(idx, 1);
            removeFromInput(ticker);
            renderChips();
            updateTotal();
        });

        container.appendChild(chip);
    });

    document.getElementById('stockCount').textContent = portfolio.length + ' stock' + (portfolio.length !== 1 ? 's' : '');
}

function removeFromInput(ticker) {
    const input = document.getElementById('mainInput');
    input.value = input.value.replace(new RegExp('\\[' + ticker.replace('.', '\\.') + '\\]\\s*', 'g'), '');
}

function updateTotal() {
    const byCurrency = {};
    portfolio.forEach(s => {
        const c = s.currency || 'USD';
        byCurrency[c] = (byCurrency[c] || 0) + (s.price * s.quantity);
    });
    const currencies = Object.keys(byCurrency);
    let text;
    if (currencies.length === 0) {
        text = '$0.00';
    } else if (currencies.length === 1) {
        const c = currencies[0];
        text = getCurrencySymbol(c) + byCurrency[c].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        text = currencies.map(c => getCurrencySymbol(c) + byCurrency[c].toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })).join(' + ');
    }
    document.getElementById('portfolioTotal').textContent = text;
}

function clearAll() {
    portfolio = [];
    document.getElementById('mainInput').value = '';
    document.getElementById('stockChips').innerHTML = '';
    document.getElementById('resultCard').style.display = 'none';
    document.getElementById('stockCount').textContent = '0 stocks';
    updateTotal();
}

async function analyzePortfolio() {
    const btn = document.getElementById('analyzeBtn');
    const loader = document.getElementById('loader');
    const resultCard = document.getElementById('resultCard');
    const input = document.getElementById('mainInput');

    if (portfolio.length === 0) {
        alert('Add at least one stock using @TICKER');
        return;
    }

    if (!apiKey) {
        alert('Please enter your Gemini API key');
        document.getElementById('apiKeyInput').focus();
        return;
    }

    const instructions = input.value.replace(/\[\w+\.?\w*\]/g, '').trim();

    btn.disabled = true;
    btn.innerText = 'Analyzing...';
    loader.style.display = 'block';
    resultCard.style.display = 'none';

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
            body: JSON.stringify({ stocks: portfolio, instructions: instructions })
        });
        const data = await res.json();

        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }

        document.getElementById('scoreDisplay').innerText = typeof data.score === 'number' ? data.score : '?';
        document.getElementById('reasoning').innerText = data.reasoning || 'No reasoning provided.';
        document.getElementById('reasoning').style.display = 'none';
        document.getElementById('detailsToggle').innerText = 'Show Reasoning';
        resultCard.style.display = 'block';
    } catch (e) {
        alert('Analysis failed: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Analyze Portfolio';
        loader.style.display = 'none';
    }
}

function toggleDetails() {
    const reasoning = document.getElementById('reasoning');
    const btn = document.getElementById('detailsToggle');
    const visible = reasoning.style.display !== 'none';
    reasoning.style.display = visible ? 'none' : 'block';
    btn.innerText = visible ? 'Show Reasoning' : 'Hide Reasoning';
}

document.addEventListener('DOMContentLoaded', init);

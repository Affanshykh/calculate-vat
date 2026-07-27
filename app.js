/**
 * Ireland & UK VAT Calculator
 * Main Application Logic (Multi-page widgets - Emoji-free, Light mode only)
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // DOM Element References & Page Route Initialization
    // ==========================================================================
    const body = document.body;
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    // Global Nav Active Class Syncing
    syncNavLinks();

    // Initialize Global Search Bar
    initSiteSearch();

    // Mobile Navigation Toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const appNavigation = document.getElementById('app-navigation');
    if (mobileMenuToggle && appNavigation) {
        mobileMenuToggle.addEventListener('click', () => {
            appNavigation.classList.toggle('open');
            mobileMenuToggle.classList.toggle('active');
        });
    }

    // Determine which page widgets to load
    const hasCalculator = document.getElementById('amount-input') !== null;
    const hasThresholdTracker = document.getElementById('threshold-turnover') !== null;
    const hasViesChecker = document.getElementById('checker-vat-input') !== null;
    const hasRefundEstimator = document.getElementById('refund-spend') !== null;

    if (hasCalculator) initCalculatorWidget();
    if (hasThresholdTracker) initThresholdTrackerWidget();
    if (hasViesChecker) initViesCheckerWidget();
    if (hasRefundEstimator) initRefundEstimatorWidget();

    // Accordion FAQ Toggle Utility
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');
            
            // Close all items
            document.querySelectorAll('.accordion-item').forEach(i => {
                i.classList.remove('active');
            });
            
            // Toggle clicked item
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // ==========================================================================
    // Global Navigation Sync
    // ==========================================================================
    function syncNavLinks() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === page) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // ==========================================================================
    // WIDGET 1: Interactive VAT Calculator (Home, Rates, Electricity pages)
    // ==========================================================================
    function initCalculatorWidget() {
        const tabIE = document.getElementById('tab-ie');
        const tabGB = document.getElementById('tab-gb');
        const modeAdd = document.querySelector('input[name="calc-mode"][value="add"]');
        const modeRemove = document.querySelector('input[name="calc-mode"][value="remove"]');
        const modeRadios = document.querySelectorAll('input[name="calc-mode"]');
        
        const amountLabel = document.getElementById('amount-label');
        const amountInput = document.getElementById('amount-input');
        const currSymbol = document.getElementById('curr-symbol');
        
        const ratePresetsContainer = document.getElementById('rate-presets-container');
        const customRateGroup = document.getElementById('custom-rate-group');
        const customRateInput = document.getElementById('custom-rate');
        const quickButtonsContainer = document.getElementById('quick-buttons-container');
        
        // Result elements
        const netValue = document.getElementById('net-value');
        const vatValue = document.getElementById('vat-value');
        const grossValue = document.getElementById('gross-value');
        const vatAppliedLabel = document.getElementById('vat-applied-label');
        
        // Chart elements
        const chartNetSeg = document.getElementById('chart-net-seg');
        const chartVatSeg = document.getElementById('chart-vat-seg');
        const chartVatPercentage = document.getElementById('chart-vat-percentage');
        const legendNetPct = document.getElementById('legend-net-pct');
        const legendVatPct = document.getElementById('legend-vat-pct');
        
        // History elements
        const saveHistoryBtn = document.getElementById('save-history');
        const clearHistoryBtn = document.getElementById('clear-history');
        const exportHistoryBtn = document.getElementById('export-history');
        const shareBtn = document.getElementById('share-calculation');
        const historyEmpty = document.getElementById('history-empty');
        const historyTable = document.getElementById('history-table');
        const historyBody = document.getElementById('history-body');

        const CIRCUMFERENCE = 439.82; // 2 * Math.PI * 70 (r=70)
        
        let currentCountry = 'IE';
        let currentMode = 'add';
        let activeRate = 23;
        let isCustomRate = false;
        let history = [];

        // Check page locking rules
        const isRatesPage = document.body.dataset.pageType === 'rates-ie';
        const isElectricityPage = document.body.dataset.pageType === 'electricity-ie';

        const countryConfig = {
            IE: {
                symbol: '€',
                defaultRate: 23,
                presets: [23, 13.5, 9, 4.8, 0, 'Custom'],
                bodyClass: 'country-ie',
                quickLookups: [
                    { label: '59 + VAT', mode: 'add', rate: 23, amount: 59 },
                    { label: '100 + VAT', mode: 'add', rate: 23, amount: 100 },
                    { label: '5000 + VAT', mode: 'add', rate: 23, amount: 5000 },
                    { label: '10,500 ex. VAT', mode: 'add', rate: 23, amount: 10500 },
                    { label: 'Remove 23% from 100', mode: 'remove', rate: 23, amount: 100 },
                    { label: '16 incl. VAT (23%)', mode: 'remove', rate: 23, amount: 16 }
                ]
            },
            GB: {
                symbol: '£',
                defaultRate: 20,
                presets: [20, 5, 0, 'Custom'],
                bodyClass: 'country-gb',
                quickLookups: [
                    { label: '20 + VAT', mode: 'add', rate: 20, amount: 20 },
                    { label: '100 + VAT', mode: 'add', rate: 20, amount: 100 },
                    { label: '3000 + VAT', mode: 'add', rate: 20, amount: 3000 },
                    { label: 'Remove 20% from 100', mode: 'remove', rate: 20, amount: 100 },
                    { label: '21.60 with 20% VAT', mode: 'remove', rate: 20, amount: 21.60 },
                    { label: '5000 + VAT', mode: 'add', rate: 20, amount: 5000 }
                ]
            }
        };

        function calculatorInit() {
            // Read saved local history
            loadHistory();
            
            // Adjust defaults if locked pages are active
            if (isRatesPage) {
                currentCountry = 'IE';
                setCountry('IE');
                if (tabGB) tabGB.classList.add('hidden'); // Hide UK Tab
            } else if (isElectricityPage) {
                currentCountry = 'IE';
                setCountry('IE');
                if (tabGB) tabGB.classList.add('hidden'); // Hide UK Tab
                
                // Lock rate selection to 9%
                activeRate = 9;
                isCustomRate = false;
                if (ratePresetsContainer) ratePresetsContainer.classList.add('hidden');
                if (customRateGroup) customRateGroup.classList.add('hidden');
                
                // Hide presets and quick lookups labels
                const presetsParent = ratePresetsContainer.closest('.form-group');
                if (presetsParent) {
                    const presetsLabel = presetsParent.querySelector('label');
                    if (presetsLabel) presetsLabel.textContent = 'VAT Rate Locked to 9% (Gas & Electricity)';
                }
                const quickLookupsCard = document.querySelector('.quick-lookups');
                if (quickLookupsCard) quickLookupsCard.classList.add('hidden');
            } else {
                setCountry('IE'); // Normal Home defaults
            }
            
            // Read URL query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const paramAmount = urlParams.get('amount');
            const paramRate = urlParams.get('rate');
            const paramMode = urlParams.get('mode');
            const paramCountry = urlParams.get('country');
            
            if (paramCountry && (paramCountry === 'IE' || paramCountry === 'GB') && !isRatesPage && !isElectricityPage) {
                setCountry(paramCountry);
            }
            
            if (paramMode && (paramMode === 'add' || paramMode === 'remove')) {
                currentMode = paramMode;
                if (currentMode === 'add') {
                    if (modeAdd) modeAdd.checked = true;
                    if (amountLabel) amountLabel.textContent = 'Amount (Net / Ex. VAT)';
                } else {
                    if (modeRemove) modeRemove.checked = true;
                    if (amountLabel) amountLabel.textContent = 'Amount (Gross / Inc. VAT)';
                }
            }
            
            if (paramAmount) {
                const parsedAmount = parseFloat(paramAmount);
                if (!isNaN(parsedAmount) && parsedAmount >= 0) {
                    amountInput.value = parsedAmount;
                }
            }
            
            if (paramRate && !isElectricityPage) {
                const parsedRate = parseFloat(paramRate);
                if (!isNaN(parsedRate) && parsedRate >= 0 && parsedRate <= 100) {
                    const config = countryConfig[currentCountry];
                    const hasPreset = config.presets.includes(parsedRate);
                    if (hasPreset) {
                        isCustomRate = false;
                        activeRate = parsedRate;
                        if (customRateGroup) customRateGroup.classList.add('hidden');
                        setActivePresetButton(parsedRate);
                    } else {
                        isCustomRate = true;
                        activeRate = parsedRate;
                        if (customRateInput) customRateInput.value = parsedRate;
                        if (customRateGroup) customRateGroup.classList.remove('hidden');
                        setActivePresetButton('Custom');
                    }
                }
            }
            
            calculate();
        }

        function setCountry(countryCode) {
            currentCountry = countryCode;
            const config = countryConfig[countryCode];
            
            if (tabIE && tabGB) {
                if (countryCode === 'IE') {
                    tabIE.classList.add('active');
                    tabGB.classList.remove('active');
                } else {
                    tabGB.classList.add('active');
                    tabIE.classList.remove('active');
                }
            }
            
            body.classList.remove('country-ie', 'country-gb');
            body.classList.add(config.bodyClass);
            
            if (currSymbol) currSymbol.textContent = config.symbol;
            
            // Only render presets and quick actions if not locked on electricity
            if (!isElectricityPage) {
                renderPresets(config.presets);
                renderQuickLookups(config.quickLookups);
                isCustomRate = false;
                activeRate = config.defaultRate;
                setActivePresetButton(activeRate);
                if (customRateGroup) customRateGroup.classList.add('hidden');
            }
            
            calculate();
        }

        function renderPresets(presets) {
            if (!ratePresetsContainer) return;
            ratePresetsContainer.innerHTML = '';
            presets.forEach(rate => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'rate-btn';
                btn.textContent = rate === 'Custom' ? 'Custom' : `${rate}%`;
                btn.dataset.rate = rate;
                btn.addEventListener('click', () => handlePresetClick(rate));
                ratePresetsContainer.appendChild(btn);
            });
        }

        function renderQuickLookups(lookups) {
            if (!quickButtonsContainer) return;
            quickButtonsContainer.innerHTML = '';
            lookups.forEach(lookup => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quick-btn';
                btn.textContent = lookup.label;
                btn.addEventListener('click', () => applyQuickLookup(lookup));
                quickButtonsContainer.appendChild(btn);
            });
        }

        function applyQuickLookup(lookup) {
            currentMode = lookup.mode;
            if (currentMode === 'add') {
                if (modeAdd) modeAdd.checked = true;
                if (amountLabel) amountLabel.textContent = 'Amount (Net / Ex. VAT)';
            } else {
                if (modeRemove) modeRemove.checked = true;
                if (amountLabel) amountLabel.textContent = 'Amount (Gross / Inc. VAT)';
            }
            
            amountInput.value = lookup.amount;
            
            const hasPreset = countryConfig[currentCountry].presets.includes(lookup.rate);
            if (hasPreset) {
                isCustomRate = false;
                activeRate = lookup.rate;
                if (customRateGroup) customRateGroup.classList.add('hidden');
                setActivePresetButton(lookup.rate);
            } else {
                isCustomRate = true;
                activeRate = lookup.rate;
                if (customRateInput) customRateInput.value = lookup.rate;
                if (customRateGroup) customRateGroup.classList.remove('hidden');
                setActivePresetButton('Custom');
            }
            
            calculate();
        }

        function setActivePresetButton(rate) {
            if (!ratePresetsContainer) return;
            const buttons = ratePresetsContainer.querySelectorAll('.rate-btn');
            buttons.forEach(btn => {
                if (btn.dataset.rate === String(rate)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        function handlePresetClick(rate) {
            if (rate === 'Custom') {
                isCustomRate = true;
                if (customRateGroup) customRateGroup.classList.remove('hidden');
                activeRate = parseFloat(customRateInput.value) || 0;
                setActivePresetButton('Custom');
            } else {
                isCustomRate = false;
                if (customRateGroup) customRateGroup.classList.add('hidden');
                activeRate = parseFloat(rate);
                setActivePresetButton(rate);
            }
            calculate();
        }

        function calculate() {
            const amount = parseFloat(amountInput.value) || 0;
            const rate = isElectricityPage ? 9 : (isCustomRate ? (parseFloat(customRateInput.value) || 0) : activeRate);
            const symbol = countryConfig[currentCountry].symbol;
            
            let net = 0;
            let vat = 0;
            let gross = 0;
            
            if (currentMode === 'add') {
                net = amount;
                vat = net * (rate / 100);
                gross = net + vat;
            } else {
                gross = amount;
                net = gross / (1 + (rate / 100));
                vat = gross - net;
            }
            
            if (netValue) netValue.textContent = formatCurrency(net, symbol);
            if (vatValue) vatValue.textContent = formatCurrency(vat, symbol);
            if (grossValue) grossValue.textContent = formatCurrency(gross, symbol);
            if (vatAppliedLabel) vatAppliedLabel.textContent = `(${rate}% VAT)`;
            
            updateChart(net, vat, gross);
        }

        function formatCurrency(val, symbol) {
            return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        function updateChart(net, vat, gross) {
            let netPct = 0;
            let vatPct = 0;
            
            if (gross > 0) {
                netPct = (net / gross) * 100;
                vatPct = (vat / gross) * 100;
            }
            
            if (legendNetPct) legendNetPct.textContent = `${netPct.toFixed(1)}%`;
            if (legendVatPct) legendVatPct.textContent = `${vatPct.toFixed(1)}%`;
            if (chartVatPercentage) chartVatPercentage.textContent = `${vatPct.toFixed(1)}%`;
            
            const netDash = (netPct / 100) * CIRCUMFERENCE;
            const vatDash = (vatPct / 100) * CIRCUMFERENCE;
            
            if (chartNetSeg) {
                chartNetSeg.style.strokeDasharray = `${netDash} ${CIRCUMFERENCE}`;
                chartNetSeg.style.strokeDashoffset = 0;
            }
            if (chartVatSeg) {
                chartVatSeg.style.strokeDasharray = `${vatDash} ${CIRCUMFERENCE}`;
                chartVatSeg.style.strokeDashoffset = -netDash;
            }
        }

        function saveHistory() {
            const amount = parseFloat(amountInput.value) || 0;
            if (amount <= 0) return;
            
            const rate = isElectricityPage ? 9 : (isCustomRate ? (parseFloat(customRateInput.value) || 0) : activeRate);
            const symbol = countryConfig[currentCountry].symbol;
            
            let net = 0;
            let vat = 0;
            let gross = 0;
            
            if (currentMode === 'add') {
                net = amount;
                vat = net * (rate / 100);
                gross = net + vat;
            } else {
                gross = amount;
                net = gross / (1 + (rate / 100));
                vat = gross - net;
            }
            
            const item = {
                id: Date.now(),
                country: currentCountry,
                mode: currentMode,
                amount: amount,
                rate: rate,
                net: net,
                vat: vat,
                gross: gross,
                symbol: symbol
            };
            
            history.unshift(item);
            if (history.length > 20) history.pop();
            
            localStorage.setItem('vat_calc_history', JSON.stringify(history));
            renderHistoryList();
        }

        function loadHistory() {
            try {
                const data = localStorage.getItem('vat_calc_history');
                history = data ? JSON.parse(data) : [];
            } catch (e) {
                history = [];
            }
            renderHistoryList();
        }

        function deleteHistoryItem(id) {
            history = history.filter(item => item.id !== id);
            localStorage.setItem('vat_calc_history', JSON.stringify(history));
            renderHistoryList();
        }

        function clearAllHistory() {
            history = [];
            localStorage.removeItem('vat_calc_history');
            renderHistoryList();
        }

        function renderHistoryList() {
            if (!historyBody) return;
            historyBody.innerHTML = '';
            
            if (history.length === 0) {
                if (historyEmpty) historyEmpty.classList.remove('hidden');
                if (historyTable) historyTable.classList.add('hidden');
                return;
            }
            
            if (historyEmpty) historyEmpty.classList.add('hidden');
            if (historyTable) historyTable.classList.remove('hidden');
            
            history.forEach(item => {
                const tr = document.createElement('tr');
                
                const countryBadge = item.country === 'IE' 
                    ? '<span class="badge badge-ie">Ireland</span>' 
                    : '<span class="badge badge-gb">UK</span>';
                const modeBadge = item.mode === 'add' 
                    ? '<span class="badge badge-mode-add">Add</span>' 
                    : '<span class="badge badge-mode-remove">Remove</span>';
                    
                tr.innerHTML = `
                    <td>${countryBadge}</td>
                    <td>${modeBadge}</td>
                    <td>${formatCurrency(item.net, item.symbol)}</td>
                    <td><strong>${item.rate}%</strong></td>
                    <td class="text-accent">${formatCurrency(item.vat, item.symbol)}</td>
                    <td><strong>${formatCurrency(item.gross, item.symbol)}</strong></td>
                    <td>
                        <button class="history-action-btn" data-id="${item.id}" aria-label="Delete this calculation">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </td>
                `;
                
                tr.addEventListener('click', (e) => {
                    if (e.target.closest('.history-action-btn')) return;
                    loadHistoryItemIntoCalculator(item);
                });
                
                const deleteBtn = tr.querySelector('.history-action-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteHistoryItem(item.id);
                });
                
                historyBody.appendChild(tr);
            });
        }

        function loadHistoryItemIntoCalculator(item) {
            // Lock protections during reload
            if (isRatesPage && item.country !== 'IE') return;
            if (isElectricityPage && (item.country !== 'IE' || item.rate !== 9)) return;

            currentCountry = item.country;
            const config = countryConfig[currentCountry];
            
            if (tabIE && tabGB) {
                if (currentCountry === 'IE') {
                    tabIE.classList.add('active');
                    tabGB.classList.remove('active');
                } else {
                    tabGB.classList.add('active');
                    tabIE.classList.remove('active');
                }
            }
            
            body.classList.remove('country-ie', 'country-gb');
            body.classList.add(config.bodyClass);
            if (currSymbol) currSymbol.textContent = config.symbol;
            
            if (!isElectricityPage) {
                renderPresets(config.presets);
                renderQuickLookups(config.quickLookups);
            }
            
            currentMode = item.mode;
            if (currentMode === 'add') {
                if (modeAdd) modeAdd.checked = true;
                if (amountLabel) amountLabel.textContent = 'Amount (Net / Ex. VAT)';
            } else {
                if (modeRemove) modeRemove.checked = true;
                if (amountLabel) amountLabel.textContent = 'Amount (Gross / Inc. VAT)';
            }
            
            amountInput.value = item.amount;
            
            if (!isElectricityPage) {
                const hasPreset = config.presets.includes(item.rate);
                if (hasPreset) {
                    isCustomRate = false;
                    activeRate = item.rate;
                    if (customRateGroup) customRateGroup.classList.add('hidden');
                    setActivePresetButton(item.rate);
                } else {
                    isCustomRate = true;
                    activeRate = item.rate;
                    if (customRateInput) customRateInput.value = item.rate;
                    if (customRateGroup) customRateGroup.classList.remove('hidden');
                    setActivePresetButton('Custom');
                }
            }
            
            calculate();
            document.querySelector('.calculator-hero').scrollIntoView({ behavior: 'smooth' });
        }

        // Copy Clipboard Button Handling
        const copyBtns = document.querySelectorAll('.copy-btn');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const copyType = btn.dataset.copy;
                let valToCopy = '';
                
                const amount = parseFloat(amountInput.value) || 0;
                const rate = isElectricityPage ? 9 : (isCustomRate ? (parseFloat(customRateInput.value) || 0) : activeRate);
                
                let net = 0;
                let vat = 0;
                let gross = 0;
                
                if (currentMode === 'add') {
                    net = amount;
                    vat = net * (rate / 100);
                    gross = net + vat;
                } else {
                    gross = amount;
                    net = gross / (1 + (rate / 100));
                    vat = gross - net;
                }
                
                if (copyType === 'net') valToCopy = net.toFixed(2);
                else if (copyType === 'vat') valToCopy = vat.toFixed(2);
                else if (copyType === 'gross') valToCopy = gross.toFixed(2);
                
                navigator.clipboard.writeText(valToCopy).then(() => {
                    btn.classList.add('copied');
                    setTimeout(() => btn.classList.remove('copied'), 2000);
                });
            });
        });

        function shareCurrentCalculation() {
            const amount = parseFloat(amountInput.value) || 0;
            const rate = isElectricityPage ? 9 : (isCustomRate ? (parseFloat(customRateInput.value) || 0) : activeRate);
            const country = currentCountry;
            const mode = currentMode;
            
            const url = new URL(window.location.href);
            url.searchParams.set('amount', amount);
            if (!isElectricityPage) {
                url.searchParams.set('rate', rate);
            }
            url.searchParams.set('mode', mode);
            if (!isRatesPage && !isElectricityPage) {
                url.searchParams.set('country', country);
            }
            
            navigator.clipboard.writeText(url.toString()).then(() => {
                if (shareBtn) {
                    shareBtn.classList.add('copied');
                    setTimeout(() => shareBtn.classList.remove('copied'), 2000);
                }
            });
        }

        function exportHistoryToCSV() {
            if (history.length === 0) return;
            
            const headers = ["Country", "Mode", "Amount", "Rate", "Net", "VAT", "Gross", "Timestamp"];
            const rows = history.map(item => [
                item.country,
                item.mode === 'add' ? 'Add VAT' : 'Remove VAT',
                item.amount,
                item.rate + '%',
                item.net.toFixed(2),
                item.vat.toFixed(2),
                item.gross.toFixed(2),
                new Date(item.id).toLocaleString()
            ]);
            
            const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "vat_calculations.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // Main event listeners
        if (tabIE) tabIE.addEventListener('click', () => setCountry('IE'));
        if (tabGB) tabGB.addEventListener('click', () => setCountry('GB'));
        
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentMode = e.target.value;
                if (currentMode === 'add') {
                    if (amountLabel) amountLabel.textContent = 'Amount (Net / Ex. VAT)';
                } else {
                    if (amountLabel) amountLabel.textContent = 'Amount (Gross / Inc. VAT)';
                }
                calculate();
            });
        });
        
        amountInput.addEventListener('input', calculate);
        if (customRateInput) customRateInput.addEventListener('input', calculate);
        if (saveHistoryBtn) saveHistoryBtn.addEventListener('click', saveHistory);
        if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearAllHistory);
        if (exportHistoryBtn) exportHistoryBtn.addEventListener('click', exportHistoryToCSV);
        if (shareBtn) shareBtn.addEventListener('click', shareCurrentCalculation);

        // Run setup
        calculatorInit();
    }

    // ==========================================================================
    // WIDGET 2: Turnover Threshold Tracker (Threshold page - Emoji Free)
    // ==========================================================================
    function initThresholdTrackerWidget() {
        const turnoverInput = document.getElementById('threshold-turnover');
        const thresholdTypeSelect = document.getElementById('threshold-type');
        const progressBarFill = document.getElementById('tracker-progress-fill');
        const progressPercentText = document.getElementById('tracker-percentage');
        const adviceBox = document.getElementById('tracker-advice');
        const statsLabel = document.getElementById('tracker-stats-label');

        const thresholds = {
            goods: 85000,
            services: 42500
        };

        function updateThresholdProgress() {
            const turnover = parseFloat(turnoverInput.value) || 0;
            const type = thresholdTypeSelect.value;
            const limit = thresholds[type];
            
            const pct = Math.min((turnover / limit) * 100, 100);
            
            // Update Visual Progress Bar
            progressBarFill.style.width = `${pct}%`;
            progressPercentText.textContent = `${pct.toFixed(1)}%`;
            
            // Adjust Bar Colors dynamically
            progressBarFill.className = 'progress-bar-fill';
            adviceBox.className = 'advice-box';
            
            if (pct < 50) {
                progressBarFill.classList.add('progress-safe');
                adviceBox.classList.add('advice-safe');
                adviceBox.innerHTML = `<strong>Your turnover is currently safe.</strong> You are well below the registration threshold of €${limit.toLocaleString()} for sole traders and companies in Ireland. Continue monitoring your rolling 12-month turnover.`;
            } else if (pct >= 50 && pct < 85) {
                progressBarFill.classList.add('progress-warning');
                adviceBox.classList.add('advice-warning');
                adviceBox.innerHTML = `<strong>Approaching threshold.</strong> Your business is at ${pct.toFixed(0)}% of the mandatory registration limit of €${limit.toLocaleString()}. We recommend setting up ROS credentials early or preparing for invoicing adjustments.`;
            } else {
                progressBarFill.classList.add('progress-danger');
                adviceBox.classList.add('advice-danger');
                if (pct === 100) {
                    adviceBox.innerHTML = `<strong>Action required!</strong> You have reached or exceeded the mandatory registration threshold of €${limit.toLocaleString()}. You must register for VAT through ROS using Form TR1 (sole traders) or Form TR2 (companies) immediately.`;
                } else {
                    adviceBox.innerHTML = `<strong>Critical zone.</strong> You are within 15% of the mandatory limit of €${limit.toLocaleString()}. If your rolling 12-month forecast is expected to cross this threshold, start the ROS registration process now.`;
                }
            }
            
            // Update stats text
            const remaining = Math.max(limit - turnover, 0);
            statsLabel.innerHTML = `Turnover: <strong>€${turnover.toLocaleString()}</strong> / €${limit.toLocaleString()} | Remaining before mandatory registration: <strong>€${remaining.toLocaleString()}</strong>`;
        }

        turnoverInput.addEventListener('input', updateThresholdProgress);
        thresholdTypeSelect.addEventListener('change', updateThresholdProgress);
        
        // Initial run
        updateThresholdProgress();
    }

    // ==========================================================================
    // WIDGET 3: VIES VAT Number Validator (VIES Checker page - Emoji Free)
    // ==========================================================================
    function initViesCheckerWidget() {
        const countrySelect = document.getElementById('checker-country-select');
        const vatInput = document.getElementById('checker-vat-input');
        const validateBtn = document.getElementById('checker-validate-btn');
        const resultBox = document.getElementById('checker-result-box');

        // Regex patterns for format verification (ignores country code prefix)
        const regexPatterns = {
            IE: /^\d{7}[A-W][A-W]?$/i, // Ireland: 7 digits + 1/2 letters
            GB: /^(\d{9}|\d{12})$/,     // UK: 9 or 12 digits
            XI: /^\d{9}$/,              // Northern Ireland: 9 digits
            DE: /^\d{9}$/,              // Germany: 9 digits
            FR: /^[0-9A-Z]{2}\d{9}$/i,  // France: 2 letters/digits + 9 digits
            IT: /^\d{11}$/,             // Italy: 11 digits
            ES: /^[0-9A-Z]\d{7}[0-9A-Z]$/i // Spain: 9 alphanumeric characters
        };

        const formatDescriptions = {
            IE: "IE + 7 digits + 1 or 2 letters (e.g. IE1234567A or IE1234567AB)",
            GB: "GB + 9 or 12 digits (e.g. GB123456789)",
            XI: "XI + 9 digits (e.g. XI123456789 for Northern Ireland Goods)",
            DE: "DE + 9 digits (e.g. DE123456789)",
            FR: "FR + 2 characters + 9 digits (e.g. FR12345678912)",
            IT: "IT + 11 digits (e.g. IT12345678912)",
            ES: "ES + 9 characters (e.g. ESX1234567Y)"
        };

        function validateVatNumber() {
            const country = countrySelect.value;
            let rawInput = vatInput.value.trim().toUpperCase();
            
            if (!rawInput) {
                renderResult('error', 'Please enter a VAT number to validate.');
                return;
            }
            
            // Strip leading country codes if entered manually
            const prefix = rawInput.substring(0, 2);
            if (prefix === country) {
                rawInput = rawInput.substring(2).trim();
            }
            
            // Find pattern
            const pattern = regexPatterns[country];
            const formatDesc = formatDescriptions[country];
            
            // Verify format structure
            const isValidFormat = pattern ? pattern.test(rawInput) : true;
            
            // Show loading animation on button
            validateBtn.disabled = true;
            const originalBtnContent = validateBtn.innerHTML;
            validateBtn.innerHTML = `<span class="validation-spinner"></span> Checking VIES Registry...`;
            
            setTimeout(() => {
                // Restore button
                validateBtn.disabled = false;
                validateBtn.innerHTML = originalBtnContent;
                
                if (!isValidFormat) {
                    renderResult('invalid', `<strong>Invalid Format Structure.</strong> The input does not match the required pattern.<br><small>Expected Format: ${formatDesc}</small>`, rawInput, country);
                } else {
                    renderResult('valid', `<strong>Valid VAT Format!</strong> Structurally correct and conforms to local registry formatting.`, rawInput, country);
                }
            }, 800);
        }

        function renderResult(status, message, cleanNum, country) {
            resultBox.innerHTML = '';
            
            if (status === 'error') {
                resultBox.innerHTML = `<p style="color:#ef4444; font-weight:600;">Attention: ${message}</p>`;
                return;
            }
            
            const timestamp = new Date().toLocaleString();
            
            if (status === 'invalid') {
                resultBox.innerHTML = `
                    <div class="validation-response-box invalid-res">
                        <div class="res-header res-header-invalid">Format Invalid</div>
                        <p>${message}</p>
                        <div class="res-details">
                            <span>Input Checked: <strong>${country}${cleanNum}</strong></span>
                            <span>Time Checked: <strong>${timestamp}</strong></span>
                        </div>
                    </div>
                `;
            } else {
                const mockCompany = getMockCompanyName(cleanNum, country);
                const isUK = country === 'GB';
                
                let resultHtml = `
                    <div class="validation-response-box valid-res">
                        <div class="res-header res-header-valid">Structurally Valid</div>
                        <p>${message}</p>
                        <div class="res-details">
                            <span>VAT Number: <strong>${country} ${cleanNum}</strong></span>
                            <span>Country: <strong>${countrySelect.options[countrySelect.selectedIndex].text}</strong></span>
                            <span>Registry Status: <strong style="color:#10b981;">ACTIVE (VIES Simulated Verification)</strong></span>
                            <span>Registered Company: <strong>${mockCompany}</strong></span>
                            <span>Validation Stamp: <strong>VIES-REF-${Math.floor(Math.random() * 9000000) + 1000000}</strong></span>
                            <span>Timestamp: <strong>${timestamp}</strong></span>
                        </div>
                `;
                
                if (isUK) {
                    resultHtml += `
                        <div class="hmrc-button-wrapper">
                            <p style="margin-bottom:0.5rem; font-size:0.8rem;"><strong>Note:</strong> Brexit removed UK (GB) VAT lookups from VIES. Check this registration directly with HMRC for official filings:</p>
                            <a href="https://www.gov.uk/check-uk-vat-number" target="_blank" rel="noopener noreferrer" class="hmrc-btn">
                                Search on HMRC Portal
                            </a>
                        </div>
                    `;
                } else {
                    resultHtml += `
                        <div class="hmrc-button-wrapper">
                            <p style="margin-bottom:0.5rem; font-size:0.8rem;">To generate a legal consultation certificate for zero-rating invoices, query the official EU VIES portal:</p>
                            <a href="https://ec.europa.eu/taxation_customs/vies/" target="_blank" rel="noopener noreferrer" class="hmrc-btn" style="background-color:#0d6efd;">
                                Query Official EU VIES Portal
                            </a>
                        </div>
                    `;
                }
                
                resultHtml += `</div>`;
                resultBox.innerHTML = resultHtml;
            }
        }

        function getMockCompanyName(num, country) {
            const sum = num.split('').reduce((acc, char) => acc + (parseInt(char) || 0), 0);
            const corporateNames = [
                "Dublin Technology Services Ltd",
                "Ireland Agri Supplies Ltd",
                "Celtic Financial Solutions",
                "UK Logistics Hub Corp",
                "Belfast Manufacturing Ltd",
                "European Distribution services",
                "Enterprise Services (Dublin) Ltd",
                "Global Consulting Group"
            ];
            return corporateNames[sum % corporateNames.length];
        }

        validateBtn.addEventListener('click', validateVatNumber);
        vatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') validateVatNumber();
        });
    }

    // ==========================================================================
    // WIDGET 4: Tourist VAT Refund Estimator (Tourist Refund page)
    // ==========================================================================
    function initRefundEstimatorWidget() {
        const refundSpendInput = document.getElementById('refund-spend');
        const refundSpendSlider = document.getElementById('refund-spend-slider');
        const refundRateSelect = document.getElementById('refund-rate-select');
        
        const resGrossVat = document.getElementById('refund-res-gross-vat');
        const resAdminFee = document.getElementById('refund-res-admin-fee');
        const resNetRefund = document.getElementById('refund-res-net-refund');
        const resRateLabel = document.getElementById('refund-res-rate-label');

        function calculateRefund() {
            const spend = parseFloat(refundSpendInput.value) || 0;
            const rate = parseFloat(refundRateSelect.value);
            
            const grossVat = spend - (spend / (1 + (rate / 100)));
            const adminFee = spend > 0 ? (grossVat * 0.20) : 0;
            const netRefund = Math.max(grossVat - adminFee, 0);
            
            resGrossVat.textContent = `€${grossVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            resAdminFee.textContent = `€${adminFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            resNetRefund.textContent = `€${netRefund.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            resRateLabel.textContent = `(${rate}% VAT)`;
        }

        refundSpendInput.addEventListener('input', () => {
            refundSpendSlider.value = refundSpendInput.value;
            calculateRefund();
        });

        refundSpendSlider.addEventListener('input', () => {
            refundSpendInput.value = refundSpendSlider.value;
            calculateRefund();
        });

        refundRateSelect.addEventListener('change', calculateRefund);
        calculateRefund();
    }

    // ==========================================================================
    // WIDGET 5: Global Site Search Autocomplete Widget
    // ==========================================================================
    function initSiteSearch() {
        const searchInput = document.getElementById('site-search-input');
        const resultsDropdown = document.getElementById('search-results');
        const searchBtn = document.getElementById('site-search-btn');

        if (!searchInput || !resultsDropdown) return;

        const searchIndex = [
            { title: "Home & VAT Calculator", url: "index.html", keywords: "calculator add remove standard vat rate ireland uk formula gross net" },
            { title: "VAT Rates Ireland 2026", url: "vat-rates-ireland.html", keywords: "rates standard 23 reduced 13.5 second 9 super reduced 4.8 food services exempt zero" },
            { title: "VAT Registration & Thresholds Ireland", url: "vat-registration-threshold-ireland.html", keywords: "registration threshold sole trader goods 85000 services 42500 voluntary limit ros tr1 tr2" },
            { title: "VAT on Electricity Ireland", url: "vat-on-electricity-ireland.html", keywords: "electricity gas energy pso levy standing charge billing utility carbon tax support" },
            { title: "VIES VAT Number Checker", url: "vat-checker-vies.html", keywords: "checker vies validation verify format prefix ie gb xi hmrc cross-border trade" },
            { title: "Tourist VAT Refund Ireland", url: "vat-refund-ireland.html", keywords: "refund refund tourist retail export scheme dublin airport fexco horizon non-eu tax free shopping" },
            { title: "About Us", url: "about-us.html", keywords: "about mission contact info team calculate vat" },
            { title: "Terms & Conditions", url: "terms-conditions.html", keywords: "terms conditions rules disclaimer agreement liability" },
            { title: "Privacy Policy", url: "privacy-policy.html", keywords: "privacy policy data cookies storage safety local" },
            { title: "Sitemap", url: "sitemap.html", keywords: "sitemap index list links guide pages compliance xml" }
        ];

        let highlightedIndex = -1;
        let filteredItems = [];

        function renderResults(results) {
            resultsDropdown.innerHTML = '';
            filteredItems = results;
            highlightedIndex = -1;

            if (results.length === 0) {
                resultsDropdown.innerHTML = '<div class="search-empty">No matching pages found</div>';
                resultsDropdown.classList.add('active');
                return;
            }

            results.forEach((item, index) => {
                const a = document.createElement('a');
                a.href = item.url;
                a.className = 'search-item';
                a.dataset.index = index;
                a.innerHTML = `
                    <div class="search-item-title">${item.title}</div>
                    <div class="search-item-url">${item.url}</div>
                `;
                resultsDropdown.appendChild(a);
            });
            resultsDropdown.classList.add('active');
        }

        function performSearch() {
            const query = searchInput.value.toLowerCase().trim();
            if (!query) {
                resultsDropdown.classList.remove('active');
                filteredItems = [];
                return;
            }

            const terms = query.split(/\s+/);
            const matches = searchIndex.filter(item => {
                return terms.every(term => 
                    item.title.toLowerCase().includes(term) || 
                    item.keywords.toLowerCase().includes(term)
                );
            });

            renderResults(matches);
        }

        searchInput.addEventListener('input', performSearch);
        
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim()) {
                performSearch();
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target) && !searchBtn.contains(e.target)) {
                resultsDropdown.classList.remove('active');
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            const items = resultsDropdown.querySelectorAll('.search-item');
            if (!resultsDropdown.classList.contains('active') || items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                highlightedIndex = (highlightedIndex + 1) % items.length;
                updateHighlight(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
                updateHighlight(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
                    window.location.href = filteredItems[highlightedIndex].url;
                } else if (filteredItems.length > 0) {
                    window.location.href = filteredItems[0].url;
                }
            } else if (e.key === 'Escape') {
                resultsDropdown.classList.remove('active');
                searchInput.blur();
            }
        });

        function updateHighlight(items) {
            items.forEach((item, index) => {
                if (index === highlightedIndex) {
                    item.classList.add('highlighted');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('highlighted');
                }
            });
        }

        searchBtn.addEventListener('click', () => {
            if (filteredItems.length > 0) {
                window.location.href = filteredItems[0].url;
            }
        });
    }
});

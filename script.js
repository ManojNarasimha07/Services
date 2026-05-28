
document.addEventListener('DOMContentLoaded', function(){
    const toggle = document.getElementById('themeToggle');

    if(localStorage.getItem('theme') === 'light'){
        document.body.classList.add('light-mode');
    }

    toggle?.addEventListener('click', function(){
        document.body.classList.toggle('light-mode');

        if(document.body.classList.contains('light-mode')){
            localStorage.setItem('theme','light');
        } else {
            localStorage.setItem('theme','dark');
        }
    });
});

let currentImageIndex = 0;
    const totalImages = 9; // Total images from 0.png to 8.png
    const imageElement = document.getElementById('dynamicImage');

    function changeImage() {
        currentImageIndex = (currentImageIndex + 1) % totalImages;
        imageElement.src = currentImageIndex + '.png';
    }

    setInterval(changeImage, 3000); // Change image every 3 seconds

    function showTable(type) {
        document.getElementById('pvc').classList.add('hidden');
        document.getElementById('iron').classList.add('hidden');
        document.getElementById('other').classList.add('hidden');
        document.getElementById('wood').classList.add('hidden');
        document.getElementById('concrete').classList.add('hidden'); // Hide other products

        if (type) {
            document.getElementById(type).classList.remove('hidden');
        }
    }

    window.onload = function() {
        showTable('pvc'); // Show PVC materials by default
    };

(function () {
    const SUPABASE_URL = 'https://wkldbnkystsqroofvaba.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Con6nSBq4lFs1A2K6jAP4w_o2fY81K2';
    const ADMIN_PASSWORD = 'GT07';
    const TABLE_NAME = 'prices';

    let supabaseClient = null;
    let adminUnlocked = false;
    let editingElement = null;

    const statusEl = document.getElementById('adminStatus');
    const modalEl = document.getElementById('priceEditorModal');
    const modalInputEl = document.getElementById('priceEditorInput');
    const modalMetaEl = document.getElementById('priceEditorMeta');
    const unlockBtn = document.getElementById('unlockEditingBtn');
    const lockBtn = document.getElementById('lockEditingBtn');
    const passwordEl = document.getElementById('adminPassword');
    const saveBtn = document.getElementById('saveEditorBtn');
    const cancelBtn = document.getElementById('cancelEditorBtn');

    function setStatus(msg) {
        if (statusEl) statusEl.textContent = msg;
    }

    function normalizePriceText(text) {
        return String(text || '').trim().replace(/\s+/g, ' ');
    }

    function getSectionIdForElement(el) {
        const section = el.closest('.services');
        return section ? section.id : 'unknown';
    }

    function getRowLabel(el) {
        const row = el.closest('tr');
        if (!row) return 'Unknown row';
        const labelNode = row.querySelector('td:first-child p, td:first-child .product-name');
        return labelNode ? normalizePriceText(labelNode.textContent) : 'Price box';
    }

    function assignStableIds() {
        const sections = document.querySelectorAll('.services');
        sections.forEach((section) => {
            const sectionId = section.id || 'section';
            const priceCells = section.querySelectorAll('.price');
            let currentRowIndex = 0;
            let rowMap = new Map();

            section.querySelectorAll('tbody tr').forEach((row, rowIndex) => {
                const pricesInRow = row.querySelectorAll('.price');
                pricesInRow.forEach((priceEl, priceIndex) => {
                    if (!priceEl.dataset.priceId) {
                        const rowText = getRowLabel(priceEl).toLowerCase()
                            .replace(/[^a-z0-9]+/g, '_')
                            .replace(/^_|_$/g, '')
                            .slice(0, 48) || 'item';
                        priceEl.dataset.priceId = `${sectionId}__r${rowIndex}__p${priceIndex}__${rowText}`;
                    }
                    priceEl.dataset.sectionId = sectionId;
                    priceEl.dataset.rowIndex = String(rowIndex);
                    priceEl.dataset.priceIndex = String(priceIndex);
                    priceEl.classList.add('price-clickable', 'price-locked');
                });
            });
        });
    }

    function collectPricePayload() {
        return Array.from(document.querySelectorAll('.price')).map((el) => ({
            id: el.dataset.priceId,
            value: normalizePriceText(el.textContent),
            section: el.dataset.sectionId || getSectionIdForElement(el),
            row_label: getRowLabel(el),
            row_index: Number(el.dataset.rowIndex || 0),
            price_index: Number(el.dataset.priceIndex || 0)
        }));
    }

    function openModalForElement(el) {
        editingElement = el;
        const rowLabel = getRowLabel(el);
        modalMetaEl.textContent = `${rowLabel}\nID: ${el.dataset.priceId}`;
        modalInputEl.value = normalizePriceText(el.textContent);
        modalEl.classList.add('open');
        modalEl.setAttribute('aria-hidden', 'false');
        setTimeout(() => modalInputEl.focus(), 50);
    }

    function closeModal() {
        editingElement = null;
        modalEl.classList.remove('open');
        modalEl.setAttribute('aria-hidden', 'true');
    }

    async function upsertPriceRow(payload) {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.from(TABLE_NAME).upsert(payload, { onConflict: 'id' });
        if (error) {
            console.error('Supabase save error:', error);
            setStatus('Save failed. Check Supabase table, RLS, and policies.');
            return false;
        }
        return true;
    }

    async function loadPricesFromSupabase() {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient.from(TABLE_NAME).select('id,value');
        if (error) {
            console.error('Supabase load error:', error);
            setStatus('Load failed. Check Supabase table, RLS, and policies.');
            return;
        }

        const map = new Map();
        (data || []).forEach(row => {
            if (row && row.id != null) map.set(String(row.id), String(row.value ?? ''));
        });

        document.querySelectorAll('.price').forEach(el => {
            const id = el.dataset.priceId;
            if (map.has(id)) {
                el.textContent = map.get(id);
            }
        });
    }

    async function seedMissingRows() {
        if (!supabaseClient) return;
        const payload = collectPricePayload();

        const { data, error } = await supabaseClient.from(TABLE_NAME).select('id');
        if (error) {
            console.error('Seed check error:', error);
            return;
        }

        const existing = new Set((data || []).map(row => String(row.id)));
        const missing = payload.filter(row => !existing.has(row.id));

        if (missing.length) {
            const { error: insertError } = await supabaseClient.from(TABLE_NAME).upsert(missing, { onConflict: 'id' });
            if (insertError) {
                console.error('Seed insert error:', insertError);
                setStatus('Initial sync could not complete. Check permissions.');
                return;
            }
        }
    }

    function enableEditing(enabled) {
        adminUnlocked = enabled;
        document.querySelectorAll('.price').forEach(el => {
            el.classList.toggle('price-clickable', enabled);
            el.classList.toggle('price-locked', !enabled);
        });
        setStatus(enabled ? 'Admin mode unlocked. Tap any price box to edit.' : 'Viewing mode enabled. Prices are locked.');
    }

    function bindPriceClicks() {
        document.addEventListener('click', async (ev) => {
            const priceEl = ev.target.closest('.price');
            if (!priceEl) return;

            if (!adminUnlocked) {
                return;
            }
            openModalForElement(priceEl);
        });

        unlockBtn.addEventListener('click', async () => {
            const entered = (passwordEl.value || '').trim();
            if (entered !== ADMIN_PASSWORD) {
                alert('Wrong password');
                return;
            }
            enableEditing(true);
            passwordEl.value = '';
        });

        lockBtn.addEventListener('click', () => {
            enableEditing(false);
            closeModal();
        });

        cancelBtn.addEventListener('click', closeModal);

        modalEl.addEventListener('click', (ev) => {
            if (ev.target === modalEl) closeModal();
        });

        saveBtn.addEventListener('click', async () => {
            if (!editingElement) return;
            const newValue = normalizePriceText(modalInputEl.value);
            if (!newValue) {
                alert('Enter a price first');
                return;
            }

            editingElement.textContent = newValue;

            const payload = {
                id: editingElement.dataset.priceId,
                value: newValue,
                section: editingElement.dataset.sectionId || getSectionIdForElement(editingElement),
                row_label: getRowLabel(editingElement),
                row_index: Number(editingElement.dataset.rowIndex || 0),
                price_index: Number(editingElement.dataset.priceIndex || 0),
                updated_at: new Date().toISOString()
            };

            const ok = await upsertPriceRow(payload);
            if (ok) {
                closeModal();
                setStatus(`Saved ${payload.id} to Supabase.`);
            }
        });

        modalInputEl.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                saveBtn.click();
            }
            if (ev.key === 'Escape') {
                ev.preventDefault();
                closeModal();
            }
        });

        passwordEl.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') unlockBtn.click();
        });
    }

    async function initSupabase() {
        if (!window.supabase) {
            setStatus('Supabase library did not load.');
            return;
        }

        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        assignStableIds();
        bindPriceClicks();

        // Load first, then seed any missing rows from the HTML, then load again.
        await loadPricesFromSupabase();
        await seedMissingRows();
        await loadPricesFromSupabase();

        enableEditing(false);
    }

    // Keep your old table behavior and image rotation untouched.
    window.addEventListener('load', initSupabase);
})();

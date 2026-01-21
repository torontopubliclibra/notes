const noteInfoBar = document.getElementById('noteInfoBar');
const charCountSpan = document.getElementById('charCount');
const lastUpdatedSpan = document.getElementById('lastUpdated');
const tabsContainer = document.getElementById('tabs');
const textarea = document.getElementById('tabTextarea');
const noteCloseBtn = document.getElementById('noteCloseBtn');
const noteSwatches = document.getElementById('noteSwatches');
const COLOR_CLASSES = ['blue', 'purple', 'red', 'green', 'orange', 'yellow'];
let DEFAULT_COLOR = null; // Will be set on first note load

function getRandomColor() {
    return COLOR_CLASSES[Math.floor(Math.random() * COLOR_CLASSES.length)];
}

function loadNotes() {
    let notes = localStorage.getItem('nt2_notes_v2');
    let tab = localStorage.getItem('nt2_currentTab');
    let parsed = [];
    try {
        parsed = notes ? JSON.parse(notes) : null;
    } catch {
        parsed = null;
    }
    if (!Array.isArray(parsed) || !parsed.length || typeof parsed[0] === 'string') {
        let oldNotes = localStorage.getItem('nt2_notes');
        try {
            oldNotes = oldNotes ? JSON.parse(oldNotes) : [""];
        } catch { oldNotes = [""] }
        // Set DEFAULT_COLOR for first note
        DEFAULT_COLOR = COLOR_CLASSES[Math.floor(Math.random() * COLOR_CLASSES.length)];
        parsed = oldNotes.map((t, i) => ({text: t, color: i === 0 ? DEFAULT_COLOR : getRandomColor()}));
    }
    if (!parsed || !parsed.length) {
        DEFAULT_COLOR = COLOR_CLASSES[Math.floor(Math.random() * COLOR_CLASSES.length)];
        parsed = [{text: '', color: DEFAULT_COLOR}];
    } else if (DEFAULT_COLOR === null) {
        DEFAULT_COLOR = parsed[0].color || COLOR_CLASSES[0];
    }
    parsed.forEach((note, i) => {
        if (!('lastUpdated' in note)) note.lastUpdated = null;
        if (!('color' in note) || !COLOR_CLASSES.includes(note.color)) note.color = i === 0 ? DEFAULT_COLOR : getRandomColor();
    });
    return {
        tabContents: Array.isArray(parsed) && parsed.length ? parsed : [{text: '', color: DEFAULT_COLOR}],
        currentTab: tab !== null && !isNaN(Number(tab)) ? Math.max(0, Math.min(Number(tab), parsed.length - 1)) : 0
    };
}

function saveNotes() {
    localStorage.setItem('nt2_notes_v2', JSON.stringify(tabContents));
    localStorage.setItem('nt2_currentTab', currentTab);
}

let { tabContents, currentTab } = loadNotes();

function renderTabs() {
    tabsContainer.innerHTML = '';
    let untitledCount = 0;
    tabContents.forEach((note, idx) => {
        const tabBtn = document.createElement('button');
        let colorClass = 'tab-color-' + (note.color || DEFAULT_COLOR);
        tabBtn.className = 'tab ' + colorClass + (idx === currentTab ? ' active' : '');
        let label;
        let firstLine = note.text ? note.text.split(/\r?\n/)[0].trim() : '';
        if (firstLine.length > 0) {
            // Get first line, truncate to 10 chars
            label = firstLine.length > 10 ? firstLine.slice(0, 10) + '...' : firstLine;
        } else {
            if (untitledCount === 0) {
                label = 'untitled';
            } else {
                label = `untitled-${untitledCount}`;
            }
            untitledCount++;
        }
        tabBtn.textContent = label;
        tabBtn.title = label;
        tabBtn.dataset.idx = idx;
        tabsContainer.appendChild(tabBtn);
    });
    // Add-tab button
    const addTabBtn = document.createElement('button');
    addTabBtn.className = 'tab add-tab';
    addTabBtn.id = 'addTab';
    addTabBtn.textContent = '+';
    tabsContainer.appendChild(addTabBtn);
    setNoteColor(tabContents[currentTab].color || DEFAULT_COLOR, true);
    saveNotes();
    updateInfoBar();
}

function updateInfoBar() {
    if (!charCountSpan || !lastUpdatedSpan) return;
    const note = tabContents[currentTab];
    let chars = 0;
    if (note.text) {
        chars = note.text.replace(/[\r\n]/g, '').length;
    }
    charCountSpan.textContent = chars + (chars === 1 ? ' character' : ' characters');
    if (note.lastUpdated) {
        const d = new Date(note.lastUpdated);
        lastUpdatedSpan.textContent = 'Last updated: ' + d.toLocaleString();
    } else {
        lastUpdatedSpan.textContent = 'Last updated: never';
    }
}
function switchTab(idx) {
    tabContents[currentTab].text = textarea.value;
    currentTab = idx;
    textarea.value = tabContents[currentTab].text || "";
    setNoteColor(tabContents[currentTab].color || DEFAULT_COLOR);
    renderTabs();
    updateInfoBar();
}

// Tab click and add tab logic
if (tabsContainer) {
    tabsContainer.addEventListener('click', function(e) {
        // Tab click
        if (e.target.classList.contains('tab') && !e.target.classList.contains('add-tab')) {
            const idx = Number(e.target.dataset.idx);
            if (typeof idx === 'number' && !isNaN(idx)) switchTab(idx);
        }
        // Add tab
        if (e.target.classList.contains('add-tab')) {
            tabContents[currentTab].text = textarea.value;
            // Count empty and untitled notes
            let emptyUntitledCount = tabContents.filter((note, idx) => {
                let isEmpty = !note.text || note.text.trim().length === 0;
                let isUntitled = true;
                if (note.text && note.text.trim().length > 0) {
                    let firstLine = note.text.split(/\r?\n/)[0].trim();
                    if (firstLine.length > 0) isUntitled = false;
                }
                return isEmpty && isUntitled;
            }).length;
            if (emptyUntitledCount >= 3) {
                return;
            }
            tabContents.push({text: '', color: getRandomColor(), lastUpdated: null});
            switchTab(tabContents.length - 1);
        }
    });
}

if (noteCloseBtn) {
    noteCloseBtn.addEventListener('click', function() {
        if (tabContents.length === 1) {
            if (confirm('Are you sure you want to delete this note?')) {
                textarea.value = "";
                tabContents[0].text = "";
                tabContents[0].lastUpdated = null;
                const newColor = getRandomColor();
                tabContents[0].color = newColor;
                setNoteColor(newColor);
                renderTabs();
                saveNotes();
            }
            return;
        }
        if (confirm('Are you sure you want to delete this note?')) {
            tabContents.splice(currentTab, 1);
            if (currentTab >= tabContents.length) {
                currentTab = tabContents.length - 1;
            }
            textarea.value = tabContents[currentTab].text || "";
            setNoteColor(tabContents[currentTab].color || DEFAULT_COLOR);
            renderTabs();
            updateInfoBar();
        }
    });
}

if (textarea) {
    textarea.addEventListener('input', function() {
        tabContents[currentTab].text = textarea.value;
        tabContents[currentTab].lastUpdated = new Date().toISOString();
        saveNotes();
        renderTabs();
    });
}

// Color swatch logic
function setNoteColor(color, skipSave) {
    const tabContent = document.querySelector('.tab-content');
    COLOR_CLASSES.forEach(c => tabContent.classList.remove('note-' + c));
    tabContent.classList.add('note-' + color);
    // Adjust text color for readability
    if (["yellow", "orange"].includes(color)) {
        textarea.style.color = '#222';
    } else {
        textarea.style.color = '#e0e6f0';
    }
    tabContents[currentTab].color = color;
    if (!skipSave) saveNotes();
    // Highlight selected swatch
    if (noteSwatches) {
        Array.from(noteSwatches.children).forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.color === color);
        });
    }
}

if (noteSwatches) {
    noteSwatches.addEventListener('click', function(e) {
        if (e.target.classList.contains('swatch')) {
            setNoteColor(e.target.dataset.color);
            renderTabs(); // Live update tab color
        }
    });
}

// Initial render
if (textarea) textarea.value = tabContents[currentTab].text || "";
setNoteColor(tabContents[currentTab].color || DEFAULT_COLOR);
renderTabs();
updateInfoBar();

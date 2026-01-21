const STORAGE_KEYS = {
    NOTES: 'nt2_notes_v2',
    CURRENT_TAB: 'nt2_currentTab',
    LEGACY_NOTES: 'nt2_notes'
};
const COLOR_CLASSES = ['blue', 'purple', 'red', 'green', 'orange', 'yellow'];
const LIGHT_TEXT_COLORS = ['yellow', 'orange'];
const MAX_EMPTY_UNTITLED_NOTES = 3;
const TAB_LABEL_MAX_LENGTH = 10;

const noteInfoBar = document.getElementById('noteInfoBar');
const charCountSpan = document.getElementById('charCount');
const lastUpdatedSpan = document.getElementById('lastUpdated');
const tabsContainer = document.getElementById('tabs');
const textarea = document.getElementById('tabTextarea');
const noteCloseBtn = document.getElementById('noteCloseBtn');
const noteSwatches = document.getElementById('noteSwatches');

let DEFAULT_COLOR = null;
let { tabContents, currentTab } = loadNotes();

function getRandomColor() {
    return COLOR_CLASSES[Math.floor(Math.random() * COLOR_CLASSES.length)];
}

function getTabLabel(note, untitledIndex) {
    const firstLine = note.text ? note.text.split(/\r?\n/)[0].trim() : '';
    if (firstLine.length > 0) {
        return firstLine.length > TAB_LABEL_MAX_LENGTH 
            ? firstLine.slice(0, TAB_LABEL_MAX_LENGTH) + '...' 
            : firstLine;
    }
    return untitledIndex === 0 ? 'untitled' : `untitled-${untitledIndex}`;
}

function countEmptyUntitledNotes() {
    return tabContents.filter(note => {
        const isEmpty = !note.text || note.text.trim().length === 0;
        const firstLine = note.text ? note.text.split(/\r?\n/)[0].trim() : '';
        const isUntitled = firstLine.length === 0;
        return isEmpty && isUntitled;
    }).length;
}

function loadNotes() {
    const notesData = localStorage.getItem(STORAGE_KEYS.NOTES);
    const tabIndex = localStorage.getItem(STORAGE_KEYS.CURRENT_TAB);
    
    let parsed = [];
    try {
        parsed = notesData ? JSON.parse(notesData) : null;
    } catch {
        parsed = null;
    }

    if (!Array.isArray(parsed) || !parsed.length || typeof parsed[0] === 'string') {
        parsed = migrateLegacyNotes();
    }

    if (!parsed || !parsed.length) {
        DEFAULT_COLOR = getRandomColor();
        parsed = [{text: '', color: DEFAULT_COLOR, lastUpdated: null}];
    } else {
        if (DEFAULT_COLOR === null) {
            DEFAULT_COLOR = parsed[0].color || COLOR_CLASSES[0];
        }
        normalizeNotes(parsed);
    }

    return {
        tabContents: parsed,
        currentTab: tabIndex !== null && !isNaN(Number(tabIndex)) 
            ? Math.max(0, Math.min(Number(tabIndex), parsed.length - 1)) 
            : 0
    };
}

function migrateLegacyNotes() {
    let oldNotes;
    try {
        oldNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEGACY_NOTES) || '[""]');
    } catch {
        oldNotes = [''];
    }
    
    DEFAULT_COLOR = getRandomColor();
    return oldNotes.map((text, i) => ({
        text,
        color: i === 0 ? DEFAULT_COLOR : getRandomColor(),
        lastUpdated: null
    }));
}

function normalizeNotes(notes) {
    notes.forEach((note, i) => {
        if (!('lastUpdated' in note)) note.lastUpdated = null;
        if (!('color' in note) || !COLOR_CLASSES.includes(note.color)) {
            note.color = i === 0 ? DEFAULT_COLOR : getRandomColor();
        }
    });
}

function saveNotes() {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(tabContents));
    localStorage.setItem(STORAGE_KEYS.CURRENT_TAB, currentTab);
}

function renderTabs() {
    tabsContainer.innerHTML = '';
    let untitledCount = 0;

    tabContents.forEach((note, idx) => {
        const tabBtn = document.createElement('button');
        const colorClass = 'tab-color-' + (note.color || DEFAULT_COLOR);
        const activeClass = idx === currentTab ? ' active' : '';
        tabBtn.className = `tab ${colorClass}${activeClass}`;
        
        const label = getTabLabel(note, untitledCount);
        if (label.startsWith('untitled')) untitledCount++;
        
        tabBtn.textContent = label;
        tabBtn.title = label;
        tabBtn.dataset.idx = idx;
        tabsContainer.appendChild(tabBtn);
    });

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
    const chars = note.text ? note.text.replace(/[\r\n]/g, '').length : 0;
    charCountSpan.textContent = `${chars} ${chars === 1 ? 'character' : 'characters'}`;

    if (note.lastUpdated) {
        const date = new Date(note.lastUpdated);
        lastUpdatedSpan.textContent = `Last updated: ${date.toLocaleString()}`;
    } else {
        lastUpdatedSpan.textContent = 'Last updated: never';
    }
}

function switchTab(idx) {
    tabContents[currentTab].text = textarea.value;
    currentTab = idx;
    textarea.value = tabContents[currentTab].text || '';
    setNoteColor(tabContents[currentTab].color || DEFAULT_COLOR);
    renderTabs();
    updateInfoBar();
}

function setNoteColor(color, skipSave = false) {
    const tabContent = document.querySelector('.tab-content');
    COLOR_CLASSES.forEach(c => tabContent.classList.remove('note-' + c));
    tabContent.classList.add('note-' + color);

    textarea.style.color = LIGHT_TEXT_COLORS.includes(color) ? '#222' : '#e0e6f0';
    tabContents[currentTab].color = color;
    
    if (!skipSave) saveNotes();

    if (noteSwatches) {
        Array.from(noteSwatches.children).forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.color === color);
        });
    }
}

function addNewTab() {
    tabContents[currentTab].text = textarea.value;
    
    if (countEmptyUntitledNotes() >= MAX_EMPTY_UNTITLED_NOTES) return;

    tabContents.push({
        text: '',
        color: getRandomColor(),
        lastUpdated: null
    });
    switchTab(tabContents.length - 1);
}

function deleteCurrentNote() {
    if (tabContents.length === 1) {
        if (confirm('Are you sure you want to delete this note?')) {
            textarea.value = '';
            tabContents[0].text = '';
            tabContents[0].lastUpdated = null;
            tabContents[0].color = getRandomColor();
            setNoteColor(tabContents[0].color);
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
        textarea.value = tabContents[currentTab].text || '';
        setNoteColor(tabContents[currentTab].color || DEFAULT_COLOR);
        renderTabs();
        updateInfoBar();
    }
}

if (tabsContainer) {
    tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab') && !e.target.classList.contains('add-tab')) {
            const idx = Number(e.target.dataset.idx);
            if (!isNaN(idx)) switchTab(idx);
        }
        
        if (e.target.classList.contains('add-tab')) {
            addNewTab();
        }
    });
}

if (noteCloseBtn) {
    noteCloseBtn.addEventListener('click', deleteCurrentNote);
}

if (textarea) {
    textarea.addEventListener('input', () => {
        tabContents[currentTab].text = textarea.value;
        tabContents[currentTab].lastUpdated = new Date().toISOString();
        saveNotes();
        renderTabs();
    });
}

if (noteSwatches) {
    noteSwatches.addEventListener('click', (e) => {
        if (e.target.classList.contains('swatch')) {
            setNoteColor(e.target.dataset.color);
            renderTabs();
        }
    });
}

if (textarea) textarea.value = tabContents[currentTab].text || '';
setNoteColor(tabContents[currentTab].color || DEFAULT_COLOR);
renderTabs();
updateInfoBar();
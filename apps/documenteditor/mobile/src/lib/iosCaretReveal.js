// iOS Safari: the on-screen keyboard covers the editor iframe without resizing it, and a cross-origin iframe cannot
// read the host's visualViewport, so the engine believes the whole canvas is visible and leaves the caret under
// the keyboard. After each edit, scroll so the caret sits above an estimated keyboard top.
const KEYBOARD_SHARE_PORTRAIT = 0.40;   // of the long screen side
const KEYBOARD_SHARE_LANDSCAPE = 0.55;  // of the short screen side
const KEYBOARD_MIN = 300;               // keyboard plus predictive bar on the smallest iPhones
const MARGIN = 24;

function visibleBottom() {
    const vv = window.visualViewport;
    if (vv && vv.height < window.innerHeight - 100) return vv.offsetTop + vv.height;   // viewport already shrinks
    const long = Math.max(screen.width, screen.height);
    const short = Math.min(screen.width, screen.height);
    const landscape = screen.orientation ? screen.orientation.type.startsWith('landscape')
        : window.matchMedia('(orientation: landscape)').matches;
    const keyboard = landscape ? short * KEYBOARD_SHARE_LANDSCAPE : Math.max(long * KEYBOARD_SHARE_PORTRAIT, KEYBOARD_MIN);
    return window.innerHeight - keyboard;
}

function revealCaret(input) {
    const area = input.HtmlArea;
    const target = document.getElementById(input.TargetId);
    const wc = input.Api && input.Api.WordControl;
    const scroll = wc && wc.m_oScrollVerApi;
    if (!area || !target || !scroll) return;
    if (document.activeElement !== area || area.contentEditable !== 'true') return;
    const doc = wc.m_oLogicDocument;
    if (doc && doc.IsSelectionUse && doc.IsSelectionUse()) return;   // no caret while text is selected
    const overflow = target.getBoundingClientRect().bottom - (visibleBottom() - MARGIN);
    if (overflow > 0) scroll.scrollByY(overflow);
}

function watch(input) {
    const area = input.HtmlArea;
    if (!area) return;
    let timer = 0, again = 0;
    // The engine moves the caret asynchronously (its own scroll waits 100 ms); Return and Backspace are handled
    // on keydown and fire no input event. Throttled, with one more check after the last event of a burst.
    const later = (delay) => {
        if (timer) { again = Math.max(again, delay); return; }
        timer = setTimeout(() => {
            timer = 0;
            revealCaret(input);
            if (again) { const next = again; again = 0; later(next); }
        }, delay);
    };
    area.addEventListener('input', () => later(150));
    area.addEventListener('keyup', () => later(150));
    area.addEventListener('focus', () => later(400));
}

// Call once the document is ready: the text input lives in sdk-all.js, which loads after the API object exists.
export function patchIosCaretReveal() {
    const AC = window.AscCommon;
    if (!AC || !AC.CTextInput || !AC.AscBrowser || !AC.AscBrowser.isSafariMobile) return;
    const proto = AC.CTextInput.prototype;
    if (proto.__caretRevealPatched) return;
    proto.__caretRevealPatched = true;
    const init = proto.init;
    proto.init = function () {
        init.apply(this, arguments);
        watch(this);
    };
    if (AC.g_inputContext) watch(AC.g_inputContext);
}

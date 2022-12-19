import stringify from '/app/stringify.js'; // see https://github.com/phoo-lang/phoo-lang.github.io/blob/main/app/stringify.js

function debugger_colorize(text, color) {
    return `<span style="--color: ${color}" class="pointer">${text}</span>`;
}

function debugger_stringify(thing) {
    return stringify(thing, { colorize: debugger_colorize, max_depth: 1 });
}

function stringify_rstack(entry) {
    var { pc, arr } = entry;
    return '<div class="rstack-entry">[' + arr.map((x, i, a) => {
        var xx = debugger_stringify(x);
        if (i != pc) xx = xx.replace(' class="pointer"', '');
        return xx;
    }).join(', ') + ']</div>';
}

class PhooDebugger {
    constructor(elem, thread) {
        this.thread = thread;
        // Monkey patch
        var oldTick = thread.tick;
        thread.tick = async () => {
            await this.breakpointhook();
            await oldTick.call(thread);
        };
        this.attach(elem);
    }
    attach(elem) {
        var w = document.createElement('div');
        w.setAttribute('class', 'debugger');
        w.innerHTML = `<p>Debugger</p>
        <p>
            <button class="dbbrk">Break</button>
            <button class="dbcont">Continue</button>
            <button class="dbinto">Step Into</button>
            <button class="dbover">Step Over</button>
            <button class="dbout">Step Out</button>
        </p>
        <p>Work stack:</p>
        <div class="dbws"></div>
        <p>Return stack:</p>
        <div class="dbrs"></div>`
        w.querySelector('.dbbrk').addEventListener('click', () => {/* TODO */});
        w.querySelector('.dbcont').addEventListener('click', () => {/* TODO */});
        w.querySelector('.dbinto').addEventListener('click', () => {/* TODO */});
        w.querySelector('.dbover').addEventListener('click', () => {/* TODO */});
        w.querySelector('.dbout').addEventListener('click', () => {/* TODO */});
        this.wsw = w.querySelector('.dbws');
        this.rsw = w.querySelector('.dbrs');
        elem.append(w);
    }
    async breakpointhook() {
        // Bail if depth is deep
        // Do some inspecting
        // TODO render it to HTML
    }
    render() {
        // TODO
    }
}

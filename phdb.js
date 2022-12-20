import stringify from '/app/stringify.js'; // see https://github.com/phoo-lang/phoo-lang.github.io/blob/main/app/stringify.js

function debugger_colorize(text, color) {
    return `<span style="--color: ${color}">${text}</span>`;
}

function debugger_stringify(thing, n, p) {
    var s = stringify(thing, { colorize: debugger_colorize, max_depth: n });
    if (p) s = `<span class="pointer">${s}</span>`;
    return s;
}

function stringify_rstack(entry) {
    var { pc, arr } = entry;
    return '<p class="rstack-entry">[' + arr.map((x, i) => debugger_stringify(x, 1, i == pc)).join(', ') + ']</p>';
}

function visible(element, v) {
    if (!v) element.setAttribute('style', 'display: none');
    else element.removeAttribute('style');
}

export class PhooDebugger {
    constructor(elem, thread) {
        this.overDepth = 0;
        this.enabled = false;
        this.resolver = undefined;
        this.thread = thread;
        this.increment = 0;
        // Monkey patch
        var oldTick = thread.tick;
        thread.tick = async () => {
            var oldDepth = thread.returnStack.length;
            await oldTick.call(thread);
            await this.breakpointhook(thread.returnStack.length - oldDepth);
        };
        this.attach(elem);
    }
    enable() {
        this.enabled = true;
        visible(this.el, true);
        visible(this.brkbtn, true);
        visible(this.contbtn, false);
        visible(this.intobtn, false);
        visible(this.overbtn, false);
        visible(this.outbtn, false);
    }
    disable() {
        this.enabled = false;
        visible(this.el, false);
    }
    attach(elem) {
        this.el = elem;
        var w = document.createElement('details');
        w.setAttribute('class', 'debugger');
        w.setAttribute('open', true);
        w.innerHTML = `<summary>Debugger</summary>
        <p>
            <button class="dbbrk">Break</button>
            <button class="dbcont">Continue</button>
            <button class="dbinto">Into</button>
            <button class="dbover">Over</button>
            <button class="dbout">Out</button>
        </p>
        <p>Work stack:</p>
        <p class="dbws rstack-entry"></p>
        <p>Return stack:</p>
        <div class="dbrs"></div>`;
        this.brkbtn = w.querySelector('.dbbrk');
        this.contbtn = w.querySelector('.dbcont')
        this.intobtn = w.querySelector('.dbinto');
        this.overbtn = w.querySelector('.dbover');
        this.outbtn = w.querySelector('.dbout');
        this.brkbtn.addEventListener('click', () => this.break());
        this.contbtn.addEventListener('click', () => this.continue());
        this.intobtn.addEventListener('click', () => this.into());
        this.overbtn.addEventListener('click', () => this.over());
        this.outbtn.addEventListener('click', () => this.out());
        this.wsw = w.querySelector('.dbws');
        this.rsw = w.querySelector('.dbrs');
        elem.append(w);
    }
    break() {
        this.enable()
        this.overDepth = this.thread.returnStack.length;
        visible(this.el, true);
        visible(this.brkbtn, false);
        visible(this.contbtn, true);
        visible(this.intobtn, true);
        visible(this.overbtn, true);
        visible(this.outbtn, true);
    }
    continue() {
        this.overDepth = -1;
        visible(this.brkbtn, true);
        visible(this.contbtn, false);
        visible(this.intobtn, false);
        visible(this.overbtn, false);
        visible(this.outbtn, false);
        if (this.resolver) {
            this.resolver();
            this.resolver = undefined;
        }
    }
    into() { this.step(1); }
    over() { this.step(0); }
    out() { this.step(-1); }
    async breakpointhook(depthChange) {
        if (!this.enabled || this.thread.returnStack.length > this.overDepth) return;
        this.render();
        await new Promise(r => { this.resolver = r; });
        if (this.increment < 0) this.overDepth = this.thread.returnStack.length - 2;
        else if (this.increment > 0) this.overDepth = this.thread.returnStack.length + 1;
        else if (depthChange < 0) this.overDepth = this.thread.returnStack.length - 1;
        this.increment = 0;
    }
    render() {
        this.wsw.innerHTML = '(' + this.thread.workStack.length + ') ' + debugger_stringify(this.thread.workStack, 4, false);
        var s = '<p>(' + (this.thread.returnStack.length + 1) + ') break at ' + (this.overDepth + 1) + '</p>' + stringify_rstack(this.thread.state);
        for (var i = this.thread.returnStack.length - 1; i >= 0; i--) {
            s += stringify_rstack(this.thread.returnStack[i]);
        }
        this.rsw.innerHTML = s;
        for (var e of this.rsw.querySelectorAll('.rstack-entry')) {
            var x = e.querySelector('.pointer')
            if (x) x.scrollIntoView();
        }
    }
    step(stackDelta) {
        this.increment = stackDelta;
        if (this.resolver) {
            this.resolver();
            this.resolver = undefined;
        }
    }
}

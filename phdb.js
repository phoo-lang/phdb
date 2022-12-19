import stringify from '/app/stringify.js'; // see https://github.com/phoo-lang/phoo-lang.github.io/blob/main/app/stringify.js

function debugger_colorize(text, color) {
    return `<span style="--color: ${color}">${text}</span>`;
}

function debugger_colorize_pointed(text, color) {
    return `<span style="--color: ${color}" class="pointer">${text}</span>`;
}

function debugger_stringify(thing, n, p) {
    return stringify(thing, { colorize: (p ? debugger_colorize_pointed : debugger_colorize), max_depth: n });
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
        // Monkey patch
        var oldTick = thread.tick;
        thread.tick = async () => {
            await oldTick.call(thread);
            await this.breakpointhook();
        };
        this.attach(elem);
        this.el = elem;
    }
    enable() {
        this.enabled = true;
        visible(this.el, true);
        visible(this.el.querySelector('.dbbrk'), true);
        for (var c of ['.dbcont', '.dbinto', '.dbover', '.dbout']) visible(this.el.querySelector(c), false);
    }
    disable() {
        this.enabled = false;
        visible(this.el, false);
    }
    attach(elem) {
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
        var brkbtn = w.querySelector('.dbbrk');
        var contbtn = w.querySelector('.dbcont')
        var intobtn = w.querySelector('.dbinto');
        var overbtn = w.querySelector('.dbover');
        var outbtn = w.querySelector('.dbout');
        brkbtn.addEventListener('click', () => {
            this.overDepth = this.thread.returnStack.length;
            visible(brkbtn, false);
            visible(contbtn, true);
            visible(intobtn, true);
            visible(overbtn, true);
            visible(outbtn, true);
        });
        contbtn.addEventListener('click', () => {
            this.overDepth = -1;
            visible(brkbtn, true);
            visible(contbtn, false);
            visible(intobtn, false);
            visible(overbtn, false);
            visible(outbtn, false);
            if (this.resolver) {
                this.resolver({
                    increment: 0,
                    originalDepth: this.thread.returnStack.length,
                });
                this.resolver = undefined;
            }
        });
        intobtn.addEventListener('click', () => {
            this.step(1);
        });
        overbtn.addEventListener('click', () => {
            this.step(0);
        });
        outbtn.addEventListener('click', () => {
            this.step(-1);
        });
        this.wsw = w.querySelector('.dbws');
        this.rsw = w.querySelector('.dbrs');
        elem.append(w);
    }
    async breakpointhook() {
        if (!this.enabled || this.thread.returnStack.length > this.overDepth) return;
        this.render();
        this.el.querySelector('.dbbrk').click();
        var cmd = await new Promise(r => { this.resolver = r; });
        alert(cmd.originalDepth + ', += ' + cmd.increment + ', l= ' + this.thread.returnStack.length + ', over= ' + this.overDepth);
        if (this.thread.returnStack.length != cmd.originalDepth) {
            if (cmd.increment > 0 || this.overDepth > -cmd.increment) this.overDepth += cmd.increment;
        }
    }
    render() {
        this.wsw.innerHTML = '(' + this.thread.workStack.length + ') ' + debugger_stringify(this.thread.workStack, 3, false);
        var s = '<p>(' + (this.thread.returnStack.length + 1) + ')</p>' + stringify_rstack(this.thread.state);
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
        if (this.resolver) {
            this.resolver({
                increment: stackDelta,
                originalDepth: this.thread.returnStack.length,
            });
            this.resolver = undefined;
        }
    }
}

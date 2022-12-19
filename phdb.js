import stringify from '/app/stringify.js'; // see https://github.com/phoo-lang/phoo-lang.github.io/blob/main/app/stringify.js

function debugger_colorize(text, color) {
    return `<span style="--color: ${color}" class="pointer">${text}</span>`;
}

function debugger_stringify(thing) {
    return stringify(thing, { colorize: debugger_colorize, max_depth: 1 });
}

function stringify_rstack(entry) {
    var { pc, arr } = entry;
    return '<p class="rstack-entry">[' + arr.map((x, i, a) => {
        var xx = debugger_stringify(x);
        if (i != pc) xx = xx.replace(' class="pointer"', '');
        return xx;
    }).join(', ') + ']</p>';
}

function visible(element, v) {
    if (v) element.setAttribute('style', 'display: none');
    else element.removeAttribute('style');
}

class PhooDebugger {
    constructor(elem, thread) {
        this.overDepth = 0;
        this.enabled = false;
        this.resolver = undefined;
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
        await new Promise(r => { this.resolver = r; });
    }
    render() {
        this.wsw.innerHTML = '(' + this.thread.workStack.length + ') ' + debugger_stringify(this.thread.workStack).replaceAll(' class="pointer"', '');
        var s = '<p>(' + this.thread.returnStack.length + ')</p>';
        for (var i = this.thread.returnStack.length - 1; i >= 0; i--) {
            s += stringify_rstack(this.thread.returnStack[i]);
        }
        this.rsw.innerHTML = s;
    }
    step(stackDelta) {
        if (stackDelta > 0 || this.overDepth > -stackDelta) this.overDepth += stackDelta;
        if (this.resolver) {
            this.resolver();
            this.resolver = undefined;
        }
    }
}

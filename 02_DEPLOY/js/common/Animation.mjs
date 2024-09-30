import { isPOJO, isArr } from "./util.mjs"

/*

ANIMATION MODULE NOTES:
All times and durations are in SECONDS.
Times are number of SECONDS since Performance.timeOrigin.


SAMPLE USAGE OF ELEMENTS OF THIS SUITE:

//  Run a function every frame for set duration starting after delay.

    import { Animation } from "Animation.mjs"
    Animation.do({
        duration: 1,
        delay: 2,
        onTick: p=>console.log("0-1:", p),
    });

//  Above is a shortcut for:

    import { Timeline, Animation } from "Animation.mjs"
    const line = new Timeline({duration:3});
    const anim = new Animation({
        duration: 1,
        onTick: p=>console.log("0-1:", p),
    });
    const t = now();
    line.add(anim, t + 2);
    line.start(t);
*/

/*
Animation
    An animation block with a defined duration, an optional easing function
    and optional onBegin, onTick, and onComplete callbacks.
    See Animation.do for convenient "run one-of now" shortcut.
*/
export class Animation {
    get duration() { return this.#duration; }
    ease;
    onBegin;
    onTick;
    onComplete;
    #duration;

    // make and run stand-alone animation with its own timeline
    static do(config) {
        const animation = new Animation(config);
        const delay = config?.delay || 0;
        const duration = (delay + config?.duration) || 0;
        const time = now();
        const timeline = new Timeline({duration})
            .add(animation, time+delay)
            .start(time);
        return {animation,timeline};
    }

    constructor(config) {
        config = {
            duration:   0,                      //
            ease:       t=>t,                   //
            onBegin:    ()=>{},                 //
            onTick:     (easedP,linearP)=>{},   //
            onComplete: ()=>{},                 //

            ...config,
        }
        this.#duration = config.duration;
        this.ease = config.ease;
        this.onBegin = config.onBegin;
        this.onTick = config.onTick;
        this.onComplete = config.onComplete;
    }
}

/*
Timeline
    A timeline with a duration and a begin time. A timeline holds its own
    requestAnimationFrame loop.
    Contains blocks, which are added with begin/end times.
    Blocks are all Animations for now, but they could be anything.
    Block objects have the following optional properties:
        duration        // 0 if not set
        ease            // t=>t (linear) if not set
        onBegin         // called on first frame after begin time was passed
        onTick          // (easedPercent,linearPercent)=>{ ... }
                        // called on every frame after onBegin,
                        // and once before onComplete with p=1.
        onComplete      // called on first frame after end time was passed
*/
export class Timeline {
    constructor(config) {
        config = {
            duration: 1,
            blocks: [],
            ...config
        };

        this.#blocks = config.blocks;
        this.#duration = config.duration;
    }

    // assign a timed-object to a specific block of time
    add(obj, time=0) {
        time ||= now();
        const duration = parseFloat(obj?.duration) || 0;
        this.#blocks.push({
            begin:  time,
            end:    time + duration,
            obj:    obj,
        });
        return this;
    }

    // start
    start(time=0) {
        if (this.#begin !== null) {
            return;
        }
        this.#begin = this.#pt = time || now();
        this.#keepRunning = true;
        requestAnimationFrame(this.#tick.bind(this));
        return this;
    }

    // cancel
    cancel() {
        this.#keepRunning = false;
        return this;
    }

    // array of blocks, see add()
    // each block is: {start, end, obj}
    #blocks;

    // total duration of the timeline
    #duration;

    // start time. null if not running.
    #begin = null;

    // time of current tick
    #t  = 0;
    // time of last tick
    #pt = 0;

    // signal to cancel running
    #keepRunning = false;

    #tick(dt) {
        this.#t = dt/1000;
        if (!this.#keepRunning) {
            console.log("timeline manually stopped", this.#begin, this.#duration, this.#t);
            this.#begin = null;
            return;
        }

        // update blocks
        let i = 0;
        const e = this.#blocks.length;
        while (i < e) {
            const block = this.#blocks[i];

            const isFirstTickForBegin = this.#isFirstTickFor(block.begin);
            if (isFirstTickForBegin) {
                block.obj?.onBegin?.();
            }
            if (this.#isTickWithin(block.begin, block.end) ||
                isFirstTickForBegin) {
                const linearP = invLerp(this.#t, block.begin, block.end);
                const easedP = (block.obj?.ease) ? block.obj.ease(linearP) : linearP;
                block.obj?.onTick?.(easedP, linearP);
            }
            if (this.#isFirstTickFor(block.end)) {
                const linearP = 1;
                const easedP = (block.obj?.ease) ? block.obj.ease(linearP) : linearP;
                block.obj?.onTick?.(easedP, linearP);
                block.obj?.onComplete?.();
            }

            ++i;
        }

        // just keep ticking
        if (this.#t < this.#begin + this.#duration) {
            requestAnimationFrame(this.#tick.bind(this));
        }
        // stop ticking
        else {
            // console.log("timeline stopped", this.#begin, this.#duration, this.#t);
            this.#begin = null;
        }
        // tick is now previous tick
        this.#pt = this.#t;
    }

    #isTickWithin(b, e) {
        return (b <= this.#t && this.#t < e);
    }
    #isFirstTickFor(t) {
        return (this.#pt < t && t <= this.#t);
    }
}

export function now() { return performance.now() / 1000; }

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(x, lower=0, upper=1) { return (x < lower) ? lower : (x > upper) ? upper : x; }
export function invLerpUnclamped(x, lower, upper) { return (x - lower) / (upper - lower); }
export function invLerp(x, lower, upper) { return clamp(invLerpUnclamped(x, lower, upper)); }

export function lerpObj(a, b, t) {
    let ret = {};
    for (const key in a) {
        ret[key] = lerpAny(a[key], b[key], t);
    }
    return ret;
}

export function lerpArr(a, b, t) {
    let i = a.length;
    out = new Array(i);
    while (i--) {
        out[i] = lerpAny(a[i], b[i], t);
    }
    return out;
}

export function lerpAny(a, b, t) {
    if (isPOJO(a))  return lerpObj(a, b, t);
    if (isArr(a))   return lerpArr(a, b, t);
    if (!isNaN(a))  return lerp(a, b, t);
    throw new Error("Cannot lerp");
}

export const ease        = cubicbezier(0.25, 0.1, 0.25, 1);
export const easein      = cubicbezier(0.42, 0, 1, 1);
export const easeout     = cubicbezier(0, 0, 0.58, 1);
export const easeinout   = cubicbezier(0.42, 0, 0.58, 1);

// https://stackoverflow.com/a/11697909
// https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/UnitBezier.h
export function cubicbezier(p1x, p1y, p2x, p2y) {
    // pre-calculate the polynomial coefficients
    // First and last control points are implied to be (0,0) and (1.0, 1.0)
    const cx = 3.0 * p1x;
    const bx = 3.0 * (p2x - p1x) - cx;
    const ax = 1.0 - cx -bx;

    const cy = 3.0 * p1y;
    const by = 3.0 * (p2y - p1y) - cy;
    const ay = 1.0 - cy - by;

    const epsilon = 1e-6; // Precision

    const sampleCurveX = t=>(((ax * t + bx) * t + cx) * t);
    const sampleCurveY = t=>(((ay * t + by) * t + cy) * t);
    const sampleCurveDerivativeX = t=>((3.0 * ax * t + 2.0 * bx) * t + cx);

    const solveCurveX = function (x) {
        let t0;
        let t1;
        let t2;
        let x2;
        let d2;
        let i;

        // First try a few iterations of Newton's method -- normally very fast.
        for (t2 = x, i = 0; i < 8; i++) {
            x2 = sampleCurveX(t2) - x;
            if (Math.abs (x2) < epsilon)
                return t2;
            d2 = sampleCurveDerivativeX(t2);
            if (Math.abs(d2) < epsilon)
                break;
            t2 = t2 - x2 / d2;
        }

        // No solution found - use bi-section
        t0 = 0.0;
        t1 = 1.0;
        t2 = x;

        if (t2 < t0) return t0;
        if (t2 > t1) return t1;

        while (t0 < t1) {
            x2 = sampleCurveX(t2);
            if (Math.abs(x2 - x) < epsilon)
                return t2;
            if (x > x2) t0 = t2;
            else t1 = t2;

            t2 = (t1 - t0) * .5 + t0;
        }

        // Give up
        return t2;
    }

    // Find new T as a function of Y along curve X
    return t=>sampleCurveY(solveCurveX(t));
}

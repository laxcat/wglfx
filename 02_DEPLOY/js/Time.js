export default class Time {
    global = 0;         // global time, in seconds
    dt = 0;             // delta time from last frame, in seconds
    frame = 0;          // frame number, integer, pauses
    now = 0;            // run/sim time, in seconds, pauses

    #isRunning = false; // is sim running or paused, affects frame and now
    #pausedTotal = 0;   // a running total of time the sim has NOT been
                        //   been running.
                        //   global - #pausedTotal = now
    #lastPaused = 0;    // time of most recent pause, used to calculate pausedTotal

    set isRunning(val) {
        this.#isRunning = val;

        if (this.#isRunning) {
            this.#pausedTotal += this.global - this.#lastPaused;
        }
        else {
            this.#lastPaused = this.global;
        }
    }

    get isRunning() {
        return this.#isRunning;
    }

    update(eventTime) {
        const l = eventTime / 1000.0;
        this.dt = l - this.global;
        this.global = l;

        if (this.#isRunning) {
            this.frame += 1;
            this.now = this.global - this.#pausedTotal;
        }
    }

    printStatus() {
        console.log("TIME STATUS");
        console.log("    isRunning", this.#isRunning);
        console.log("    global", this.global);
        console.log("    dt", this.dt);
        console.log("    frame", this.frame);
        console.log("    now", this.now);
        console.log("    #pausedTotal", this.#pausedTotal);
        console.log("    #lastPaused", this.#lastPaused);
    }
}

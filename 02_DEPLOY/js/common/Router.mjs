import { is, isFn, isStr } from "./util.mjs"
/*
route() is simple function that handles pushState-style url routing.

Example usage:

    // set
    const router = new Router();
    // calls callback when setting
    router.callback = (url,event)=>{
        switch(url) {
            ...
        }
    };
    // callback called
    ...
    foo.addEventListener("click", e=>router.go("/foo", e));

    // set callback on init, doesn't call (no side effects)
    const router = new Router((url,event)=>{
        switch(url) {
            ...
        }
    });

*/
export default class Router {

    constructor(callback) {
        if (isFn(callback)) {
            this.setCallback(fnOrTarget, false);
        }
    }

    setCallback(fn, runNow=true) {
        this.destroy();
        this.#callback = data=>fn(window.location.href, data);
        window.addEventListener("popstate", event=>this.#callback({event}));
        if (runNow) {
            this.#callback();
        }
    }

    #callback = null;

    go(url, state={}) {
        if (!isStr(url) && !is(url, URL)) {
            return;
        }
        history.pushState(state, "", url);
        this.#callback?.(state);
    }

    destroy() {
        if (this.#callback) {
            window.removeEventListener("popstate", this.#callback);
        }
        this.#callback = null;
    }
};

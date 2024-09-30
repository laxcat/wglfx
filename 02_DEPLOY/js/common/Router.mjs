import { is, isFn, isStr } from "./util.mjs"
/*
route() is simple function that handles pushState-style url routing.

Example usage:

    // set
    const router = new Router();
    router.setCallback((url,event)=>{
        switch(url) {
            ...
        }
    });
    ...
    foo.addEventListener("click", e=>router.go("/foo", e));

    // set callback on init
    const router = new Router((url,event)=>{
        switch(url) {
            ...
        }
    });

*/
export default class Router {

    constructor(callback) {
        if (isFn(callback)) {
            this.setCallback(callback);
        }
    }

    destroy() {
        if (this.#callback) {
            window.removeEventListener("popstate", this.#callbackProxy);
        }
        this.#callback = null;
    }

    setCallback(fn) {
        this.destroy();
        this.#callback = fn;
        window.addEventListener("popstate", this.#callbackProxy);
    }

    #callback = null;
    #callbackProxy = event=>this.#callback({event});

    go(url, state={}) {
        if (!isStr(url) && !is(url, URL)) {
            return;
        }
        history.pushState(state, "", url);
        this.#callback?.(url, state);
    }

    call() {
        this.#callback?.(window.location, null);
    }
};

import Accessor from "./js/common/Accessor.mjs"

class Thing {
    static define = {
    };
};


const thing = Accessor.type(["flt"]);
thing.push(.1, 1.2, 3.9);
console.log(thing.val);
console.log(thing);

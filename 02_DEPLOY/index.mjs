import Accessor from "./js/common/Accessor.mjs"

class Thing {
    static define = {
    };
};

const thing = Accessor.val([45], ["int"]);
console.log(thing.val);
console.log(thing);

import Accessor from "./js/common/Accessor.mjs"

class Thing {
    static define = {
    };
};


const thing = Accessor.type(["obj"]);
thing.push({fun:47.5});
console.log(thing.val);
console.log(thing);

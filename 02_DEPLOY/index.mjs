import Accessor from "./js/common/Accessor.mjs"

class Thing {
    static define = {
    };
};


const thing = Accessor.type("arr");
thing.push();
// thing.set({
//     dingus: 45,
//     dangus: 32,
// });
console.log(thing.val);
console.log(thing);

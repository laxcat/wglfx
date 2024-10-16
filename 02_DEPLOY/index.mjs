import Accessor from "./js/common/Accessor.mjs"

class Thing {
    static define = {
    };
};

const wut = {
    foo: [1, 2, 4],
    bar: "thing",
    ram: {
        dang: [1.2, 3.5],
        thing: new Thing(),
    },
};

const thing = Accessor.val([{a:45}]);
console.log(thing.val);
console.log(thing);

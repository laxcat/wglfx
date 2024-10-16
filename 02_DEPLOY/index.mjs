import Accessor from "./js/common/Accessor.mjs"

class Thing {
    dirty = true;
    boy = true;
    static define = {
        reorderable: true,
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

const thing = Accessor.tree(Thing);
console.log(thing.val);
console.log(thing);

// const i = 45;
// const f = 37.2;
// const s = "thang";
// const o = {wang:"dang"};
// const a = [3, 4, 5];
// const t = new Thing();

// console.log(Accessor.guessType(i));
// console.log(Accessor.guessType(f));
// console.log(Accessor.guessType(s));
// console.log(Accessor.guessType(o));
// console.log(Accessor.guessType(a));
// console.log(Accessor.guessType(t));

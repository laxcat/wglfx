import Accessor from "./js/common/Accessor.mjs"

class Foo {
    wingus = 1;
    wangus = 2;
}

class Bar {
    dingus = 3;
    dangus = 4;
}

class Thing {
    dirty;
    boy;
    static define = {
        keys: {
            dirty: { type:Foo },
            boy:   { type:[Bar], length:5 }
        }
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

// const thing = new Accessor({type:[Foo], length:5, init:true});
// console.log(thing.val);
// console.log(thing);

const thing = Accessor.tree(Thing);
console.log(thing.val);
console.log(thing);

// const thing = new Accessor({
//     type:"obj",
//     keys: {
//         bing: {type:"int"},
//         bong: {type:"bln"},
//     },
//     init:true,
// });
// console.log(thing.val);
// console.log(thing);

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

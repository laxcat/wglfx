import { isPOJO, isArr, isFn, isStr, is } from "./util.mjs"
// also uses Array.prototype.findByKeyOrDefault

/*
    Serializable

    Convenient base class for easy serializable objects.

    The main purpose is to be able to serialize object into plain data objects,
    then reverse the process back into JavaScript class instances with as little
    boilerplate code as possible. But this also creates a system that allows for
    default initialization, initialization templates, etc, so that functionality
    is provided as well.

    Consider the following example:

    ```
    class Bar { ... }
    class Item { ... }

    class Foo extends Serializable {
        static initProps = {    // Init members, or serializable members
            name: undefined,    // Values define how properties are initialized.
            bar: Bar,           // (see initProps below)
            items: [Item]
            data: {Item, Map}
        }
        view;                   // standard members

        static templates = [    // array of initializer objects
            {
                key: "template1",
                default: true,
                name: "Default",
                bar: "bar1",
                items: [10, 20],
                data: { fooItem:30, barItem:40 },
            },
            {key:"template2", name:"Another"}, // all keys in initProps optional
        ];
    }

    const foo = new Foo();
    // foo is now:
    // Foo {
    //     name: "Default",
    //     bar: Bar{...},                  // new Bar("bar1")
    //     items: [Item{...}, Item{...}],  // new Item(10), new Item(20), etc
    //     data: Map {                     // uses Map built-in class
    //         fooItem: Item{...},         // new Item(30)
    //         barItem: Item{...},         // new Item(40)
    //     }
    // }

    const foo2 = new Foo("template1"); // same as above
    const foo3 = new Foo("template2"); // uses template where key==="template2"
    const foo4 = new Foo({name:"custom"}); // custom initalizer
    ```

    Explaination:

    To initalize a class derived from serializable, we need 2 things:
        • static initProps defined on derived class
        • some sort of initializer object (not necessarily user provided)

    Using the example code above, the initialization process goes like this:
    1) Since no constructor was defined on Foo, we use Serializable's
    constructor, which runs some checks, then calls deserialize.
    2) deserialize takes the initObj passed to constructor and does the
    following. (Templates are found using the findByKeyOrDefault
    Array.prototype extension)
        2a) If falsy (as in new Foo()), find the default template and use it as
        the initObj.
        2b) If a string, find the template where key maches the string, and use
        that template as the initObj.
        2c) If no templates were found, initObj will just be an empty object,
        and when the Foo's properties will be initalized with undefined, which
        is often exactly the behavior desired.
    3) deserialize now goes through each property in initProps and initalizes
    that property on "this" (the instance of Foo). The way the property is
    initlaized depends on the initProps definition. (See initProps below.) This
    deserialization process can chain into child classes whether or not if they
    happen to be Serializable themselves. The process just uses the constructor.

    Serializable-derived classes also can use the serialize function, which
    attempts to automate the reverse process. See below for more information.
*/
export default class Serializable {

    /*
    initProps

    Special static object, REQUIRED to be set on all classes derived from
    Serializable. Uses a special syntax to describe HOW the derived class's
    properties get set.

    Each initProps key is the property that will get set to the derived
    instance. The value of that key IS NOT AN ACTUAL VALUE, but rather a type
    layout description. There are 4 patterns supported, described below.

    Given initObj, which was provided by the user or derived from a template,
    the key of a derived object (this) is intialized as follows. If initProps
    key's value is:
        • undefined
            then this.key = initObj.key

        • a Class (anything constructable with new)
            then this.key = new Class(initObj.key)

        • [Class], array of classes
            then this.key[0] = new Class(initObj.key[0]), etc

        • {Class}, object or Map of classes
            then this.key.foo = new Class(initObj.key.foo), for each sub-key of
            the initObj.key object.

    The {Class} option will initialize a POJO, unless "Map" or "map" property is
    not falsy, in which case the built-in Map class is used instead. For
    example: {Class, Map}, or {Class, map: true}, etc. The former utilizes ES6's
    "Shorthand Property Assignment" and the built-in Map object itself for a
    conventient syntax.
    */
    static initProps = undefined;

    /*
    Static array that defines a set of initObjs available to this class. See
    init process description above. Optional.
    */
    static templates = undefined;

    /*
    Asserts the derived class was constructed with new.
    Asserts Derived.initProps has been set.
    Automatically deserialize initObj.
    */
    constructor(initObj) {
        // must be constructed with new
        if (!new.target) {
            throw new TypeError(`calling ${this.constructor.name} constructor without new is invalid`);
        }
        // assert the derived class meets the requirements
        if (this.constructor.initProps === undefined) {
            throw new SyntaxError(`${this.constructor.name} extends Serializable and needs to define static initProps.`);
        }
        this.deserialize(initObj);
    }

    /*
    Assign the derived classes properties according to the initProps.
    See initProps and Serializable documentation above.
    */
    deserialize(initObj) {
        if (!initObj || isStr(initObj)) {
            initObj = {...this.getTemplate(initObj)};
        }

        const props = this.constructor.initProps;

        for (const key in props) {
            // the prop in initProps.
            const prop = props[key];

            // the value to assign, as found in the template or initizing object
            const value = initObj[key];

            // falsy
            if (!prop) {
                this[key] = value;
            }

            // [SomeClass]
            else if (isArr(prop)) {
                const Type = prop[0];
                this[key] = value.map((child, i) => {
                    if (isPOJO(child) && child.index == null) child.index = i;
                    return new Type(child);
                });
            }

            // {SomeClass} or {SomeClass, Map:true}
            else if (isPOJO(prop)) {
                let useMap = false;
                let Type = null;
                for (const [k, v] of Object.entries(prop)) {
                    if (k.toLowerCase() === "map") {
                        useMap = true;
                    }
                    else {
                        Type = v;
                    }
                }

                // {Map, Foo} or {map:true, Foo} will make a new Map() of Foo
                if (Type) {
                    const entries = Object.entries(value).map(([k, v]) => {
                        // objects maped by their parents always get a key property
                        if (!v.key) {
                            v.key = k;
                        }
                        return [k, new Type(v)];
                    });
                    this[key] = (useMap) ?
                        new Map(entries) :
                        {...entries};
                }
            }

            // SomeClass
            else if (isFn(prop)) {
                this[key] = new (prop)(value);
            }
        }
    }

    /*
    serialize

    Automatically serializes the derived instance according to the initProps.
    For each key in initProps, serialize will take the coresponding key on the
    instance and convert it to a POJO. If the this.key is:
        • an Array, loop through and serialize each.
        • an Object, TODO: mirror Map functionality
        • a Map, loop through keys, serialize each, convert to POJO
        • an object with a serialize property, call serialize and assign what
          returns.
        • anything else, assign directly

    TODO: right now, does not automatically serialize POJO's sub keys, just
    assigns the POJO directly. Needs to be changed to loop through POJO keys
    like Map instances already do below.

    TODO: needs cleanup. better definition of serialize chaining.
    */
    serialize() {
        // initProps informs us which keys to serialize
        const serialObj = {...this.constructor.initProps};
        // for each key in initProps, assign this[key] to serialObj[key],
        // with some considerations for some common types and patterns
        for (const key in serialObj) {
            // convert array to array of serialized items
            if (isArr(this[key])) {
                serialObj[key] = this[key].map(
                    item => (isFn(item.serialize) ? item.serialize() : item)
                );
            }
            // convert map to object of serialized items
            else if (is(this[key], Map)) {
                serialObj[key] = {};
                this[key].forEach((item, mapKey) => {
                    // console.log("map", item, mapKey, serialObj[key]);
                    serialObj[key][mapKey] = item.serialize();
                });
            }
            // serialize item
            else if (isFn(this[key]?.serialize)) {
                serialObj[key] = this[key].serialize();
            }
            else {
                serialObj[key] = this[key];
            }
        }
        return serialObj;
    }

    // TODO: these need to be deep copied probably
    get defaultTemplate() { return this.constructor.templates?.findByKeyOrDefault(); }
    getTemplate(key) { return this.constructor.templates?.findByKeyOrDefault(key); }

    // utility that returns passed if is an instance of this class, null otherwise
    static orNull(obj) {
        return (is(obj, this.constructor)) ? obj : null;
    }
}

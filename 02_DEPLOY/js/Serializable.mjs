import { isPOJO, isArray, isFn, } from "./util.mjs"

/*
    TODO: fix all this



    Convenient base class for derived serializable object.
    Handles multiple code paths (templates, etc) for initializing.
    Can handled automatic serialization using serialProps, which defines
    what properties to serialize and how.


    Use this to create a template from a templateKey. If templateKey is falsy
    template where default property is found and not falsy will be selected.
    Override this static method if the derived class needs more consideration
    when selecting and preparing a serialObj from a template.


    Dervied class can define static templates array.
    When initializing, if no serialObj is passed in, templates are how a
    derived class and its children poplate default values.
    Each template item is essentially a serialProps object with some differences:
        • templates will have a key property (string). if object is initialized
          with a string, it is assumed to be a template key and will use the
          coresponding template.
        • templates might have a default property. if object is initalized
          with an undefined serialObj, the default template will be selected.
    Once a template has been selected, it will become the serialObj, and the
    Serializable derived class will populate the same was as if it was passed in.





    deserialize's job is to help reconstruct the derived class. This has several
    code paths:
        • serialObj is falsy, which will create project from default template
        • serialObj is a string, which will create project from template key
        • serialObj is an object (probably deserialized from load, see serialize
          for structure)
    A Serializable derived class should call this super.deserialize(serialObj)
    to handle perparing serialObj for all three of the above code paths.
    The returned serialObj can then be used to populate values without much care
    of where it came from. This method will usually be overriden to handle the
    population of values, but a derived class can break pattern if necessary.


*/

export default class Serializable {

    static serialProps = undefined;

    static templates = undefined;

    constructor(serialObj) {
        // must be constructed with new
        if (!new.target) {
            throw new TypeError(`calling ${this.constructor.name} constructor without new is invalid`);
        }
        // assert the derived class meets the requirements
        if (this.constructor.serialProps === undefined) {
            throw `${this.constructor.name} extends Serializable and needs to define static serialProps.`;
        }
        this.deserialize(serialObj);
    }

    deserialize(serialObj) {
        if (!serialObj || typeof serialObj === "string") {
            serialObj = {...this.getTemplate(serialObj)};
        }

        const props = this.constructor.serialProps;

        for (const key in props) {
            // the prop in serialProps.
            const prop = props[key];

            // the value to assign, as found in the template or initizing object
            const value = serialObj[key];

            // falsy
            if (!prop) {
                this[key] = value;
            }

            // [SomeClass]
            else if (isArray(prop)) {
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
            else if (typeof prop === "function") {
                this[key] = new (props[key])(value);
            }
        }
    }

    serialize() {
        // serial props informs us where to pull key values from
        const serialObj = {...this.constructor.serialProps};
        // for each key in serialProps, assign this[key] to serialObj[key],
        // with some considerations for some common types and patterns
        for (const key in serialObj) {
            // convert array to array of serialized items
            if (this[key] instanceof Array) {
                serialObj[key] = this[key].map(
                    item => (isFn(item.serialize) ? item.serialize() : item)
                );
            }
            // convert map to object of serialized items
            else if (this[key] instanceof Map) {
                serialObj[key] = {};
                this[key].forEach((item, mapKey) => {
                    // console.log("map", item, mapKey, serialObj[key]);
                    serialObj[key][mapKey] = item.serialize();
                });
            }
            // serialize item
            else if (this[key] instanceof Serializable) {
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
}

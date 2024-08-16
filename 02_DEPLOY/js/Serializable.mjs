/*
    Convenient base class for derived serializable object.
    Handles multiple code paths (templates, etc) for initializing.
    Can handled automatic serialization using serialBones, which defines
    what properties to serialize and how.
*/
export default class Serializable {

    /*
    Derived class should define object that contains keys for all items to be
    serialized.
    */
    static serialBones = undefined;

    /*
    Dervied class can define static templates array.
    When initializing, if no serialObj is passed in, templates are how a
    derived class and its children poplate default values.
    Each template item is essentially a serialBones object with some differences:
        • templates will have a key property (string). if object is initialized
          with a string, it is assumed to be a template key and will use the
          coresponding template.
        • templates might have a default property. if object is initalized
          with an undefined serialObj, the default template will be selected.
    Once a template has been selected, it will become the serialObj, and the
    Serializable derived class will populate the same was as if it was passed in.
    */
    static templates = undefined;

    /*
    Use this to create a template from a templateKey. If templateKey is falsy
    template where default property is found and not falsy will be selected.
    Override this static method if the derived class needs more consideration
    when selecting and preparing a serialObj from a template.
    */
    static makeSerialObjFromTemplate(templateKey) {
        return {
            ...this.serialBones,
            ...this.templates?.findByKeyOrDefault(templateKey),
        };
    }

    constructor() {
        // assert the derived class meets the requirements
        if (this.constructor.serialBones === undefined) {
            throw `${this.constructor.name} extends Serializable and needs to define static serialBones.`;
        }
    }

    /*
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

    TODO: this could also be more systemized
    */
    deserialize(serialObj) {
        // no serialObj sent. load default template
        if (!serialObj) {
            serialObj = this.constructor.makeSerialObjFromTemplate();
        }
        // template key (string) sent. load specific template
        else if (typeof serialObj === "string") {
            serialObj = this.constructor.makeSerialObjFromTemplate(serialObj);
        }
        return serialObj;
    }

    /*
    Can usually handle serization automatically, and might not need to be
    overriden.
    Uses serialBones to know which properties to pull and which to expect to
    be serializable themselves.

    TODO: serialBones could also have class objects and instantiate them
    automatically?
    */
    serialize() {
        // serial bones informs us where to pull key values from
        const serialObj = {...this.constructor.serialBones};
        // for each key in serialBones, assign this[key] to serialObj[key],
        // with some considerations for some common types and patterns
        for (const key in serialObj) {
            // convert array to array of serialized items
            if (this[key] instanceof Array) {
                serialObj[key] = this[key].map(item => item.serialize());
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

    get defaultTemplate() { this.constructor.templates?.find(t=>!!t.default) }
}

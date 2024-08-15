/*
    Convenient base class for derived serializable object.
    Handles multiple code paths (templates, etc) for helping deserialization.
    Can handled automatic serialization using serialBones, which defines
    what properties to serialize and how.
*/
export default class Serializable {

    constructor() {
        // assert the derived class meets the requirements
        if (this.constructor.serialBones === undefined) {
            throw `${this.constructor.name} extends Serializable and needs to define static serialBones.`;
        }
    }

    /*
    Derived class should define object that contains keys for all items to be
    serialized.
    null items will not be in templates.
    undefined items are expected to be Serializeable. when making template they
    will get populated by default key if value not specified in template.
    */
    static serialBones = undefined;

    /*
    Dervied class can define static templates array.
    When deserializing, if no serialObj is passed in, templates are how a
    derived class and its children poplate default values.
    Each template item is essentially a serialBones object with some exeptions:
        • templates will have a key property (string). if serialObj is a string,
          assumes a template key and will use the coresponding template
        • templates might have a default:true property. if serialObj is
          undefined in deserialize, the default template will be used.
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
            ...this.templates.findByKeyOrDefault(templateKey),
        };
    }

    /*
    deserialize's job is to help reconstruct the derived class. This has several
    code paths:
        • serialObj is falsy, which will create project from default template
        • serialObj is a string, which will create project from template key
        • serialObj is an object (probably deserialized from load, see serialize
          for structure)
    A Serializable derived class should call this super.deserialize(serialObj)
    to handle all three of the above code paths. The returned serialObj
    can then be used to populate values without much care of where it came from.
    This method will usually be overriden to handle the population of values,
    but a derived class can break pattern if necessary.
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
    Can handle serization automatically, and might not need to be overriden.
    Uses serialBones to know which properties to pull and which to expect to
    be serializable themselves.
    */
    serialize() {
        // serial bones informs us where to pull key values from
        const serialObj = {...this.constructor.serialBones};
        for (const key in serialObj) {
            // if it was null in bones, expect a regular property
            if (serialObj[key] === null) {
                serialObj[key] = this[key];
            }
            // if it was undefined in bones
            else if (serialObj[key] === undefined) {
                serialObj[key] = this[key].toObject();
            }
        }
        return serialObj;
    }
}

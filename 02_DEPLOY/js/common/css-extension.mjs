/*
    CSS-class related
*/
import { extdProto } from "./common-extension.mjs"

extdProto(CSSStyleDeclaration, "deleteRule", function() {
    this.parentRule?.delete();
});

extdProto(CSSStyleRule, "delete", function() {
    const index = this.parentStyleSheet?.findRule(this);
    if (index !== -1) {
        this.parentStyleSheet?.deleteRule(index);
    }
});

extdProto(CSSStyleSheet, "findRule", function(rule) {
    return this.cssRules.findIndex(rule);
});

extdProto(CSSRuleList, "findIndex", function(rule) {
    let i = this.length;
    while (i--) {
        if (this[i] === rule) return i;
    }
    return -1;
});

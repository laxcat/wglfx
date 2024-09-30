/*
    CSS built-ins and related extensions
*/
import { extdProto, extd } from "./common-extension.mjs"

extd(CSSStyleDeclaration.prototype, "parentStyleSheet", {get: function() {
    return this.parentRule?.parentStyleSheet;
}});

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

extdProto(Document, "adoptNewCSS", function(cssText) {
    const ss = new CSSStyleSheet();
    this.adoptedStyleSheets = [...this.adoptedStyleSheets, ss];
    ss.replaceSync(cssText);
    return ss;
});

extdProto(Document, "unadoptCSS", function(cssStyleSheet) {
    let newArr = [];
    let i = 0;
    const e = this.adoptedStyleSheets.length;
    while (i < e) {
        if (this.adoptedStyleSheets[i] !== cssStyleSheet) {
            newArr.push(this.adoptedStyleSheets[i]);
        }
        ++i;
    }
    this.adoptedStyleSheets = newArr;
});

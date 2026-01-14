"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertDefined = assertDefined;
exports.assertMatches = assertMatches;
exports.sleep = sleep;
const chai_1 = require("chai");
/**
 * Assert that a value is defined (not null or undefined).
 */
function assertDefined(value, message) {
    (0, chai_1.expect)(value, message).to.not.be.undefined;
    (0, chai_1.expect)(value, message).to.not.be.null;
}
/**
 * Assert that a string matches a pattern.
 */
function assertMatches(value, pattern, message) {
    (0, chai_1.expect)(value, message).to.match(pattern);
}
/**
 * Sleep for a specified number of milliseconds.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=testUtils.js.map
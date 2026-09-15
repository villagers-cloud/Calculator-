const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser globals before loading the script
global.window = {
    matchMedia: () => ({ matches: false, addEventListener: () => {} })
};
global.document = {
    documentElement: { dataset: {} },
    getElementById: () => null,
    createElement: () => ({}),
    body: { appendChild: () => {}, removeChild: () => {} }
};
global.URL = { createObjectURL: () => '', revokeObjectURL: () => {} };

// Load the script content
const helpersScript = fs.readFileSync(path.join(__dirname, '../js/utils/helpers.js'), 'utf8');

// Evaluate the script in the current context
eval(helpersScript);

// Save the original Date object before mocking
const OriginalDate = Date;

// Simple test runner implementation
let __beforeEach = null;
let __afterEach = null;

function describe(description, callback) {
    console.log(`\n${description}`);
    callback();
}

function it(description, callback) {
    try {
        if (__beforeEach) __beforeEach();
        callback();
        console.log(`  ✅ ${description}`);
    } catch (error) {
        console.error(`  ❌ ${description}`);
        console.error(error);
        process.exitCode = 1;
    } finally {
        if (__afterEach) __afterEach();
    }
}

function beforeEach(callback) {
    __beforeEach = callback;
}

function afterEach(callback) {
    __afterEach = callback;
}

describe('getTodayDate', () => {

    afterEach(() => {
        // Restore the original Date object
        global.Date = OriginalDate;
    });

    it('should return the current date in YYYY-MM-DD format based on UTC', () => {
        // Mock Date to a specific point in time
        const mockDate = new OriginalDate('2023-10-25T14:30:00Z');
        global.Date = class extends OriginalDate {
            constructor(...args) {
                if (args.length === 0) {
                    return mockDate;
                }
                return new OriginalDate(...args);
            }
            static now() {
                return mockDate.getTime();
            }
        };

        const result = getTodayDate();
        assert.strictEqual(result, '2023-10-25');
    });

    it('should handle leap years correctly', () => {
        // Mock Date to a leap year date
        const mockDate = new OriginalDate('2024-02-29T10:00:00Z');
        global.Date = class extends OriginalDate {
            constructor(...args) {
                if (args.length === 0) {
                    return mockDate;
                }
                return new OriginalDate(...args);
            }
            static now() {
                return mockDate.getTime();
            }
        };

        const result = getTodayDate();
        assert.strictEqual(result, '2024-02-29');
    });

    it('should handle different timezones if they result in different UTC days', () => {
        // New York (UTC-5) at 8 PM on 2023-10-25 is 1 AM on 2023-10-26 in UTC.
        // getTodayDate uses .toISOString() which converts to UTC.
        const mockDate = new OriginalDate('2023-10-26T01:00:00Z');
        global.Date = class extends OriginalDate {
            constructor(...args) {
                if (args.length === 0) {
                    return mockDate;
                }
                return new OriginalDate(...args);
            }
            static now() {
                return mockDate.getTime();
            }
        };

        const result = getTodayDate();
        assert.strictEqual(result, '2023-10-26');
    });
});

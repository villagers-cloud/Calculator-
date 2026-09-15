const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

// Mock window object to prevent errors when loading helpers.js
const windowMock = {
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    showSaveFilePicker: null
};

const sandbox = {
    window: windowMock,
    document: {
        documentElement: { dataset: {} },
        createElement: () => ({}),
        body: { appendChild: () => {}, removeChild: () => {} }
    },
    URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
    console: console,
    Date: Date,
    Math: Math,
    String: String,
    Number: Number
};

vm.createContext(sandbox);

// Load the script
const scriptPath = path.join(__dirname, '../js/utils/helpers.js');
const code = fs.readFileSync(scriptPath, 'utf8');
vm.runInContext(code, sandbox);

// Expose functions for testing
const generateId = sandbox.generateId;

function runTests() {
    console.log("Running tests for generateId()...");

    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`✅ PASS: ${name}`);
            passed++;
        } catch (e) {
            console.error(`❌ FAIL: ${name}`);
            console.error(e);
            failed++;
        }
    }

    test('should return a string', () => {
        const id = generateId();
        assert.strictEqual(typeof id, 'string', `Expected string, got ${typeof id}`);
    });

    test('should be alphanumeric', () => {
        const id = generateId();
        assert.match(id, /^[a-z0-9]+$/, `ID ${id} contains non-alphanumeric characters`);
    });

    test('should generate unique IDs', () => {
        const iterations = 10000;
        const ids = new Set();

        for (let i = 0; i < iterations; i++) {
            const id = generateId();
            if (ids.has(id)) {
                assert.fail(`Duplicate ID generated: ${id} at iteration ${i}`);
            }
            ids.add(id);
        }

        assert.strictEqual(ids.size, iterations, `Expected ${iterations} unique IDs, got ${ids.size}`);
    });

    console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();

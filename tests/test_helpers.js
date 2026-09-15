const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Mock browser globals
const sandbox = {
    window: {
        matchMedia: () => ({ matches: false, addEventListener: () => {} })
    },
    document: {
        documentElement: { dataset: {} },
        getElementById: () => null,
        createElement: () => ({ href: '', download: '', click: () => {} }),
        body: { appendChild: () => {}, removeChild: () => {} }
    },
    URL: {
        createObjectURL: () => 'blob:url',
        revokeObjectURL: () => {}
    },
    Date: Date,
    Math: Math,
    String: String,
    Number: Number,
    isNaN: isNaN,
    console: console
};

// Load and evaluate helpers.js
const helpersCode = fs.readFileSync(path.join(__dirname, '../js/utils/helpers.js'), 'utf8');
vm.createContext(sandbox);
vm.runInContext(helpersCode, sandbox);

// Extract the function to test
const formatMoney = sandbox.formatMoney;

// Helper to run a test block
function describe(name, fn) {
    console.log(`Running: ${name}`);
    try {
        fn();
        console.log(`✅ Passed: ${name}\n`);
    } catch (err) {
        console.error(`❌ Failed: ${name}`);
        console.error(err);
        process.exit(1);
    }
}

// Tests
describe('formatMoney - Basic functionality', () => {
    assert.strictEqual(typeof formatMoney, 'function');
});

describe('formatMoney - Standard numbers', () => {
    assert.strictEqual(formatMoney(100), '₹100.00');
    assert.strictEqual(formatMoney(100.5), '₹100.50');
    assert.strictEqual(formatMoney(100.55), '₹100.55');
    // It should round to 2 decimal places
    assert.strictEqual(formatMoney(100.556), '₹100.56');
});

describe('formatMoney - Negative numbers', () => {
    assert.strictEqual(formatMoney(-50), '₹-50.00');
    assert.strictEqual(formatMoney(-50.75), '₹-50.75');
});

describe('formatMoney - Large numbers (en-IN locale)', () => {
    assert.strictEqual(formatMoney(1000), '₹1,000.00');
    assert.strictEqual(formatMoney(100000), '₹1,00,000.00');
    assert.strictEqual(formatMoney(10000000), '₹1,00,00,000.00');
});

describe('formatMoney - Falsy and edge case values', () => {
    assert.strictEqual(formatMoney(0), '₹0.00');
    assert.strictEqual(formatMoney(null), '₹0.00');
    assert.strictEqual(formatMoney(undefined), '₹0.00');
    assert.strictEqual(formatMoney(""), '₹0.00');
});

describe('formatMoney - Custom currency symbols', () => {
    assert.strictEqual(formatMoney(100, '$'), '$100.00');
    assert.strictEqual(formatMoney(50, '€'), '€50.00');
    assert.strictEqual(formatMoney(1000, 'USD '), 'USD 1,000.00');
});

describe('formatMoney - String number inputs', () => {
    assert.strictEqual(formatMoney("100"), '₹100.00');
    assert.strictEqual(formatMoney("100.5"), '₹100.50');
    assert.strictEqual(formatMoney("-50"), '₹-50.00');
});

console.log('All tests completed successfully! 🎉');

const assert = require('assert');
const fs = require('fs');

const helpersContent = fs.readFileSync('js/utils/helpers.js', 'utf8');

// Mock window object for the eval scope
const window = {
    AppState: {},
    AppFilter: {},
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    showSaveFilePicker: null
};

// Also mock document and URL for saveFileToDevice fallback
const document = {
    documentElement: { dataset: {} },
    getElementById: () => ({ textContent: "" }),
    createElement: () => ({}),
    body: { appendChild: () => {}, removeChild: () => {} }
};
const URL = { createObjectURL: () => "", revokeObjectURL: () => {} };

eval(helpersContent);

function runTests() {
    console.log("Running security regression tests...");

    // Test that escapeHTML works correctly and escapes XSS payloads
    const maliciousPayload1 = "<script>alert('XSS')</script>";
    const maliciousPayload2 = "<img src=x onerror=alert('XSS')>";
    const maliciousPayload3 = "javascript:alert('XSS')";
    const normalText = "pending";

    assert.strictEqual(escapeHTML(normalText), "pending", "Normal text should remain unchanged");
    assert.strictEqual(escapeHTML(maliciousPayload1), "&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;", "Script tag should be escaped");
    assert.strictEqual(escapeHTML(maliciousPayload2), "&lt;img src=x onerror=alert(&#039;XSS&#039;)&gt;", "Img onerror should be escaped");

    console.log("All tests passed. XSS payload is safely escaped.");
}

runTests();

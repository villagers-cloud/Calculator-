const fs = require('fs');
const path = require('path');

// Read the index.html file
const indexPath = path.join(__dirname, '../index.html');
const htmlContent = fs.readFileSync(indexPath, 'utf-8');

// Extract the esc function
const match = htmlContent.match(/function esc\([^)]*\)\{.*?\}[^}]*\}/);
// Alternatively, just grab the line that starts with function esc
const lines = htmlContent.split('\n');
const escLine = lines.find(line => line.includes('function esc('));

if (!escLine) {
    console.error("Failed to find 'esc' function in index.html");
    process.exit(1);
}

const escFunctionString = escLine;

// Evaluate the function in the current context
const esc = (function() {
    let escFn;
    eval(escFunctionString + '; escFn = esc;');
    return escFn;
})();

// Simple test runner
let passCount = 0;
let failCount = 0;

function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        passCount++;
        console.log(`✅ PASS: ${testName}`);
    } else {
        failCount++;
        console.error(`❌ FAIL: ${testName}`);
        console.error(`   Expected: ${expected}`);
        console.error(`   Actual:   ${actual}`);
    }
}

console.log("🧪 Running tests for 'esc' function...\n");

// Test Cases
assertEqual(esc("hello"), "hello", "Plain text remains unchanged");
assertEqual(esc("Tom & Jerry"), "Tom &amp; Jerry", "Ampersand (&) is escaped");
assertEqual(esc("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;", "Tags and quotes are escaped");
assertEqual(esc('<a href="link">'), "&lt;a href=&quot;link&quot;&gt;", "Double quotes (\") are escaped");
assertEqual(esc("O'Reilly"), "O&#039;Reilly", "Single quotes (') are escaped");
assertEqual(esc("a & b < c > d \" e ' f"), "a &amp; b &lt; c &gt; d &quot; e &#039; f", "All target characters in one string");

// Edge Cases
assertEqual(esc(null), "", "null is converted to empty string");
assertEqual(esc(undefined), "", "undefined is converted to empty string");
assertEqual(esc(""), "", "Empty string remains empty string");
assertEqual(esc(0), "0", "Number 0 is converted to string '0'");
assertEqual(esc(123), "123", "Numbers are converted to strings");
assertEqual(esc(false), "false", "Booleans are converted to strings");

console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed.`);
if (failCount > 0) {
    process.exit(1);
}

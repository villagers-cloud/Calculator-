const { performance } = require('perf_hooks');

const NUM_QUOTES = 100_000;
const statuses = ['Approved', 'Paid', 'Pending'];
const quotes = Array.from({ length: NUM_QUOTES }, (_, i) => ({
    status: statuses[i % 3],
    retainer: Math.random() * 1000
}));

function baseline() {
    return quotes.filter(q => ["Approved", "Paid"].includes(q.status)).reduce((s, q) => s + Number(q.retainer || 0), 0);
}

function optimized() {
    return quotes.filter(q=>q.status==="Approved"||q.status==="Paid").reduce((s,q)=>s+Number(q.retainer||0),0);
}

function runTest(fn, name) {
    let start = performance.now();
    for (let i = 0; i < 100; i++) {
        fn();
    }
    let end = performance.now();
    return end - start;
}

// Warmup
runTest(baseline, 'Baseline (Warmup)');
runTest(optimized, 'Optimized (Warmup)');

const baselineTime = runTest(baseline, 'Baseline');
const optimizedTime = runTest(optimized, 'Optimized');

console.log(`Baseline: ${baselineTime.toFixed(2)} ms`);
console.log(`Optimized: ${optimizedTime.toFixed(2)} ms`);
console.log(`Improvement: ${((baselineTime - optimizedTime) / baselineTime * 100).toFixed(2)}%`);

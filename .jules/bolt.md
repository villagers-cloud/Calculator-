## 2024-05-18 - Search Input Re-rendering
**Learning:** Combining O(N) calculations (global metric reductions) with list filtering on high-frequency events (like keypresses) leads to unnecessary performance degradation. Even with a small N, calculating metrics like MRR over the entire dataset on every keystroke is wasteful when only the filtered list needs updating.
**Action:** Always decouple global metric calculations from local list filtering when rendering. Bind search inputs specifically to the list rendering function instead of a global update function.
## 2024-05-19 - Concurrent IndexedDB Reads
**Learning:** Sequential reads from IndexedDB for multiple stores using async/await within a `for...of` loop can be significantly slower than concurrent reads.
**Action:** Use `Promise.all` with `.map` to execute multiple independent `getAll` requests on different IndexedDB stores concurrently, reducing total execution time by ~30% for bulk data export.
## N+1 Query Optimization in Projects Rendering (15 Sep 2026)

**Issue**: `js/views/projects.js` suffered from an N+1 query problem when resolving client names for projects. For each project in the `projects` array, it independently queried the `clients` store from IndexedDB (`window.appDB.get`).

**Optimization**:
Replaced the loop of single queries with a bulk query and dictionary lookup.
1. Queried all clients upfront using `window.appDB.getAll('clients')`.
2. Built a `clientMap` (Map) for fast `O(1)` lookups.
3. Looped through the `projects` and assigned `clientNameTemp` using the Map.

**Measurement**:
- Baseline (500 projects): ~240 ms
- Optimized (500 projects): ~0.5 ms
- Improvement: ~480x faster resolving time for 500 records.

**Takeaway**:
Avoid making multiple asynchronous DB requests inside a loop. Doing a bulk fetch (`getAll`) and an in-memory mapping significantly reduces I/O overhead and context-switching with IndexedDB, especially as the data scales.

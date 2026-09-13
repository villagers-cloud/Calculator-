## 2024-05-18 - Search Input Re-rendering
**Learning:** Combining O(N) calculations (global metric reductions) with list filtering on high-frequency events (like keypresses) leads to unnecessary performance degradation. Even with a small N, calculating metrics like MRR over the entire dataset on every keystroke is wasteful when only the filtered list needs updating.
**Action:** Always decouple global metric calculations from local list filtering when rendering. Bind search inputs specifically to the list rendering function instead of a global update function.

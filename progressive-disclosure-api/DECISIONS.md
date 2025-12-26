# Architecture Decision Log

This document captures key architectural decisions for the Progressive Disclosure API.
Decisions are append-only - never edit historical entries.

---

## Decision 001: Four-Layer Architecture (2024-12-25)

**Context:**
When analyzing Figma designs, users need different levels of detail at different times. Fetching everything upfront is slow and overwhelming.

**Decision:**
Implement a four-layer progressive disclosure architecture:
- Layer 0: Design System (meta-level, file-wide)
- Layer 1: Visual (screenshots)
- Layer 2: Structural (component maps with IDs)
- Layer 3: Detailed (node properties and bindings)

**Rationale:**
- Each layer serves a distinct use case
- Layers build on each other (hypermedia navigation)
- Layer 3 bindings reference Layer 0 variables (context preservation)
- Users can stop at any layer without fetching unnecessary data
- Enables caching at different granularities

**Consequences:**
- More API calls for complete analysis, but each call is faster
- Requires cross-referencing between layers (especially 0 and 3)
- Clear separation of concerns
- Easy to cache each layer independently

**Alternatives Considered:**
- Single endpoint returning everything: Too slow, wasteful
- Two layers (visual + detailed): Loses structural navigation
- GraphQL with field selection: Adds complexity, overkill for this use case

---

## Decision 002: Executable Examples as Documentation (2024-12-25)

**Context:**
Traditional API documentation (separate markdown files) tends to:
- Go out of sync with code
- Become redundant and bloated
- Require maintenance overhead

**Decision:**
Use executable JavaScript examples as the primary documentation.
- Each layer has a working .js example
- Examples are actually runnable
- Code comments explain what's happening
- Single README.md for overview and reference table

**Rationale:**
- Examples can't go out of sync - they either run or fail
- Doubles as integration tests
- Shows exact usage, not abstract descriptions
- Easier to maintain (update code, not docs)

**Consequences:**
- Examples must be kept simple and well-commented
- Need to ensure examples cover common use cases
- Less prose, more code (some users may prefer longer explanations)

**Alternatives Considered:**
- Separate docs folder with markdown: Maintenance overhead, drift
- Auto-generated docs from JSDoc: Overkill, loses narrative
- Wiki or external docs site: Out of sync, extra tooling

---

## Decision 003: Node IDs as Navigation Keys (2024-12-25)

**Context:**
Layer 2 (structural) provides component maps. Users need to drill down into specific nodes from Layer 3 (detailed).

**Decision:**
Include node IDs in every Layer 2 response:
- Format: `[nodeId]` in tree output
- Instance children: `[I{parentId};{componentId}]`
- IDs are the "links" for HATEOAS navigation

**Rationale:**
- Node IDs are stable identifiers in Figma
- Enable direct access: `getNodeDetails(nodeId)`
- Self-documenting: user sees ID in map, uses it in next query
- Supports hypermedia-driven API pattern

**Consequences:**
- Tree output is slightly more verbose (IDs added)
- Users must copy/paste IDs for drill-down (acceptable tradeoff)
- Enables automation (parse map, extract IDs, batch query)

**Alternatives Considered:**
- Node names as keys: Not unique, unreliable
- Paths (e.g., "Content/Frame2/Title"): Fragile, breaks on renames
- Separate endpoint to get IDs: Extra API call, unnecessary

---

## Decision 004: Layer 0 as Context Provider (2024-12-25)

**Context:**
Layer 3 returns bindings like `"boundTo": "Fills/card-background"`, but this is meaningless without knowing what that variable resolves to.

**Decision:**
Layer 0 (Design System Audit) provides the context to resolve these bindings.
- Run Layer 0 once, cache result
- Use Layer 0 to look up variable definitions
- Example: `Fills/card-background` → `Colors/White` (Light) / `Colors/Eerie Black` (Dark)

**Rationale:**
- Separation of concerns: Layer 0 = design system, Layer 3 = node details
- Avoids duplicating variable data in every Layer 3 response
- Enables caching: Layer 0 rarely changes, cache for hours
- Matches mental model: "What tokens exist?" vs "What does this use?"

**Consequences:**
- Requires cross-referencing between layers
- Users must run Layer 0 first (or use stale cache)
- More complex workflow, but more efficient overall

**Alternatives Considered:**
- Embed full variable definitions in Layer 3: Massive duplication, slow
- Resolve bindings server-side: Loses flexibility, harder to cache
- Separate variable resolution endpoint: Extra complexity

---

## Decision 005: Minimal File Structure (2024-12-25)

**Context:**
Documentation tends to sprawl into many files, becoming hard to navigate and maintain.

**Decision:**
Keep structure minimal:
```
progressive-disclosure-api/
├── README.md              # Single source of truth
├── examples/              # Executable code
│   ├── 00-design-system-audit.js
│   ├── 01-visual-layer.js
│   ├── 02-structural-layer.js
│   ├── 03-detailed-layer.js
│   └── 04-complete-workflow.js
└── DECISIONS.md           # This file
```

No separate `docs/`, `architecture/`, `guides/`, or `api-reference/` folders.

**Rationale:**
- Everything in one place (README)
- Code examples are the documentation
- Less to maintain = stays relevant longer
- Easy to find things (only 3 files at root)

**Consequences:**
- README must stay focused (currently ~300 lines, acceptable)
- If README grows >500 lines, reconsider
- Some users may prefer more detailed prose docs

**Alternatives Considered:**
- Separate folder for each layer docs: Too many files
- Auto-generated API reference: Overkill
- External docs site: Extra tooling, drift

---

## Template for Future Decisions

```markdown
## Decision XXX: Title (YYYY-MM-DD)

**Context:**
[What is the situation we're facing?]

**Decision:**
[What did we decide?]

**Rationale:**
[Why did we choose this?]

**Consequences:**
[What are the impacts, positive and negative?]

**Alternatives Considered:**
[What other options did we evaluate?]
```

---

## Decision 006: Examples Run from Parent Directory (2024-12-25)

**Context:**
When testing the Progressive Disclosure API examples, module import errors occurred when running scripts from the `progressive-disclosure-api/examples/` directory. The error: `Cannot find module './lib'`.

**Decision:**
All example scripts must be run from the parent directory (`/Users/kasa/Downloads/Projects/figmatic/`) using:
```bash
node progressive-disclosure-api/examples/00-design-system-audit.js
```

All example scripts use the require path: `require('../../lib')` to reference the shared library in the parent directory.

**Rationale:**
- The shared `lib` folder exists at the figmatic root level
- Examples are nested two levels deep: `figmatic/progressive-disclosure-api/examples/`
- Running from parent directory maintains consistent working directory
- Aligns with iterative micro-execution pattern (scripts complete in <10s)

**Consequences:**
- Clear, consistent usage pattern documented in README
- All scripts tested and verified working
- Users must `cd` to parent directory before running examples
- Relative paths in require statements are two levels up (`../../lib`)

**Testing Results:**
All 4 layers tested successfully:
- ✅ Layer 0: 57 primitives + 23 tokens extracted
- ✅ Layer 1: Screenshot captured (393×852 @ 2x, 442 KB)
- ✅ Layer 2: Component map with node IDs generated
- ✅ Layer 3: Node properties and bindings extracted
- ✅ Layer 4: Complete workflow with cross-reference resolution working

**Alternatives Considered:**
- Run from examples directory: Requires different lib path structure
- Copy lib into progressive-disclosure-api: Code duplication, maintenance overhead
- Use absolute paths: Not portable across systems

---

**Next Decision:** [TBD]

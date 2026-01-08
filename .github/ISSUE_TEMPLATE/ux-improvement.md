---
name: UX Improvement
about: API usability improvement following UX Research Methodology
title: 'UX: [Brief description]'
labels: enhancement, ux, mental-model
assignees: ''
---

## Problem

**Error/Friction Point:**
```
[Paste error message or describe the friction]
```

**What I expected (Mental Model):**
```javascript
// What intuitive syntax should work
```

**What actually works (Current Reality):**
```javascript
// Current workaround required
```

---

## Mental Model Rationale

**Based on which standard?**
- [ ] CSS (e.g., rgba, flexbox)
- [ ] Canvas API
- [ ] SVG
- [ ] React (declarative)
- [ ] Figma UI (what users see)
- [ ] Industry convention (e.g., typography)
- [ ] Other: ___________

**Why do developers expect this?**
[Explain the reasoning - trained on web standards, common patterns, etc.]

---

## Proposed Solution

**Approach:**
- [ ] Helper layer normalization (accept both formats)
- [ ] Backward compatible wrapper
- [ ] New abstraction
- [ ] Other: ___________

**Example:**
```javascript
// New intuitive syntax (what should work)

// Transforms internally to:

// Existing Figma API format
```

**Backward Compatibility:**
- [ ] Yes - existing code continues to work
- [ ] No - breaking change (requires migration)

---

## 📋 Implementation Checklist

### **Phase 1: Discovery & Planning**

- [ ] **Identify ALL affected locations**
  - [ ] Tools: `write-tools.js` functions (list which ones)
  - [ ] Schemas: `tools/schemas.js` descriptions
  - [ ] Documentation: `helpers/README.md`, `README.md`, `CLAUDE.md`
  - [ ] Tests: Unit tests + integration tests
  - [ ] Examples: Which examples need updating?

- [ ] **Create task list** (use TodoWrite)

---

### **Phase 2: Implementation**

- [ ] **Core helpers**
  - [ ] Create helper function(s) in `helpers/[name].js`
  - [ ] Export from `helpers/index.js`
  - [ ] Add JSDoc documentation

- [ ] **Tool integration**
  - [ ] Tool 1: ___________
  - [ ] Tool 2: ___________
  - [ ] Tool 3: ___________
  - [ ] (List all affected tools)

- [ ] **Edge cases**
  - [ ] Simple property usage
  - [ ] Nested property usage
  - [ ] Multiple data formats
  - [ ] Related parameters (e.g., fills + strokes)

---

### **Phase 3: Testing Protocol**

- [ ] **Unit tests**
  - [ ] Create `helpers/[name].test.js`
  - [ ] Test normalization functions
  - [ ] Test edge cases
  - [ ] All assertions passing

- [ ] **Integration tests (Actual Figma)**
  - [ ] Test Tool 1 with new syntax
  - [ ] Test Tool 2 with new syntax
  - [ ] Test Tool 3 with new syntax
  - [ ] Test variations (different formats)
  - [ ] Test edge cases (related features)

- [ ] **Bug discovery**
  - [ ] Document any bugs found during testing
  - [ ] Fix and re-test
  - [ ] Verify all variations work

---

### **Phase 4: Documentation & Closure**

- [ ] **Schema documentation**
  - [ ] Update tool schema descriptions
  - [ ] Add examples showing new syntax
  - [ ] Note backward compatibility

- [ ] **Helper documentation**
  - [ ] Add section to `helpers/README.md`
  - [ ] Document all functions with examples
  - [ ] Show before/after comparison

- [ ] **Main documentation**
  - [ ] Update `README.md` examples
  - [ ] Update `CLAUDE.md` with fix
  - [ ] Add to UX Research Methodology learnings

- [ ] **GitHub issue**
  - [ ] Post implementation summary
  - [ ] List all files changed
  - [ ] Document tests performed
  - [ ] Note bugs found & fixed

- [ ] **Verification & closure**
  - [ ] All tests passing
  - [ ] All tools working in Figma
  - [ ] All documentation updated
  - [ ] User approval obtained

---

## 🎯 Success Criteria

- [ ] **First-attempt success**: New intuitive syntax works without errors
- [ ] **Backward compatible**: Existing code still works
- [ ] **Comprehensive coverage**: All affected tools support new syntax
- [ ] **Well documented**: Schemas, READMEs, examples updated
- [ ] **Production tested**: Real Figma operations verified
- [ ] **Edge cases handled**: All variations work correctly

---

## 📚 Reference

- UX Research Methodology: [CLAUDE.md](../../../CLAUDE.md#-ux-research-methodology-for-api-design)
- Example Issue: [#26 - Alpha Channel Support](https://github.com/uxfreak/figmatic-mcp-server/issues/26)

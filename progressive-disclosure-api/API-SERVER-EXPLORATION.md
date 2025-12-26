# API Server Architecture Exploration

## Current State vs Desired State

**Current:** Standalone Node.js scripts that must be run manually from CLI
**Desired:** HTTP API server that exposes Progressive Disclosure layers as endpoints

---

## Architecture Options

### Option 1: RESTful HTTP API

**Approach:** Classic REST endpoints with resource-based URLs

```
GET  /api/design-system              → Layer 0: Full design system audit
GET  /api/nodes/:nodeId/screenshot   → Layer 1: Screenshot
GET  /api/nodes/:nodeId/structure    → Layer 2: Component map
GET  /api/nodes/:nodeId/details      → Layer 3: Node properties
GET  /api/nodes/:nodeId/complete     → Layer 4: All layers combined

# Query parameters for customization
GET  /api/nodes/:nodeId/screenshot?scale=2&format=PNG
GET  /api/nodes/:nodeId/structure?depth=3&includeInstances=true
```

**Pros:**
- Simple, well-understood pattern
- Easy to cache (HTTP caching headers)
- Stateless, scalable
- Works with any HTTP client

**Cons:**
- Multiple round trips for complete workflow
- No real-time updates when Figma file changes

---

### Option 2: GraphQL API

**Approach:** Single endpoint, client specifies exactly what they need

```graphql
query GetNodeComplete {
  node(id: "146:4867") {
    screenshot(scale: 2)
    structure(depth: 3) {
      name
      type
      id
      children {
        name
        type
        id
      }
    }
    details {
      dimensions { width height }
      fills {
        type
        color
        boundTo
      }
    }
  }
  designSystem {
    variables(collection: "Tokens") {
      name
      type
      values
    }
  }
}
```

**Pros:**
- Single request for complex queries
- Client controls data shape (no over-fetching)
- Built-in schema/documentation
- Perfect for progressive disclosure (nested queries)

**Cons:**
- More complex to implement
- Caching is harder (not URL-based)
- Learning curve for clients

---

### Option 3: Hybrid REST + WebSocket

**Approach:** REST for queries, WebSocket for real-time updates

```javascript
// HTTP REST for queries
GET /api/nodes/:nodeId/details

// WebSocket for live updates
ws://localhost:3000
→ subscribe: { nodeId: "146:4867", layers: ["structure", "details"] }
← update: { layer: "details", data: {...}, timestamp: ... }
```

**Pros:**
- Real-time updates when Figma file changes
- Efficient for monitoring/watching
- Best of both worlds

**Cons:**
- More complexity (two protocols)
- Stateful connections (harder to scale)

---

### Option 4: Server-Sent Events (SSE) API

**Approach:** REST endpoints that stream data progressively

```javascript
// Progressive data streaming
GET /api/nodes/:nodeId/stream
→ data: {"layer": 0, "type": "design-system", ...}
→ data: {"layer": 1, "type": "screenshot", ...}
→ data: {"layer": 2, "type": "structure", ...}
→ data: {"layer": 3, "type": "details", ...}
→ data: {"complete": true}
```

**Pros:**
- Progressive loading (show data as it arrives)
- One request for complete workflow
- Simpler than WebSocket (HTTP-based)

**Cons:**
- One-way communication only
- Not all clients support SSE well

---

## Recommended Architecture: RESTful with Smart Caching

### Why REST + Caching?

1. **Aligns with Progressive Disclosure** - Each layer = separate endpoint
2. **Natural caching boundaries** - Layer 0 cached for hours, Layer 3 fresh each time
3. **Simple to implement and use** - Standard HTTP, works everywhere
4. **Scalable** - Stateless, can add load balancing easily

### Proposed API Design

```javascript
// ===========================
// LAYER 0: Design System Context
// ===========================
GET /api/design-system
Response: {
  collections: {
    "Primitives": { modes: [...], variables: [...] },
    "Tokens": { modes: [...], variables: [...] }
  },
  textStyles: [...],
  paintStyles: [...],
  effectStyles: [...],
  _meta: {
    cached: true,
    timestamp: "2024-12-25T14:30:00Z",
    ttl: 3600  // 1 hour cache
  }
}

// ===========================
// LAYER 1: Visual
// ===========================
GET /api/nodes/:nodeId/screenshot?scale=2&format=PNG
Response: {
  url: "/screenshots/146-4867-1234567890.png",  // Or base64
  metadata: {
    width: 393,
    height: 852,
    scale: 2,
    format: "PNG",
    size: 452250  // bytes
  },
  _links: {
    structure: "/api/nodes/146:4867/structure",
    details: "/api/nodes/146:4867/details"
  }
}

// ===========================
// LAYER 2: Structure
// ===========================
GET /api/nodes/:nodeId/structure?depth=2
Response: {
  node: {
    id: "146:4867",
    name: "Help Screen",
    type: "FRAME",
    children: [
      {
        id: "146:4868",
        name: "Background Glow",
        type: "GROUP",
        _links: {
          details: "/api/nodes/146:4868/details"
        }
      },
      // ... more children
    ]
  },
  _links: {
    screenshot: "/api/nodes/146:4867/screenshot",
    details: "/api/nodes/146:4867/details",
    parent: "/api/nodes/146:1234/structure"
  }
}

// ===========================
// LAYER 3: Detailed
// ===========================
GET /api/nodes/:nodeId/details
Response: {
  identity: { name: "Help Screen", id: "146:4867", type: "FRAME" },
  dimensions: { width: 393, height: 852 },
  layout: { mode: "VERTICAL", ... },
  appearance: {
    fills: [
      {
        type: "SOLID",
        color: { r: 18, g: 18, b: 18 },
        boundTo: "Fills/page background",
        _resolved: {
          collection: "Tokens",
          variable: "Fills/page background",
          lightValue: "rgb(255,255,255)",
          darkValue: "rgb(18,18,18)"
        }
      }
    ]
  },
  _links: {
    screenshot: "/api/nodes/146:4867/screenshot",
    structure: "/api/nodes/146:4867/structure",
    resolveVariable: "/api/variables/Fills%2Fpage%20background"
  }
}

// ===========================
// LAYER 4: Complete Workflow
// ===========================
GET /api/nodes/:nodeId/complete
Response: {
  designSystem: { ... },      // Layer 0
  screenshot: { ... },         // Layer 1
  structure: { ... },          // Layer 2
  details: { ... },            // Layer 3
  _links: {
    screenshot: "/api/nodes/146:4867/screenshot",
    structure: "/api/nodes/146:4867/structure",
    details: "/api/nodes/146:4867/details"
  }
}

// ===========================
// UTILITY ENDPOINTS
// ===========================
GET /api/variables/:variableName
// Resolve a specific variable across all modes

GET /api/health
// Server health check

GET /api/connection
// Figma plugin connection status
```

---

## Key Features

### 1. HATEOAS (Hypermedia as the Engine of Application State)

Every response includes `_links` showing what you can do next:

```json
{
  "node": { "id": "146:4867", "name": "Help Screen" },
  "_links": {
    "self": "/api/nodes/146:4867/structure",
    "screenshot": "/api/nodes/146:4867/screenshot",
    "details": "/api/nodes/146:4867/details",
    "children": [
      "/api/nodes/146:4868/details",
      "/api/nodes/146:4871/details"
    ]
  }
}
```

### 2. Smart Caching Strategy

```javascript
// Layer 0: Design System - Cache for 1 hour
Cache-Control: public, max-age=3600

// Layer 1: Screenshots - Cache for 5 minutes
Cache-Control: public, max-age=300

// Layer 2: Structure - Cache for 1 minute
Cache-Control: public, max-age=60

// Layer 3: Details - No cache (always fresh)
Cache-Control: no-cache
```

### 3. Inline Variable Resolution

Layer 3 automatically resolves bindings using cached Layer 0 data:

```json
{
  "fills": [
    {
      "boundTo": "Fills/page background",
      "_resolved": {
        "collection": "Tokens",
        "modes": {
          "Light": "rgb(255,255,255)",
          "Dark": "rgb(18,18,18)"
        }
      }
    }
  ]
}
```

### 4. Query Parameters for Customization

```
GET /api/nodes/:nodeId/structure
  ?depth=3                    // How deep to traverse
  &includeInstances=true      // Include instance children
  &format=tree|flat           // Response format

GET /api/nodes/:nodeId/screenshot
  ?scale=1|2|3                // Retina scale
  &format=PNG|JPG|SVG         // Image format
  &return=url|base64|binary   // How to return image
```

---

## Technology Stack Options

### Option A: Express.js (Simple, Fast)

```javascript
const express = require('express');
const app = express();

app.get('/api/design-system', async (req, res) => {
  const cached = cache.get('design-system');
  if (cached) return res.json(cached);

  const result = await figmaApi.executeInFigma(/* ... */);
  cache.set('design-system', result, 3600);
  res.json(result);
});
```

**Pros:** Simple, well-known, minimal overhead
**Cons:** Manual caching, manual routing, no built-in validation

### Option B: Fastify (Performance-First)

```javascript
const fastify = require('fastify')({ logger: true });

fastify.get('/api/nodes/:nodeId/details', {
  schema: {
    params: {
      type: 'object',
      properties: { nodeId: { type: 'string' } }
    }
  }
}, async (req, reply) => {
  const result = await getNodeDetails(req.params.nodeId);
  return result;
});
```

**Pros:** Faster than Express, built-in validation, JSON schema
**Cons:** Different API than Express

### Option C: NestJS (Enterprise-Grade)

```typescript
@Controller('api/nodes')
export class NodesController {
  @Get(':nodeId/details')
  @UseInterceptors(CacheInterceptor)
  async getNodeDetails(@Param('nodeId') nodeId: string) {
    return this.nodesService.getDetails(nodeId);
  }
}
```

**Pros:** TypeScript, decorators, dependency injection, built-in everything
**Cons:** Heavy, opinionated, steeper learning curve

---

## Recommended Implementation Plan

### Phase 1: Core REST API (MVP)

1. **Setup Express server** with basic routing
2. **Implement Layer 0 endpoint** with caching
3. **Implement Layer 1-3 endpoints** (screenshot, structure, details)
4. **Add HATEOAS links** to all responses
5. **Basic error handling** and connection checks

### Phase 2: Enhancements

1. **Implement Layer 4** (complete workflow)
2. **Add query parameters** for customization
3. **Inline variable resolution** in Layer 3
4. **Response compression** (gzip)
5. **Rate limiting** to prevent abuse

### Phase 3: Production Features

1. **OpenAPI/Swagger docs** (auto-generated)
2. **Health checks** and monitoring
3. **Logging** (request/response, errors)
4. **Authentication** (API keys if needed)
5. **CORS** configuration

### Phase 4: Advanced Features

1. **Batch endpoints** (get multiple nodes at once)
2. **WebSocket subscriptions** for live updates
3. **Webhook callbacks** when Figma file changes
4. **Query language** for complex filtering

---

## Example Client Usage

```javascript
// ===========================
// Scenario: Analyze a screen
// ===========================

// Step 1: Get design system context (cached)
const designSystem = await fetch('/api/design-system').then(r => r.json());

// Step 2: Get visual overview
const screenshot = await fetch('/api/nodes/146:4867/screenshot?scale=2')
  .then(r => r.json());

console.log(`Screenshot: ${screenshot.url}`);

// Step 3: Get structure
const structure = await fetch('/api/nodes/146:4867/structure?depth=2')
  .then(r => r.json());

console.log('Top-level children:', structure.node.children.length);

// Step 4: Drill into specific node using HATEOAS links
const childDetailsUrl = structure.node.children[0]._links.details;
const childDetails = await fetch(childDetailsUrl).then(r => r.json());

console.log('Fill variable:', childDetails.appearance.fills[0]._resolved);

// ===========================
// OR: Get everything at once
// ===========================
const complete = await fetch('/api/nodes/146:4867/complete')
  .then(r => r.json());

// All layers in one response
console.log(complete.designSystem);
console.log(complete.screenshot);
console.log(complete.structure);
console.log(complete.details);
```

---

## Comparison Matrix

| Feature | Standalone Scripts | REST API | GraphQL | WebSocket |
|---------|-------------------|----------|---------|-----------|
| Ease of Use | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Programmable | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Caching | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ |
| Real-time | ❌ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| Scalability | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Implementation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Progressive Disclosure | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## Recommendation: **REST API with Express**

**Why:**
1. ✅ Simple to implement (build on existing scripts)
2. ✅ Perfect for progressive disclosure pattern
3. ✅ Natural caching boundaries
4. ✅ Works with any client (browser, CLI, AI agents)
5. ✅ Can add GraphQL/WebSocket later if needed

**Start with MVP:**
- Express server on port 3000
- 5 core endpoints (design-system, screenshot, structure, details, complete)
- In-memory caching for Layer 0
- HATEOAS links in all responses
- OpenAPI docs

---

## Questions to Consider

1. **Deployment:** Run locally only, or deploy to cloud?
2. **Authentication:** Public API or require API keys?
3. **Multi-file support:** One Figma file or multiple?
4. **Response format:** Always JSON, or support XML/YAML?
5. **File uploads:** Support uploading Figma files or URL-based only?
6. **Versioning:** API versioning strategy (/v1/, /v2/)?

---

**Next Steps:**
1. Validate this approach matches requirements
2. Choose implementation details (Express vs Fastify, etc.)
3. Build MVP with core endpoints
4. Test with real clients
5. Iterate based on usage

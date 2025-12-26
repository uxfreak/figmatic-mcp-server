# Server-Sent Events (SSE) Architecture for Progressive Disclosure

## What is SSE?

**Server-Sent Events** is an HTTP-based protocol where the server can push multiple messages to the client over a single connection. Unlike WebSocket (bidirectional), SSE is **unidirectional** (server → client only).

### Key Characteristics:
- ✅ Built on HTTP (not a separate protocol)
- ✅ Automatic reconnection
- ✅ Event IDs for resume capability
- ✅ Text-based (UTF-8)
- ✅ Browser native support (`EventSource` API)
- ✅ Simpler than WebSocket

---

## Why SSE is Perfect for Progressive Disclosure

### The Problem with Traditional REST:

```javascript
// Traditional: Client must wait for ALL layers
GET /api/nodes/146:4867/complete

// 5 seconds later... (user sees nothing until everything loads)
Response: {
  designSystem: {...},  // 2s to fetch
  screenshot: {...},    // 1s to fetch
  structure: {...},     // 1s to fetch
  details: {...}        // 1s to fetch
}
```

### The SSE Solution:

```javascript
// SSE: Client gets data as it arrives
GET /api/nodes/146:4867/stream

// Immediate response, connection stays open
event: layer-0
data: {"type":"design-system","collections":{...}}
// ↑ User sees design tokens NOW (after 2s)

event: layer-1
data: {"type":"screenshot","url":"...","metadata":{...}}
// ↑ User sees screenshot NOW (after 3s)

event: layer-2
data: {"type":"structure","node":{...}}
// ↑ User sees component map NOW (after 4s)

event: layer-3
data: {"type":"details","identity":{...},"appearance":{...}}
// ↑ User sees full details NOW (after 5s)

event: complete
data: {"status":"done","totalLayers":4}
// ↑ Connection closes
```

**Visual Timeline:**

```
Traditional REST:
[========================================] 5s → Everything at once
0s                                      5s

SSE Stream:
[====] Layer 0
     [==] Layer 1
         [==] Layer 2
             [==] Layer 3
0s   2s   3s   4s   5s
↑    ↑    ↑    ↑    ↑
User sees data progressively as it loads!
```

---

## How MCP Uses SSE

**Model Context Protocol (MCP)** uses SSE for streaming AI responses and tool results:

```typescript
// MCP Server streaming tool results
POST /mcp/tools/execute

event: tool-start
data: {"tool":"read-file","args":{"path":"..."}}

event: tool-progress
data: {"status":"reading","progress":50}

event: tool-result
data: {"content":"file contents here...","metadata":{...}}

event: tool-complete
data: {"status":"success"}
```

### Why MCP chose SSE:
1. **Progressive streaming** - Show AI responses as they're generated (not wait for full completion)
2. **Long-running operations** - Tools can take seconds/minutes
3. **HTTP-based** - No complex WebSocket handshakes
4. **Automatic reconnection** - If connection drops, client auto-reconnects
5. **Event types** - Different message types (progress, result, error, complete)

### Parallels to Progressive Disclosure:
- MCP streams **AI tool results progressively**
- We stream **Figma data layers progressively**
- Both have multiple stages/layers
- Both benefit from showing early results quickly

---

## SSE API Design for Progressive Disclosure

### Core Endpoint

```
GET /api/nodes/:nodeId/stream
```

**Request:**
```http
GET /api/nodes/146:4867/stream?layers=0,1,2,3 HTTP/1.1
Accept: text/event-stream
Cache-Control: no-cache
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: stream-start
data: {"nodeId":"146:4867","requestedLayers":[0,1,2,3],"timestamp":"2024-12-25T14:30:00Z"}

event: layer-0
data: {"layer":0,"type":"design-system","data":{"collections":{"Primitives":{...}}}}

event: layer-1
data: {"layer":1,"type":"screenshot","data":{"url":"/screenshots/...","metadata":{...}}}

event: layer-2
data: {"layer":2,"type":"structure","data":{"node":{"id":"146:4867","children":[...]}}}

event: layer-3
data: {"layer":3,"type":"details","data":{"identity":{...},"appearance":{...}}}

event: stream-complete
data: {"status":"success","layersDelivered":4,"totalTime":5.2}
```

### Event Types

| Event Type | Purpose | Data |
|------------|---------|------|
| `stream-start` | Initial handshake | Request metadata |
| `layer-0` | Design system context | Variables, styles, effects |
| `layer-1` | Visual layer | Screenshot URL + metadata |
| `layer-2` | Structural layer | Component map with IDs |
| `layer-3` | Detailed layer | Node properties + bindings |
| `progress` | Progress updates | % complete, current operation |
| `error` | Error occurred | Error message, retry info |
| `stream-complete` | All done | Summary stats |

### Query Parameters

```
GET /api/nodes/:nodeId/stream
  ?layers=0,1,2,3           // Which layers to fetch (default: all)
  &depth=2                  // Structure depth (Layer 2)
  &scale=2                  // Screenshot scale (Layer 1)
  &resolve=true             // Auto-resolve bindings (Layer 3)
  &includeProgress=true     // Send progress events
```

---

## Implementation: Express + SSE

### Basic Server Setup

```javascript
const express = require('express');
const { runScript } = require('../../lib');

const app = express();

app.get('/api/nodes/:nodeId/stream', async (req, res) => {
  const { nodeId } = req.params;
  const layers = req.query.layers?.split(',').map(Number) || [0, 1, 2, 3];

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Helper to send SSE message
  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Start stream
    sendEvent('stream-start', {
      nodeId,
      requestedLayers: layers,
      timestamp: new Date().toISOString()
    });

    // Layer 0: Design System (if requested)
    if (layers.includes(0)) {
      sendEvent('progress', { layer: 0, status: 'fetching', message: 'Loading design system...' });

      const designSystem = await fetchDesignSystem();

      sendEvent('layer-0', {
        layer: 0,
        type: 'design-system',
        data: designSystem
      });
    }

    // Layer 1: Screenshot (if requested)
    if (layers.includes(1)) {
      sendEvent('progress', { layer: 1, status: 'fetching', message: 'Capturing screenshot...' });

      const screenshot = await fetchScreenshot(nodeId, { scale: req.query.scale || 2 });

      sendEvent('layer-1', {
        layer: 1,
        type: 'screenshot',
        data: screenshot
      });
    }

    // Layer 2: Structure (if requested)
    if (layers.includes(2)) {
      sendEvent('progress', { layer: 2, status: 'fetching', message: 'Mapping structure...' });

      const structure = await fetchStructure(nodeId, { depth: req.query.depth || 2 });

      sendEvent('layer-2', {
        layer: 2,
        type: 'structure',
        data: structure
      });
    }

    // Layer 3: Details (if requested)
    if (layers.includes(3)) {
      sendEvent('progress', { layer: 3, status: 'fetching', message: 'Extracting details...' });

      const details = await fetchDetails(nodeId, { resolve: req.query.resolve === 'true' });

      sendEvent('layer-3', {
        layer: 3,
        type: 'details',
        data: details
      });
    }

    // Complete
    sendEvent('stream-complete', {
      status: 'success',
      layersDelivered: layers.length
    });

    res.end();

  } catch (error) {
    sendEvent('error', {
      message: error.message,
      layer: 'unknown',
      canRetry: true
    });
    res.end();
  }
});

async function fetchDesignSystem() {
  // Use existing script logic
  const result = await api.executeInFigma(`
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    // ... rest of Layer 0 script
  `);
  return result;
}

async function fetchScreenshot(nodeId, options) {
  // Use existing screenshot logic
  const screenshot = createScreenshotHelper(api);
  return await screenshot.screenshotById(nodeId, options);
}

async function fetchStructure(nodeId, options) {
  // Use existing component map logic
  const result = await api.executeInFigma(`
    const node = figma.getNodeById("${nodeId}");
    function mapNode(node, depth = 0) { ... }
    return mapNode(node);
  `);
  return result;
}

async function fetchDetails(nodeId, options) {
  // Use existing details logic
  const result = await api.executeInFigma(`
    const node = figma.getNodeById("${nodeId}");
    // ... extract properties, bindings
  `);

  // Optionally resolve bindings inline
  if (options.resolve) {
    const designSystem = await fetchDesignSystem(); // From cache
    result.appearance.fills = result.appearance.fills.map(fill => {
      if (fill.boundTo) {
        fill._resolved = resolveVariable(fill.boundTo, designSystem);
      }
      return fill;
    });
  }

  return result;
}

app.listen(3000, () => {
  console.log('Progressive Disclosure API (SSE) running on http://localhost:3000');
});
```

---

## Client Usage

### Browser (Native EventSource)

```javascript
const eventSource = new EventSource('http://localhost:3000/api/nodes/146:4867/stream?layers=0,1,2,3');

// Listen for specific layer events
eventSource.addEventListener('layer-0', (e) => {
  const data = JSON.parse(e.data);
  console.log('✅ Design System loaded:', data);
  renderDesignSystem(data.data);
});

eventSource.addEventListener('layer-1', (e) => {
  const data = JSON.parse(e.data);
  console.log('✅ Screenshot ready:', data);
  renderScreenshot(data.data.url);
});

eventSource.addEventListener('layer-2', (e) => {
  const data = JSON.parse(e.data);
  console.log('✅ Structure loaded:', data);
  renderComponentMap(data.data.node);
});

eventSource.addEventListener('layer-3', (e) => {
  const data = JSON.parse(e.data);
  console.log('✅ Details loaded:', data);
  renderNodeDetails(data.data);
});

// Progress updates
eventSource.addEventListener('progress', (e) => {
  const data = JSON.parse(e.data);
  console.log(`⏳ ${data.message}`);
  updateProgressBar(data.layer);
});

// Error handling
eventSource.addEventListener('error', (e) => {
  const data = JSON.parse(e.data);
  console.error('❌ Error:', data.message);
  if (data.canRetry) {
    // EventSource will auto-reconnect
  }
});

// Completion
eventSource.addEventListener('stream-complete', (e) => {
  const data = JSON.parse(e.data);
  console.log(`🎉 Complete! Delivered ${data.layersDelivered} layers`);
  eventSource.close(); // Close connection
});
```

### Node.js Client

```javascript
const EventSource = require('eventsource');

const es = new EventSource('http://localhost:3000/api/nodes/146:4867/stream');

const layers = {};

es.addEventListener('layer-0', (e) => {
  layers.designSystem = JSON.parse(e.data).data;
});

es.addEventListener('layer-1', (e) => {
  layers.screenshot = JSON.parse(e.data).data;
});

es.addEventListener('layer-2', (e) => {
  layers.structure = JSON.parse(e.data).data;
});

es.addEventListener('layer-3', (e) => {
  layers.details = JSON.parse(e.data).data;
});

es.addEventListener('stream-complete', (e) => {
  console.log('All layers received:', layers);
  es.close();
});

es.addEventListener('error', (error) => {
  console.error('Connection error:', error);
});
```

### React Component (Progressive UI)

```javascript
import { useEffect, useState } from 'react';

function NodeAnalyzer({ nodeId }) {
  const [designSystem, setDesignSystem] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [structure, setStructure] = useState(null);
  const [details, setDetails] = useState(null);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    const es = new EventSource(`/api/nodes/${nodeId}/stream`);

    es.addEventListener('layer-0', (e) => {
      setDesignSystem(JSON.parse(e.data).data);
    });

    es.addEventListener('layer-1', (e) => {
      setScreenshot(JSON.parse(e.data).data);
    });

    es.addEventListener('layer-2', (e) => {
      setStructure(JSON.parse(e.data).data);
    });

    es.addEventListener('layer-3', (e) => {
      setDetails(JSON.parse(e.data).data);
    });

    es.addEventListener('progress', (e) => {
      setProgress(JSON.parse(e.data).message);
    });

    es.addEventListener('stream-complete', () => {
      setProgress('Complete!');
      es.close();
    });

    return () => es.close();
  }, [nodeId]);

  return (
    <div>
      <div className="progress">{progress}</div>

      {designSystem && (
        <DesignSystemPanel data={designSystem} />
      )}

      {screenshot && (
        <ScreenshotPanel url={screenshot.url} />
      )}

      {structure && (
        <ComponentMap data={structure.node} />
      )}

      {details && (
        <NodeDetailsPanel data={details} />
      )}
    </div>
  );
}
```

**Visual Result:**
```
[ Loading... ]
↓ 2s
[ Design System Panel ]
[ Loading... ]
↓ 3s
[ Design System Panel ]
[ Screenshot Panel ]
[ Loading... ]
↓ 4s
[ Design System Panel ]
[ Screenshot Panel ]
[ Component Map Panel ]
[ Loading... ]
↓ 5s
[ Design System Panel ]
[ Screenshot Panel ]
[ Component Map Panel ]
[ Node Details Panel ]
✅ Complete!
```

---

## Advanced Features

### 1. Resume Capability (Event IDs)

SSE supports `id` field for resuming interrupted streams:

```javascript
// Server: Send event IDs
res.write(`id: ${eventCounter}\n`);
res.write(`event: layer-1\n`);
res.write(`data: {...}\n\n`);

// Client: Resume from last event
const es = new EventSource('/api/nodes/146:4867/stream', {
  headers: { 'Last-Event-ID': '2' } // Resume from event 3
});
```

### 2. Selective Layer Streaming

```javascript
// Only get screenshot and details (skip structure)
GET /api/nodes/146:4867/stream?layers=1,3

event: layer-1
data: {...}

event: layer-3
data: {...}

event: stream-complete
data: {"layersDelivered":2}
```

### 3. Multi-Node Streaming

```javascript
// Stream multiple nodes in parallel
GET /api/nodes/stream?ids=146:4867,146:4868,146:4869

event: node-start
data: {"nodeId":"146:4867"}

event: layer-1
data: {"nodeId":"146:4867","data":{...}}

event: layer-2
data: {"nodeId":"146:4867","data":{...}}

event: node-complete
data: {"nodeId":"146:4867"}

event: node-start
data: {"nodeId":"146:4868"}

// ... repeat for other nodes
```

### 4. Real-Time Updates (File Watching)

```javascript
// Keep connection open, send updates when Figma file changes
GET /api/nodes/146:4867/watch

event: initial
data: {"details":{...}}

// ... time passes, user edits in Figma ...

event: update
data: {"details":{...},"changed":["fills","dimensions"]}

event: update
data: {"details":{...},"changed":["children"]}
```

---

## SSE vs REST vs WebSocket

| Feature | REST | SSE | WebSocket |
|---------|------|-----|-----------|
| **Direction** | Request → Response | Server → Client | Bidirectional |
| **Connection** | One per request | Long-lived | Long-lived |
| **Protocol** | HTTP | HTTP | WS (upgrade) |
| **Progressive** | ❌ Wait for all | ✅ Stream data | ✅ Stream data |
| **Reconnect** | Manual | ✅ Automatic | Manual |
| **Browser Support** | ✅ Universal | ✅ Native | ✅ Native |
| **Complexity** | ⭐ Simple | ⭐⭐ Medium | ⭐⭐⭐ Complex |
| **Caching** | ✅ HTTP caching | ❌ No caching | ❌ No caching |
| **Use Case** | Single response | Progressive data | Real-time chat |

**For Progressive Disclosure:**
- ✅ SSE wins: Perfect for streaming layers incrementally
- REST fallback: Still useful for cached Layer 0
- WebSocket overkill: Don't need bidirectional

---

## Hybrid Architecture: SSE + REST

**Best of both worlds:**

```javascript
// Layer 0: Use REST (cached)
GET /api/design-system
Cache-Control: max-age=3600

// Layers 1-3: Use SSE (streaming)
GET /api/nodes/:nodeId/stream?layers=1,2,3
Content-Type: text/event-stream

// Individual layers: Use REST (when needed)
GET /api/nodes/:nodeId/details
Cache-Control: no-cache
```

**Why Hybrid:**
1. Layer 0 rarely changes → cache with REST
2. Layers 1-3 benefit from progressive loading → stream with SSE
3. Sometimes you only need one layer → REST is simpler
4. Best developer experience

---

## Implementation Comparison

### Pure REST (Current)
```bash
# 3 separate requests
curl /api/design-system
curl /api/nodes/146:4867/screenshot
curl /api/nodes/146:4867/details
```

### Pure SSE
```bash
# 1 request, progressive responses
curl -N /api/nodes/146:4867/stream
# (-N = no buffering, see data as it arrives)
```

### Hybrid (Recommended)
```bash
# Cached context
curl /api/design-system

# Stream the rest
curl -N /api/nodes/146:4867/stream?layers=1,2,3
```

---

## MCP Server Parallels

**MCP Server (Tool Execution):**
```
1. Client requests tool execution
2. Server streams progress events
3. Server streams partial results
4. Server streams final result
5. Connection closes
```

**Our Progressive Disclosure SSE:**
```
1. Client requests node analysis
2. Server streams Layer 0 (design system)
3. Server streams Layer 1 (screenshot)
4. Server streams Layer 2 (structure)
5. Server streams Layer 3 (details)
6. Connection closes
```

**Shared Pattern:**
- ✅ Long-running operations
- ✅ Multiple stages/phases
- ✅ Progressive results
- ✅ Better UX (show early results)

---

## Performance Benefits

### Perceived Performance

**Without SSE (Traditional REST):**
```
User experience:
[Loading spinner for 5 seconds]
[Everything appears at once]

Time to first paint: 5s
Time to interactive: 5s
```

**With SSE:**
```
User experience:
[Loading... 2s] → Design tokens appear
[Loading... 1s] → Screenshot appears
[Loading... 1s] → Component map appears
[Loading... 1s] → Details appear

Time to first paint: 2s  ← 60% faster!
Time to interactive: 2s  ← User can start exploring immediately
```

### Real Performance

```javascript
// Benchmark results (simulated)

REST Sequential (1 request, wait for all):
├─ Layer 0: 2000ms
├─ Layer 1: 1000ms
├─ Layer 2: 1000ms
└─ Layer 3: 1000ms
Total: 5000ms (user sees nothing until 5000ms)

SSE Streaming (1 request, progressive):
├─ Layer 0: 2000ms → USER SEES AT 2000ms
├─ Layer 1: 1000ms → USER SEES AT 3000ms
├─ Layer 2: 1000ms → USER SEES AT 4000ms
└─ Layer 3: 1000ms → USER SEES AT 5000ms
Total: 5000ms (user sees first content at 2000ms!)

REST Parallel (4 requests):
├─ All layers: max(2000, 1000, 1000, 1000) = 2000ms
└─ But: No progressive disclosure, cache issues, 4 connections
```

---

## Recommendation

**Build SSE-First with REST Fallback:**

```javascript
// Primary: SSE streaming endpoint
GET /api/nodes/:nodeId/stream

// Fallback: Individual REST endpoints
GET /api/design-system
GET /api/nodes/:nodeId/screenshot
GET /api/nodes/:nodeId/structure
GET /api/nodes/:nodeId/details
```

**Why:**
1. ✅ Progressive disclosure matches SSE perfectly
2. ✅ Better UX (immediate feedback)
3. ✅ MCP-proven pattern
4. ✅ REST available when SSE isn't needed
5. ✅ Future-proof (can add WebSocket later)

---

## Next Steps

1. **Validate SSE approach** - Does this match your vision?
2. **Build SSE MVP** - Single `/stream` endpoint with 4 layers
3. **Test with real UI** - React component showing progressive loading
4. **Add REST fallbacks** - Individual endpoints for each layer
5. **Optimize** - Caching, compression, parallel fetching

**Ready to build the SSE server?**

# Figma AI Agent Bridge

A bidirectional communication system that enables AI agents (like Claude Code) to execute Figma Plugin API commands remotely via WebSocket.

## Architecture

```
AI Agent (Claude Code/GPT/Custom)
    ↓ (generates Plugin API scripts)
WebSocket Server (localhost:8080)
    ↓ (routes via WebSocket)
Figma Plugin UI (iframe)
    ↓ (postMessage)
Figma Main Thread (Plugin API access)
```

## Components

- **figma-plugin/** - Figma plugin (TypeScript)
- **websocket-server/** - Node.js WebSocket server
- **ai-agent/** - High-level wrapper for AI integration

## Quick Start

### 1. Start WebSocket Server

```bash
cd websocket-server
npm install
npm start
```

You should see:
```
╔════════════════════════════════════════╗
║   Figma AI Bridge WebSocket Server    ║
╚════════════════════════════════════════╝

Server running on ws://localhost:8080
Waiting for connections...
```

### 2. Build Figma Plugin

```bash
cd figma-plugin
npm install
npm run build
```

### 3. Load Plugin in Figma

1. Open **Figma Desktop App** (NOT web version)
2. Create or open any design file
3. **Plugins → Development → Import plugin from manifest...**
4. Select `figma-plugin/manifest.json`
5. **Plugins → Development → AI Agent Bridge**

Plugin UI should show **"Connected to AI Agent"** in green.

### 4. Test with AI Agent

```bash
cd ai-agent
node examples.js
```

This will:
- Create a button component
- Create a variable collection
- Create a custom frame
- Query current Figma context

## Usage from AI Agent

### Basic Script Execution

```javascript
const { executeInFigma } = require('./websocket-server/server');

// Create a rectangle
await executeInFigma(`
  const rect = figma.createRectangle();
  rect.resize(200, 100);
  rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
  figma.currentPage.appendChild(rect);
  return { id: rect.id };
`);
```

### Get Current Context

```javascript
const { getFigmaContext } = require('./websocket-server/server');

const context = await getFigmaContext();
console.log('Current page:', context.context.currentPage.name);
console.log('Selection:', context.context.selection);
```

### Using High-Level Agent API

```javascript
const FigmaAIAgent = require('./ai-agent/agent');
const agent = new FigmaAIAgent();

// Check connection
await agent.checkConnection();

// Get context
const context = await agent.getContext();

// Create button
const button = await agent.createButton('Submit', { r: 0.2, g: 0.4, b: 1.0 });

// Create variable collection
const collection = await agent.createVariableCollection('Colors', [
  { name: 'primary', type: 'COLOR', value: { r: 0.2, g: 0.4, b: 1.0, a: 1 } },
  { name: 'secondary', type: 'COLOR', value: { r: 1.0, g: 0.6, b: 0.0, a: 1 } }
]);

// Execute custom script
await agent.execute(`
  const component = figma.createComponent();
  component.name = "My Component";
  return { id: component.id };
`);
```

## API Reference

### Server API (websocket-server/server.js)

#### `executeInFigma(script)`
Execute Plugin API script in Figma.
- **Parameters:** `script` - JavaScript code with access to `figma` object
- **Returns:** Promise with execution result

#### `getFigmaContext()`
Get current Figma file state.
- **Returns:** Promise with context object (page, selection, variables, etc.)

#### `notifyFigma(message, timeout)`
Show notification in Figma UI.
- **Parameters:** `message`, `timeout` (default: 3000ms)

#### `isConnected()`
Check if Figma plugin is connected.
- **Returns:** Boolean

#### `getStatus()`
Get server status information.
- **Returns:** Object with connection status, pending requests, uptime

### FigmaAIAgent Class (ai-agent/agent.js)

#### `checkConnection()`
Verify connection to Figma plugin.

#### `getContext()`
Get current Figma context.

#### `execute(script)`
Execute raw Plugin API script.

#### `createComponent(name, width, height)`
Create a component.

#### `createButton(text, bgColor)`
Create a button component with text.

#### `createVariableCollection(name, variables)`
Create a variable collection with variables.

#### `getSelection()`
Get currently selected nodes.

## Requirements

- **Figma Desktop App** (web version NOT supported)
- **Node.js** 18+ and npm
- **TypeScript** (installed via npm)

## Troubleshooting

### Plugin shows "Disconnected"

1. Ensure WebSocket server is running: `npm start` in `websocket-server/`
2. Check port 8080 is not in use
3. Verify `manifest.json` has correct `networkAccess` configuration

### Script execution errors

1. Check syntax in generated script
2. Ensure async operations use `await`
3. Load required fonts: `await figma.loadFontAsync({ family: "Inter", style: "Regular" })`
4. Check Plugin API compatibility: https://developers.figma.com/docs/plugins/api/

### "Figma plugin not connected" error

1. Open plugin in Figma: Plugins → Development → AI Agent Bridge
2. Ensure design file is open (not just Figma app)
3. Check network connection between plugin and server

## Development

### Plugin Development

```bash
cd figma-plugin
npm run watch  # Auto-recompile on changes
```

### Server Development

```bash
cd websocket-server
npm start  # Restart manually after changes
```

## Security Considerations

⚠️ **Warning:** This system executes arbitrary JavaScript with full Plugin API access.

- Only accept scripts from trusted AI agents
- No sandboxing beyond Figma's plugin sandbox
- Can modify/delete entire design files
- Localhost-only (not exposed to internet)

## Official Documentation

- Figma Plugin API: https://developers.figma.com/docs/plugins/api/figma/
- Plugin Quickstart: https://developers.figma.com/docs/plugins/plugin-quickstart-guide/
- Variables API: https://developers.figma.com/docs/plugins/api/figma-variables/
- How Plugins Run: https://developers.figma.com/docs/plugins/how-plugins-run/

## License

MIT

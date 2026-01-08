#!/usr/bin/env node
/**
 * Debug Wrapper for MCP Server
 * Logs all stdin/stdout/stderr to files for debugging
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEBUG_DIR = path.join(__dirname, 'debug-logs');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Create debug directory
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR);
}

const stdinLog = fs.createWriteStream(path.join(DEBUG_DIR, `${TIMESTAMP}-stdin.log`));
const stdoutLog = fs.createWriteStream(path.join(DEBUG_DIR, `${TIMESTAMP}-stdout.log`));
const stderrLog = fs.createWriteStream(path.join(DEBUG_DIR, `${TIMESTAMP}-stderr.log`));

process.stderr.write(`[DEBUG] Starting server with logging to ${DEBUG_DIR}\n`);
process.stderr.write(`[DEBUG] Stdin log: ${TIMESTAMP}-stdin.log\n`);
process.stderr.write(`[DEBUG] Stdout log: ${TIMESTAMP}-stdout.log\n`);
process.stderr.write(`[DEBUG] Stderr log: ${TIMESTAMP}-stderr.log\n\n`);

// Start the actual server
const serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Log and forward stdin
process.stdin.on('data', (data) => {
  const timestamp = new Date().toISOString();
  stdinLog.write(`[${timestamp}] ${data}\n`);
  process.stderr.write(`[DEBUG STDIN] ${data}\n`);
  serverProcess.stdin.write(data);
});

process.stdin.on('end', () => {
  stdinLog.write('[EOF]\n');
  serverProcess.stdin.end();
});

// Log and forward stdout
serverProcess.stdout.on('data', (data) => {
  const timestamp = new Date().toISOString();
  stdoutLog.write(`[${timestamp}] ${data}\n`);
  process.stderr.write(`[DEBUG STDOUT] ${data}\n`);
  process.stdout.write(data);
});

// Log stderr (but don't forward to stdout)
serverProcess.stderr.on('data', (data) => {
  const timestamp = new Date().toISOString();
  stderrLog.write(`[${timestamp}] ${data}\n`);
  process.stderr.write(data); // Forward to our stderr
});

// Handle server exit
serverProcess.on('exit', (code, signal) => {
  process.stderr.write(`[DEBUG] Server exited with code ${code}, signal ${signal}\n`);
  stdinLog.end();
  stdoutLog.end();
  stderrLog.end();
  process.exit(code || 0);
});

// Handle errors
serverProcess.on('error', (error) => {
  process.stderr.write(`[DEBUG] Server error: ${error.message}\n`);
  stderrLog.write(`[ERROR] ${error.stack}\n`);
  process.exit(1);
});

// Cleanup on exit
process.on('exit', () => {
  stdinLog.end();
  stdoutLog.end();
  stderrLog.end();
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  serverProcess.kill('SIGINT');
  process.exit(0);
});

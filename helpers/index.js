/**
 * Figmatic Library
 *
 * Main entry point for all Figmatic helper modules
 * Provides functional utilities for common Figma automation tasks
 *
 * @example
 * const figmatic = require('./lib');
 *
 * figmatic.runScript('My Script', async (api) => {
 *   const varCache = figmatic.createVariableCache();
 *   const spacing4 = await varCache.get('Spacing/spacing-4', api.getAllVariables);
 *   // ...
 * });
 */

const { runScript } = require('./script-runner');
const { createVariableCache, getVariable, getVariables } = require('./variables');
const {
  bindCornerRadii,
  bindPadding,
  bindPaddingHorizontal,
  bindPaddingVertical,
  bindSize,
  bindTextColor,
  bindFillColor,
  bindStrokeColor
} = require('./bindings');
const {
  findComponent,
  findComponents,
  findTextStyle,
  findTextStyles,
  createComponentInstance
} = require('./components');
const {
  createVerticalFrame,
  createHorizontalFrame,
  createContentFrame,
  createHeaderFrame,
  createCardFrame
} = require('./autolayout');
const {
  createTextWithStyle,
  createTextWithFont,
  updateText,
  updateInstanceText
} = require('./text');
const {
  // Layer 1: Property extractors
  extractBasicProps,
  extractPosition,
  extractPadding,
  extractLayoutProps,
  extractFills,
  extractStrokes,
  extractEffects,
  extractTextProps,
  extractCornerRadius,
  colorToRgb,
  extractBoundVariable,
  // Layer 2: Binding resolvers
  extractVariableIds,
  resolveVariableIds,
  enrichWithVariableNames,
  // Layer 3: Node analyzers
  analyzeGenericNode,
  analyzeFrame,
  analyzeText,
  analyzeRectangle,
  analyzeEllipse,
  analyzeInstance,
  analyzeGroup,
  analyzeNode,
  // Layer 4: Pattern detectors
  hasGlowPattern,
  hasShadowPattern,
  analyzeAutoLayoutPattern,
  analyzeBindingCoverage,
  // Layer 5: Unified API
  createAnalysisScript,
  analyze
} = require('./analysis');
const {
  createScreenshotHelper
} = require('./screenshot');

module.exports = {
  // Script runner
  runScript,

  // Variables
  createVariableCache,
  getVariable,
  getVariables,

  // Bindings
  bindCornerRadii,
  bindPadding,
  bindPaddingHorizontal,
  bindPaddingVertical,
  bindSize,
  bindTextColor,
  bindFillColor,
  bindStrokeColor,

  // Components
  findComponent,
  findComponents,
  findTextStyle,
  findTextStyles,
  createComponentInstance,

  // Auto-layout
  createVerticalFrame,
  createHorizontalFrame,
  createContentFrame,
  createHeaderFrame,
  createCardFrame,

  // Text
  createTextWithStyle,
  createTextWithFont,
  updateText,
  updateInstanceText,

  // Analysis - Layer 1: Property extractors
  extractBasicProps,
  extractPosition,
  extractPadding,
  extractLayoutProps,
  extractFills,
  extractStrokes,
  extractEffects,
  extractTextProps,
  extractCornerRadius,
  colorToRgb,
  extractBoundVariable,

  // Analysis - Layer 2: Binding resolvers
  extractVariableIds,
  resolveVariableIds,
  enrichWithVariableNames,

  // Analysis - Layer 3: Node analyzers
  analyzeGenericNode,
  analyzeFrame,
  analyzeText,
  analyzeRectangle,
  analyzeEllipse,
  analyzeInstance,
  analyzeGroup,
  analyzeNode,

  // Analysis - Layer 4: Pattern detectors
  hasGlowPattern,
  hasShadowPattern,
  analyzeAutoLayoutPattern,
  analyzeBindingCoverage,

  // Analysis - Layer 5: Unified API
  createAnalysisScript,
  analyze,

  // Screenshots
  createScreenshotHelper
};

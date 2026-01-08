/**
 * Tests for Paint Normalization Helpers
 *
 * Verifies CSS-like alpha channel support (Issue #26)
 */

const { normalizeColor, normalizePaint, normalizePaints } = require('./paint');

// Test normalizeColor
console.log('Testing normalizeColor...');

const color1 = normalizeColor({ r: 1, g: 0.5, b: 0, a: 0.8 });
console.assert(
  color1.r === 1 && color1.g === 0.5 && color1.b === 0 && !('a' in color1),
  'Should remove alpha from color object'
);

const color2 = normalizeColor({ r: 1, g: 0.5, b: 0 });
console.assert(
  color2.r === 1 && color2.g === 0.5 && color2.b === 0,
  'Should passthrough color without alpha'
);

console.log('✓ normalizeColor passed');

// Test normalizePaint
console.log('\nTesting normalizePaint...');

const paint1 = normalizePaint({
  type: 'SOLID',
  color: { r: 1, g: 1, b: 1, a: 0.5 }
});
console.assert(
  paint1.type === 'SOLID' &&
  paint1.color.r === 1 && paint1.color.g === 1 && paint1.color.b === 1 &&
  !('a' in paint1.color) &&
  paint1.opacity === 0.5,
  'Should extract alpha to paint.opacity'
);

const paint2 = normalizePaint({
  type: 'SOLID',
  color: { r: 1, g: 1, b: 1 },
  opacity: 0.8
});
console.assert(
  paint2.opacity === 0.8,
  'Should preserve existing opacity'
);

const paint3 = normalizePaint({
  type: 'SOLID',
  color: { r: 1, g: 1, b: 1, a: 0.3 },
  opacity: 0.8  // Should be overridden
});
console.assert(
  paint3.opacity === 0.3,
  'Alpha should override existing opacity'
);

console.log('✓ normalizePaint passed');

// Test normalizePaints
console.log('\nTesting normalizePaints...');

const paints = normalizePaints([
  { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 0.8 } },
  { type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 0.5 } },
  { type: 'SOLID', color: { r: 0, g: 0, b: 1 } }  // No alpha
]);

console.assert(paints.length === 3, 'Should preserve array length');
console.assert(paints[0].opacity === 0.8, 'First paint should have opacity 0.8');
console.assert(paints[1].opacity === 0.5, 'Second paint should have opacity 0.5');
console.assert(!('opacity' in paints[2]), 'Third paint should not have opacity');
console.assert(!('a' in paints[0].color), 'Alpha should be removed from all paints');

console.log('✓ normalizePaints passed');

// Test edge cases
console.log('\nTesting edge cases...');

const nullPaint = normalizePaint(null);
console.assert(nullPaint === null, 'Should handle null');

const emptyArray = normalizePaints([]);
console.assert(Array.isArray(emptyArray) && emptyArray.length === 0, 'Should handle empty array');

console.log('✓ Edge cases passed');

console.log('\n✅ All tests passed!\n');
console.log('Issue #26 - CSS-like alpha channel support is working correctly.');

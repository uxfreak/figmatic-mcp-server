/**
 * Complete Design System Audit
 *
 * Run this script at the start of any design system work to get complete context.
 *
 * Usage: node audit-design-system.js
 */

const { runScript } = require('../../lib');

runScript("Design System Audit", async (api) => {
  const r = await api.executeInFigma(`
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const allVars = await figma.variables.getLocalVariablesAsync();
    const textStyles = await figma.getLocalTextStylesAsync();
    const paintStyles = await figma.getLocalPaintStylesAsync();
    const effectStyles = await figma.getLocalEffectStylesAsync();

    // Helper to format variable value
    function formatValue(value, type) {
      if (value.type === "VARIABLE_ALIAS") {
        const aliasVar = allVars.find(v => v.id === value.id);
        return { alias: aliasVar ? aliasVar.name : value.id };
      }

      if (type === "COLOR") {
        const r = Math.round(value.r * 255);
        const g = Math.round(value.g * 255);
        const b = Math.round(value.b * 255);
        const a = value.a !== undefined ? value.a : 1;
        return a < 1 ? \`rgba(\${r},\${g},\${b},\${a})\` : \`rgb(\${r},\${g},\${b})\`;
      }

      if (type === "FLOAT") return value;

      return value;
    }

    const varsByCollection = {};
    collections.forEach(col => {
      const vars = allVars.filter(v => v.variableCollectionId === col.id);
      varsByCollection[col.name] = {
        modes: col.modes.map(m => ({ name: m.name, modeId: m.modeId })),
        variables: vars.map(v => {
          const valuesByMode = {};
          Object.entries(v.valuesByMode).forEach(([modeId, value]) => {
            const mode = col.modes.find(m => m.modeId === modeId);
            const modeName = mode ? mode.name : modeId;
            valuesByMode[modeName] = formatValue(value, v.resolvedType);
          });

          return {
            name: v.name,
            type: v.resolvedType,
            values: valuesByMode
          };
        })
      };
    });

    return {
      collections: varsByCollection,
      textStyles: textStyles.map(s => ({
        name: s.name,
        id: s.id,
        fontName: s.fontName,
        fontSize: s.fontSize,
        letterSpacing: s.letterSpacing,
        lineHeight: s.lineHeight,
        paragraphIndent: s.paragraphIndent,
        paragraphSpacing: s.paragraphSpacing,
        textCase: s.textCase,
        textDecoration: s.textDecoration
      })),
      paintStyles: paintStyles.map(s => ({
        name: s.name,
        id: s.id,
        paints: s.paints,
        description: s.description
      })),
      effectStyles: effectStyles.map(s => ({
        name: s.name,
        id: s.id,
        effects: s.effects,
        description: s.description
      }))
    };
  `);

  console.log("\n══════════════════════════════════════");
  console.log("📊 DESIGN SYSTEM AUDIT");
  console.log("══════════════════════════════════════\n");

  // Variables
  console.log("📦 VARIABLES\n");
  Object.entries(r.result.collections).forEach(([name, col]) => {
    const modeNames = col.modes.map(m => m.name).join(", ");
    console.log(`  ${name} (${modeNames}) - ${col.variables.length} vars\n`);

    // Group by prefix and show samples
    const byPrefix = {};
    col.variables.forEach(v => {
      const prefix = v.name.split("/")[0];
      if (!byPrefix[prefix]) byPrefix[prefix] = [];
      byPrefix[prefix].push(v);
    });

    Object.entries(byPrefix).forEach(([prefix, vars]) => {
      console.log(`    ${prefix}/: ${vars.length} variables\n`);

      // Show ALL variables with values
      vars.forEach(v => {
        const shortName = v.name.split("/").slice(1).join("/");
        const modeValues = Object.entries(v.values).map(([mode, val]) => {
          if (val.alias) return `${mode}: → ${val.alias}`;
          return `${mode}: ${val}`;
        }).join(" | ");
        console.log(`      ${shortName}: ${modeValues}`);
      });
      console.log("");
    });
  });

  // Text Styles
  console.log(`\n✍️  TEXT STYLES (${r.result.textStyles.length})\n`);
  r.result.textStyles.forEach(s => {
    const lh = s.lineHeight.unit === "AUTO" ? "Auto" :
               s.lineHeight.unit === "PERCENT" ? Math.round(s.lineHeight.value) + "%" :
               s.lineHeight.value;
    const weight = s.fontName.style || "Regular";
    console.log(`  ${s.name}`);
    console.log(`    Font: ${s.fontName.family} ${weight} ${s.fontSize}px`);
    console.log(`    Line height: ${lh}`);
    if (s.letterSpacing && s.letterSpacing.value !== 0) {
      console.log(`    Letter spacing: ${JSON.stringify(s.letterSpacing)}`);
    }
    console.log("");
  });

  // Paint Styles
  console.log(`\n🎨 PAINT STYLES (${r.result.paintStyles.length})\n`);
  if (r.result.paintStyles.length === 0) {
    console.log("  (none)");
  } else {
    r.result.paintStyles.forEach(s => {
      console.log(`  ${s.name}`);
      if (s.description) console.log(`    Description: ${s.description}`);

      s.paints.forEach((p, i) => {
        console.log(`    Paint ${i + 1}: ${p.type}`);
        console.log(`      Opacity: ${Math.round(p.opacity * 100)}%`);
        console.log(`      Blend Mode: ${p.blendMode}`);
        console.log(`      Visible: ${p.visible}`);

        if (p.type === 'SOLID' && p.color) {
          const r = Math.round(p.color.r * 255);
          const g = Math.round(p.color.g * 255);
          const b = Math.round(p.color.b * 255);
          const a = p.color.a !== undefined ? p.color.a : 1;
          console.log(`      Color: rgba(${r}, ${g}, ${b}, ${a})`);
        }

        if (p.type.includes('GRADIENT') && p.gradientStops) {
          console.log(`      Gradient: ${p.gradientStops.length}-stop gradient`);
          p.gradientStops.forEach((stop, si) => {
            const r = Math.round(stop.color.r * 255);
            const g = Math.round(stop.color.g * 255);
            const b = Math.round(stop.color.b * 255);
            const a = stop.color.a !== undefined ? stop.color.a : 1;
            const pos = Math.round(stop.position * 100);
            const isPeak = a === 1 ? ' ← peak' : '';
            console.log(`        → ${pos.toString().padStart(3)}%: rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})${isPeak}`);
          });
        }
      });
      console.log("");
    });
  }

  // Effect Styles
  console.log(`\n✨ EFFECT STYLES (${r.result.effectStyles.length})\n`);
  if (r.result.effectStyles.length === 0) {
    console.log("  (none)");
  } else {
    r.result.effectStyles.forEach(s => {
      console.log(`  ${s.name}`);
      if (s.description) console.log(`    Description: ${s.description}`);

      s.effects.forEach((e, i) => {
        console.log(`    Effect ${i + 1}: ${e.type}`);
        console.log(`      Visible: ${e.visible}`);

        if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
          console.log(`      Offset: x=${e.offset?.x || 0}px, y=${e.offset?.y || 0}px`);
          console.log(`      Blur Radius: ${e.radius || 0}px`);
          if (e.spread) console.log(`      Spread: ${e.spread}px`);
          if (e.color) {
            const r = Math.round(e.color.r * 255);
            const g = Math.round(e.color.g * 255);
            const b = Math.round(e.color.b * 255);
            const a = e.color.a !== undefined ? e.color.a : 1;
            console.log(`      Color: rgba(${r}, ${g}, ${b}, ${a})`);
          }
        }

        if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
          console.log(`      Blur Radius: ${e.radius || 0}px`);
        }
      });
      console.log("");
    });
  }

  console.log("\n══════════════════════════════════════\n");
});

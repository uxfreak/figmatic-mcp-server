// Inspect all styles and variables in Figma
const {
  startServer,
  getTextStyles,
  getPaintStyles,
  getEffectStyles,
  getAllVariables
} = require('./websocket-server/server');

console.log('🔍 Inspecting Figma Styles & Variables\n');

startServer();

setTimeout(async () => {
  console.log('\n📊 Fetching all styles and variables...\n');

  try {
    // ============================================
    // TEXT STYLES
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 TEXT STYLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const textStyles = await getTextStyles();

    if (textStyles.length === 0) {
      console.log('   No text styles found.\n');
    } else {
      console.log(`   Found ${textStyles.length} text styles:\n`);
      textStyles.forEach((style, index) => {
        console.log(`   ${index + 1}. "${style.name}"`);
        console.log(`      ID: ${style.id}`);
        console.log(`      Font: ${style.fontName.family} ${style.fontName.style}`);
        console.log(`      Size: ${style.fontSize}px`);
        if (style.lineHeight?.unit) {
          console.log(`      Line Height: ${style.lineHeight.value}${style.lineHeight.unit === 'PERCENT' ? '%' : 'px'}`);
        }
        if (style.letterSpacing?.value !== 0) {
          console.log(`      Letter Spacing: ${style.letterSpacing.value}${style.letterSpacing.unit === 'PERCENT' ? '%' : 'px'}`);
        }
        if (style.description) {
          console.log(`      Description: ${style.description}`);
        }
        console.log('');
      });
    }

    // ============================================
    // PAINT STYLES
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎨 PAINT STYLES (Colors/Fills/Strokes)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const paintStyles = await getPaintStyles();

    if (paintStyles.length === 0) {
      console.log('   No paint styles found.\n');
    } else {
      console.log(`   Found ${paintStyles.length} paint styles:\n`);
      paintStyles.forEach((style, index) => {
        console.log(`   ${index + 1}. "${style.name}"`);
        console.log(`      ID: ${style.id}`);

        style.paints.forEach((paint, pIndex) => {
          console.log(`      Paint ${pIndex + 1}: ${paint.type}`);

          if (paint.type === 'SOLID' && paint.color) {
            const r = Math.round(paint.color.r * 255);
            const g = Math.round(paint.color.g * 255);
            const b = Math.round(paint.color.b * 255);
            console.log(`         Color: rgb(${r}, ${g}, ${b})`);
            if (paint.opacity !== undefined && paint.opacity !== 1) {
              console.log(`         Opacity: ${Math.round(paint.opacity * 100)}%`);
            }
          } else if (paint.type.includes('GRADIENT')) {
            console.log(`         Gradient stops: ${paint.gradientStops?.length || 0}`);
          }
        });

        if (style.description) {
          console.log(`      Description: ${style.description}`);
        }
        console.log('');
      });
    }

    // ============================================
    // EFFECT STYLES
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ EFFECT STYLES (Shadows/Blurs)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const effectStyles = await getEffectStyles();

    if (effectStyles.length === 0) {
      console.log('   No effect styles found.\n');
    } else {
      console.log(`   Found ${effectStyles.length} effect styles:\n`);
      effectStyles.forEach((style, index) => {
        console.log(`   ${index + 1}. "${style.name}"`);
        console.log(`      ID: ${style.id}`);

        style.effects.forEach((effect, eIndex) => {
          console.log(`      Effect ${eIndex + 1}: ${effect.type}`);

          if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
            console.log(`         Offset: x=${effect.offset.x}, y=${effect.offset.y}`);
            console.log(`         Radius: ${effect.radius}px`);
            if (effect.spread !== undefined && effect.spread !== 0) {
              console.log(`         Spread: ${effect.spread}px`);
            }
            if (effect.color) {
              const r = Math.round(effect.color.r * 255);
              const g = Math.round(effect.color.g * 255);
              const b = Math.round(effect.color.b * 255);
              const a = effect.color.a !== undefined ? effect.color.a : 1;
              console.log(`         Color: rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`);
            }
            console.log(`         Visible: ${effect.visible}`);
          } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
            console.log(`         Radius: ${effect.radius}px`);
          }
        });

        if (style.description) {
          console.log(`      Description: ${style.description}`);
        }
        console.log('');
      });
    }

    // ============================================
    // VARIABLES
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 VARIABLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const variablesData = await getAllVariables();

    if (variablesData.collections.length === 0) {
      console.log('   No variable collections found.\n');
    } else {
      console.log(`   Found ${variablesData.collections.length} collections with ${variablesData.variables.length} total variables:\n`);

      variablesData.collections.forEach((collection, cIndex) => {
        console.log(`   📁 Collection ${cIndex + 1}: "${collection.name}"`);
        console.log(`      ID: ${collection.id}`);
        console.log(`      Modes: ${collection.modes.map(m => m.name).join(', ')}`);

        // Get variables in this collection
        const collectionVars = variablesData.variables.filter(
          v => v.variableCollectionId === collection.id
        );

        if (collectionVars.length > 0) {
          console.log(`      Variables (${collectionVars.length}):`);

          // Group by type
          const byType = {
            COLOR: collectionVars.filter(v => v.resolvedType === 'COLOR'),
            FLOAT: collectionVars.filter(v => v.resolvedType === 'FLOAT'),
            STRING: collectionVars.filter(v => v.resolvedType === 'STRING'),
            BOOLEAN: collectionVars.filter(v => v.resolvedType === 'BOOLEAN')
          };

          Object.entries(byType).forEach(([type, vars]) => {
            if (vars.length > 0) {
              console.log(`\n      ${type} (${vars.length}):`);
              vars.slice(0, 5).forEach(v => {
                console.log(`         • ${v.name}`);

                // Show first mode value as example
                const firstModeId = collection.modes[0].modeId;
                const value = v.valuesByMode[firstModeId];

                if (type === 'COLOR' && value && value.r !== undefined) {
                  const r = Math.round(value.r * 255);
                  const g = Math.round(value.g * 255);
                  const b = Math.round(value.b * 255);
                  console.log(`           ${collection.modes[0].name}: rgb(${r}, ${g}, ${b})`);
                } else if (type === 'FLOAT' && typeof value === 'number') {
                  console.log(`           ${collection.modes[0].name}: ${value}`);
                } else if (value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
                  console.log(`           ${collection.modes[0].name}: → (alias to another variable)`);
                } else if (value !== undefined) {
                  console.log(`           ${collection.modes[0].name}: ${value}`);
                }
              });

              if (vars.length > 5) {
                console.log(`         ... and ${vars.length - 5} more`);
              }
            }
          });
        }
        console.log('');
      });
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`   Text Styles:   ${textStyles.length}`);
    console.log(`   Paint Styles:  ${paintStyles.length}`);
    console.log(`   Effect Styles: ${effectStyles.length}`);
    console.log(`   Collections:   ${variablesData.collections.length}`);
    console.log(`   Variables:     ${variablesData.variables.length}\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Inspection failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}, 10000);

console.log('⏳ Waiting for Figma plugin to connect (10 seconds)...\n');
console.log('👉 Please open Figma Desktop and run the "AI Agent Bridge" plugin\n');

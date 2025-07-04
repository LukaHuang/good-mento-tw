#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const AIToPNGConverter = require('./converter');

const program = new Command();
const converter = new AIToPNGConverter();

program
  .name('ai2png')
  .description('Convert Adobe Illustrator (.ai) files to PNG format')
  .version('1.0.0');

program
  .command('convert')
  .description('Convert a single AI file to PNG')
  .argument('<input>', 'Input AI file path')
  .argument('[output]', 'Output PNG file path (optional)')
  .option('-d, --density <number>', 'Output density/resolution (default: 300)', '300')
  .option('-q, --quality <number>', 'Output quality (default: 90)', '90')
  .action(async (input, output, options) => {
    try {
      const inputPath = path.resolve(input);
      const outputPath = output 
        ? path.resolve(output)
        : path.join(
            path.dirname(inputPath),
            path.basename(inputPath, path.extname(inputPath)) + '.png'
          );

      console.log(`Converting: ${inputPath}`);
      console.log(`Output: ${outputPath}`);
      console.log(`Density: ${options.density}dpi, Quality: ${options.quality}%`);
      console.log('Converting...\n');

      const result = await converter.convertAIToPNG(inputPath, outputPath, {
        density: parseInt(options.density),
        quality: parseInt(options.quality)
      });

      if (result.success) {
        console.log('✅ ' + result.message);
      } else {
        console.error('❌ ' + result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Convert all AI files in a directory to PNG')
  .argument '<inputDir>', 'Input directory containing AI files'
  .argument '[outputDir]', 'Output directory for PNG files (optional)'
  .option('-d, --density <number>', 'Output density/resolution (default: 300)', '300')
  .option('-q, --quality <number>', 'Output quality (default: 90)', '90')
  .action(async (inputDir, outputDir, options) => {
    try {
      const inputPath = path.resolve(inputDir);
      const outputPath = outputDir 
        ? path.resolve(outputDir)
        : path.join(inputPath, 'png_output');

      console.log(`Input directory: ${inputPath}`);
      console.log(`Output directory: ${outputPath}`);
      console.log(`Density: ${options.density}dpi, Quality: ${options.quality}%`);
      console.log('Converting batch...\n');

      const result = await converter.convertBatch(inputPath, outputPath, {
        density: parseInt(options.density),
        quality: parseInt(options.quality)
      });

      if (result.success) {
        console.log('✅ ' + result.message);
        
        result.results.forEach(r => {
          if (r.success) {
            console.log(`  ✅ ${path.basename(r.input)} → ${path.basename(r.output)}`);
          } else {
            console.log(`  ❌ ${path.basename(r.input)}: ${r.message}`);
          }
        });
      } else {
        console.error('❌ ' + result.message);
        if (result.results) {
          result.results.forEach(r => {
            if (!r.success) {
              console.error(`  ❌ ${path.basename(r.input)}: ${r.message}`);
            }
          });
        }
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('help-setup')
  .description('Show setup instructions for required dependencies')
  .action(() => {
    console.log(`
AI to PNG Converter - Setup Instructions
========================================

This tool requires either ImageMagick or Ghostscript to be installed on your system.

Option 1: ImageMagick (Recommended)
----------------------------------
macOS: brew install imagemagick
Ubuntu/Debian: sudo apt-get install imagemagick
Windows: Download from https://imagemagick.org/script/download.php

Option 2: Ghostscript
--------------------
macOS: brew install ghostscript
Ubuntu/Debian: sudo apt-get install ghostscript
Windows: Download from https://www.ghostscript.com/download/gsdnld.html

Usage Examples:
--------------
Convert single file:
  npx ai2png convert input.ai
  npx ai2png convert input.ai output.png
  npx ai2png convert input.ai --density 600 --quality 95

Convert batch:
  npx ai2png batch ./ai_files
  npx ai2png batch ./ai_files ./png_output
  npx ai2png batch ./ai_files --density 600

Installation:
------------
npm install
`);
  });

if (process.argv.length === 2) {
  program.help();
}

program.parse();
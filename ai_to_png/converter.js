const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AIToPNGConverter {
  constructor() {
    this.supportedFormats = ['.ai'];
  }

  async convertAIToPNG(inputPath, outputPath, options = {}) {
    try {
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      const inputExt = path.extname(inputPath).toLowerCase();
      if (!this.supportedFormats.includes(inputExt)) {
        throw new Error(`Unsupported file format: ${inputExt}`);
      }

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const density = options.density || 300;
      const quality = options.quality || 90;

      try {
        const magickCommand = `magick "${inputPath}" -density ${density} -quality ${quality} "${outputPath}"`;
        execSync(magickCommand, { stdio: 'pipe' });
        
        if (fs.existsSync(outputPath)) {
          return {
            success: true,
            message: `Successfully converted ${inputPath} to ${outputPath}`,
            outputPath: outputPath
          };
        } else {
          throw new Error('Conversion completed but output file not found');
        }
      } catch (magickError) {
        try {
          const gsCommand = `gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r${density} -sOutputFile="${outputPath}" "${inputPath}"`;
          execSync(gsCommand, { stdio: 'pipe' });
          
          if (fs.existsSync(outputPath)) {
            return {
              success: true,
              message: `Successfully converted ${inputPath} to ${outputPath} using Ghostscript`,
              outputPath: outputPath
            };
          } else {
            throw new Error('Conversion completed but output file not found');
          }
        } catch (gsError) {
          throw new Error(`Conversion failed. Please ensure ImageMagick or Ghostscript is installed.\nImageMagick error: ${magickError.message}\nGhostscript error: ${gsError.message}`);
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  async convertBatch(inputDir, outputDir, options = {}) {
    try {
      if (!fs.existsSync(inputDir)) {
        throw new Error(`Input directory not found: ${inputDir}`);
      }

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const files = fs.readdirSync(inputDir);
      const aiFiles = files.filter(file => 
        this.supportedFormats.includes(path.extname(file).toLowerCase())
      );

      if (aiFiles.length === 0) {
        return {
          success: false,
          message: 'No AI files found in the input directory'
        };
      }

      const results = [];
      for (const file of aiFiles) {
        const inputPath = path.join(inputDir, file);
        const outputFileName = path.basename(file, path.extname(file)) + '.png';
        const outputPath = path.join(outputDir, outputFileName);

        const result = await this.convertAIToPNG(inputPath, outputPath, options);
        results.push({
          input: inputPath,
          output: outputPath,
          ...result
        });
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: failed === 0,
        message: `Batch conversion completed: ${successful} successful, ${failed} failed`,
        results: results
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }
}

module.exports = AIToPNGConverter;
# AI to PNG Converter

一個將 Adobe Illustrator (.ai) 檔案轉換為 PNG 格式的 JavaScript 工具。

## 功能特色

- 單個檔案轉換
- 批量轉換整個資料夾
- 自訂解析度和品質設定
- 命令列介面
- 支援 ImageMagick 和 Ghostscript

## 安裝依賴

首先需要安裝系統依賴（二選一）：

### 選項 1: ImageMagick (推薦)
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick

# Windows
# 從 https://imagemagick.org/script/download.php 下載安裝
```

### 選項 2: Ghostscript
```bash
# macOS
brew install ghostscript

# Ubuntu/Debian
sudo apt-get install ghostscript

# Windows
# 從 https://www.ghostscript.com/download/gsdnld.html 下載安裝
```

然後安裝 Node.js 依賴：
```bash
npm install
```

## 使用方法

### 命令列介面

#### 轉換單個檔案
```bash
# 基本轉換
node cli.js convert input.ai

# 指定輸出檔案
node cli.js convert input.ai output.png

# 自訂設定
node cli.js convert input.ai --density 600 --quality 95
```

#### 批量轉換
```bash
# 轉換資料夾中所有 AI 檔案
node cli.js batch ./ai_files

# 指定輸出資料夾
node cli.js batch ./ai_files ./png_output

# 自訂設定
node cli.js batch ./ai_files --density 600 --quality 95
```

#### 查看幫助
```bash
node cli.js help-setup
```

### 程式化使用

```javascript
const AIToPNGConverter = require('./converter');

const converter = new AIToPNGConverter();

// 轉換單個檔案
async function convertSingle() {
  const result = await converter.convertAIToPNG(
    'input.ai', 
    'output.png',
    { density: 300, quality: 90 }
  );
  
  if (result.success) {
    console.log(result.message);
  } else {
    console.error(result.message);
  }
}

// 批量轉換
async function convertBatch() {
  const result = await converter.convertBatch(
    './ai_files',
    './png_output',
    { density: 300, quality: 90 }
  );
  
  console.log(result.message);
  result.results.forEach(r => {
    console.log(`${r.input}: ${r.success ? '成功' : r.message}`);
  });
}
```

## 參數說明

- `density`: 輸出解析度 (預設: 300 DPI)
- `quality`: 輸出品質 (預設: 90%)

## 錯誤排除

如果遇到轉換失敗，請確認：

1. 已安裝 ImageMagick 或 Ghostscript
2. 輸入檔案是有效的 AI 檔案
3. 有足夠的磁碟空間
4. 輸出目錄的寫入權限

## 授權

MIT License
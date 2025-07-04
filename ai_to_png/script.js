class AIToPNGConverter {
    constructor() {
        this.selectedFiles = [];
        this.convertedFiles = [];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const convertBtn = document.getElementById('convertBtn');
        const clearBtn = document.getElementById('clearBtn');
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        const pageMode = document.getElementById('pageMode');

        // 拖拽功能
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));
        dropZone.addEventListener('click', () => fileInput.click());

        // 檔案選擇
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // 按鈕事件
        convertBtn.addEventListener('click', this.convertFiles.bind(this));
        clearBtn.addEventListener('click', this.clearFiles.bind(this));
        downloadAllBtn.addEventListener('click', this.downloadAll.bind(this));

        // 頁面模式變更
        pageMode.addEventListener('change', this.handlePageModeChange.bind(this));
    }

    handlePageModeChange(e) {
        const pageRangeContainer = document.getElementById('pageRangeContainer');
        if (e.target.value === 'custom') {
            pageRangeContainer.style.display = 'block';
        } else {
            pageRangeContainer.style.display = 'none';
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }

    addFiles(files) {
        const aiFiles = files.filter(file => {
            const extension = file.name.toLowerCase().split('.').pop();
            return ['ai', 'eps', 'svg'].includes(extension);
        });

        if (aiFiles.length === 0) {
            alert('請選擇 AI、EPS 或 SVG 格式的檔案');
            return;
        }

        aiFiles.forEach(file => {
            if (!this.selectedFiles.find(f => f.name === file.name)) {
                this.selectedFiles.push(file);
            }
        });

        this.updateFilesList();
        this.showSection('filesSection');
    }

    updateFilesList() {
        const filesList = document.getElementById('filesList');
        filesList.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">📄</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>大小: ${this.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="remove-btn" onclick="converter.removeFile(${index})">移除</button>
                </div>
            `;
            filesList.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFilesList();
        
        if (this.selectedFiles.length === 0) {
            this.hideSection('filesSection');
        }
    }

    clearFiles() {
        this.selectedFiles = [];
        this.convertedFiles = [];
        this.hideSection('filesSection');
        this.hideSection('progressSection');
        this.hideSection('resultsSection');
        document.getElementById('fileInput').value = '';
    }

    async convertFiles() {
        if (this.selectedFiles.length === 0) {
            alert('請先選擇檔案');
            return;
        }

        this.showSection('progressSection');
        this.hideSection('resultsSection');
        this.convertedFiles = [];

        const density = parseInt(document.getElementById('density').value);
        const quality = parseInt(document.getElementById('quality').value);
        const format = document.getElementById('format').value;
        const pageMode = document.getElementById('pageMode').value;
        const pageRange = document.getElementById('pageRange').value;

        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            const progress = ((i + 1) / this.selectedFiles.length) * 100;
            
            this.updateProgress(progress, `轉換中: ${file.name}`);

            try {
                const results = await this.convertSingleFile(file, format, { 
                    density, 
                    quality, 
                    pageMode, 
                    pageRange 
                });
                
                // 處理多頁面結果
                if (Array.isArray(results)) {
                    results.forEach((result, pageIndex) => {
                        this.convertedFiles.push({
                            originalFile: file,
                            convertedBlob: result.blob,
                            convertedName: result.name,
                            pageNumber: pageIndex + 1,
                            success: true
                        });
                    });
                } else {
                    this.convertedFiles.push({
                        originalFile: file,
                        convertedBlob: results.blob,
                        convertedName: results.name,
                        success: true
                    });
                }
            } catch (error) {
                this.convertedFiles.push({
                    originalFile: file,
                    success: false,
                    error: error.message
                });
            }
        }

        this.hideSection('progressSection');
        this.showResults();
    }

    async convertSingleFile(file, format, options) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const fileName = file.name.toLowerCase();
                    
                    if (fileName.endsWith('.svg')) {
                        this.convertSVGToImage(e.target.result, format, options)
                            .then(resolve)
                            .catch(reject);
                    } else if (fileName.endsWith('.ai') || fileName.endsWith('.eps')) {
                        // 使用 PDF.js 處理 AI/EPS 檔案
                        try {
                            const result = await this.convertAIFileWithPDFJS(e.target.result, format, options);
                            resolve(result);
                        } catch (pdfError) {
                            // 如果 PDF.js 失敗，嘗試作為圖片處理
                            try {
                                const result = await this.convertAsImage(e.target.result, format, options, file.name);
                                resolve(result);
                            } catch (imgError) {
                                reject(new Error(`AI 檔案轉換失敗: ${pdfError.message}. 圖片轉換也失敗: ${imgError.message}`));
                            }
                        }
                    } else {
                        // 嘗試作為圖片處理
                        try {
                            const result = await this.convertAsImage(e.target.result, format, options, file.name);
                            resolve(result);
                        } catch (error) {
                            reject(new Error(`不支援的檔案格式或檔案損壞: ${error.message}`));
                        }
                    }
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            
            if (file.name.toLowerCase().endsWith('.svg')) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    async convertAIFileWithPDFJS(arrayBuffer, format, options) {
        return new Promise(async (resolve, reject) => {
            try {
                // 設定 PDF.js worker
                if (typeof pdfjsLib !== 'undefined') {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    
                    // 載入 PDF/AI 檔案
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    const totalPages = pdf.numPages;
                    
                    // 決定要轉換哪些頁面
                    let pagesToConvert = [];
                    
                    if (options.pageMode === 'all') {
                        pagesToConvert = Array.from({length: totalPages}, (_, i) => i + 1);
                    } else if (options.pageMode === 'first') {
                        pagesToConvert = [1];
                    } else if (options.pageMode === 'custom' && options.pageRange) {
                        pagesToConvert = this.parsePageRange(options.pageRange, totalPages);
                    } else {
                        pagesToConvert = [1]; // 預設第一頁
                    }
                    
                    const results = [];
                    
                    for (let pageNum of pagesToConvert) {
                        try {
                            const page = await pdf.getPage(pageNum);
                            
                            // 設定渲染選項
                            const scale = options.density / 72;
                            const viewport = page.getViewport({ scale: scale });
                            
                            // 創建 canvas
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            
                            // 渲染頁面
                            const renderContext = {
                                canvasContext: context,
                                viewport: viewport
                            };
                            
                            await page.render(renderContext).promise;
                            
                            // 轉換為指定格式
                            const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
                            const qualityValue = format === 'jpg' ? options.quality / 100 : undefined;
                            
                            const blob = await new Promise((blobResolve) => {
                                canvas.toBlob(blobResolve, mimeType, qualityValue);
                            });
                            
                            if (blob) {
                                results.push({
                                    blob: blob,
                                    name: `page_${pageNum}.${format}`
                                });
                            }
                        } catch (pageError) {
                            console.warn(`跳過頁面 ${pageNum}: ${pageError.message}`);
                        }
                    }
                    
                    if (results.length === 0) {
                        reject(new Error('沒有頁面成功轉換'));
                    } else if (results.length === 1) {
                        resolve(results[0]);
                    } else {
                        resolve(results);
                    }
                } else {
                    reject(new Error('PDF.js 未載入'));
                }
            } catch (error) {
                reject(new Error(`PDF.js 轉換失敗: ${error.message}`));
            }
        });
    }

    parsePageRange(rangeStr, totalPages) {
        const pages = [];
        const parts = rangeStr.split(',');
        
        for (let part of parts) {
            part = part.trim();
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                        if (!pages.includes(i)) pages.push(i);
                    }
                }
            } else {
                const pageNum = parseInt(part);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    if (!pages.includes(pageNum)) pages.push(pageNum);
                }
            }
        }
        
        return pages.sort((a, b) => a - b);
    }

    async convertAsImage(arrayBuffer, format, options, fileName) {
        return new Promise((resolve, reject) => {
            try {
                // 創建 Blob 並嘗試作為圖片載入
                const blob = new Blob([arrayBuffer]);
                const url = URL.createObjectURL(blob);
                const img = new Image();
                
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // 設定 canvas 尺寸
                        const scale = options.density / 72;
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;
                        
                        // 設定高品質渲染
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        
                        // 繪製圖像
                        ctx.scale(scale, scale);
                        ctx.drawImage(img, 0, 0);
                        
                        // 轉換為指定格式
                        const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
                        const qualityValue = format === 'jpg' ? options.quality / 100 : undefined;
                        
                        canvas.toBlob((blob) => {
                            URL.revokeObjectURL(url);
                            if (blob) {
                                resolve({
                                    blob: blob,
                                    name: `converted.${format}`
                                });
                            } else {
                                reject(new Error('Canvas 轉換失敗'));
                            }
                        }, mimeType, qualityValue);
                    } catch (error) {
                        URL.revokeObjectURL(url);
                        reject(error);
                    }
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('圖片載入失敗，可能不是有效的圖片檔案'));
                };
                
                img.src = url;
            } catch (error) {
                reject(error);
            }
        });
    }

    async convertSVGToImage(svgContent, format, options) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // 設定 canvas 尺寸
                const scale = options.density / 72; // 將 DPI 轉換為縮放比例
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;

                // 設定高品質渲染
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // 繪製圖像
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);

                // 轉換為指定格式
                const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
                const qualityValue = format === 'jpg' ? options.quality / 100 : undefined;

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({
                            blob: blob,
                            name: `converted.${format}`
                        });
                    } else {
                        reject(new Error('轉換失敗'));
                    }
                }, mimeType, qualityValue);
            };

            img.onerror = () => reject(new Error('SVG 載入失敗'));

            // 創建 SVG 的 data URL
            const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            img.src = url;
        });
    }

    updateProgress(percentage, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${Math.round(percentage)}% - ${message}`;
    }

    showResults() {
        this.showSection('resultsSection');
        const resultsList = document.getElementById('resultsList');
        resultsList.innerHTML = '';

        this.convertedFiles.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            if (result.success) {
                const displayName = result.pageNumber 
                    ? `${result.originalFile.name} (第 ${result.pageNumber} 頁)`
                    : result.originalFile.name;
                
                resultItem.innerHTML = `
                    <div class="result-info">
                        <div class="result-status success">✅</div>
                        <div class="file-details">
                            <h4>${displayName}</h4>
                            <p>轉換成功</p>
                        </div>
                    </div>
                    <button class="download-btn" onclick="converter.downloadFile(${index})">下載</button>
                `;
            } else {
                resultItem.innerHTML = `
                    <div class="result-info">
                        <div class="result-status error">❌</div>
                        <div class="file-details">
                            <h4>${result.originalFile.name}</h4>
                            <p>錯誤: ${result.error}</p>
                        </div>
                    </div>
                `;
            }
            
            resultsList.appendChild(resultItem);
        });
    }

    downloadFile(index) {
        const result = this.convertedFiles[index];
        if (result.success) {
            const url = URL.createObjectURL(result.convertedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.getOutputFileName(result.originalFile.name, result.pageNumber);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    downloadAll() {
        const successfulResults = this.convertedFiles.filter(r => r.success);
        
        if (successfulResults.length === 0) {
            alert('沒有成功轉換的檔案可下載');
            return;
        }

        successfulResults.forEach((result, index) => {
            setTimeout(() => {
                this.downloadFile(this.convertedFiles.indexOf(result));
            }, index * 500); // 間隔 500ms 下載，避免瀏覽器阻擋
        });
    }

    getOutputFileName(originalName, pageNumber = null) {
        const format = document.getElementById('format').value;
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
        const suffix = pageNumber ? `_page_${pageNumber}` : '_converted';
        return `${baseName}${suffix}.${format}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showSection(sectionId) {
        document.getElementById(sectionId).style.display = 'block';
    }

    hideSection(sectionId) {
        document.getElementById(sectionId).style.display = 'none';
    }
}

// 初始化轉換器
const converter = new AIToPNGConverter();

// 防止整頁拖拽
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());
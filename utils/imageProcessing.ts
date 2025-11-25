/**
 * Detects the most likely grid layout (cols x rows) based on image aspect ratio.
 * 
 * 改善版v4: 
 * - より広い範囲のスタンプアスペクト比を検討
 * - 合計スタンプ数が多いレイアウトを強く優先
 * - 縦長セル（スタンプ比率 < 1）もサポート
 * - エラーが許容範囲内なら合計数優先
 */
export const detectGridLayout = (width: number, height: number): { cols: number; rows: number } => {
  const imageRatio = width / height;
  
  // 検討するスタンプのアスペクト比（より広い範囲）
  const stampRatios = [
    0.75,       // かなり縦長
    0.80,       // 縦長
    0.85,       // やや縦長
    0.90,       // やや縦長
    0.95,       // ほぼ正方形
    1.0,        // 正方形
    1.05,       // やや横長
    1.10,       // やや横長
    370 / 320,  // LINE標準横長 (1.156)
    1.20,       // 横長
  ];
  
  // Common LINE sticker total counts（優先度順）
  const standardTotals = [40, 32, 24, 16, 8];
  
  interface Candidate {
    cols: number;
    rows: number;
    total: number;
    error: number;
  }
  
  const candidates: Candidate[] = [];

  for (const stampRatio of stampRatios) {
    for (const total of standardTotals) {
      for (let cols = 1; cols <= Math.min(total, 12); cols++) {
        if (total % cols === 0) {
          const rows = total / cols;
          if (rows > 12) continue;
          
          const expectedImageRatio = (cols / rows) * stampRatio;
          const error = Math.abs(expectedImageRatio - imageRatio);
          
          // エラーが0.15未満の場合のみ候補に追加（許容範囲）
          if (error < 0.15) {
            candidates.push({ cols, rows, total, error });
          }
        }
      }
    }
  }

  // 候補がない場合はフォールバック
  if (candidates.length === 0) {
    // エラーを無視して全ての組み合わせから最適を選ぶ
    let best = { cols: 8, rows: 5 };
    let minError = Number.MAX_VALUE;
    
    for (const stampRatio of stampRatios) {
      for (const total of standardTotals) {
        for (let cols = 2; cols <= Math.min(total, 10); cols++) {
          if (total % cols === 0) {
            const rows = total / cols;
            if (rows > 10 || rows < 2) continue;
            
            const expectedImageRatio = (cols / rows) * stampRatio;
            const error = Math.abs(expectedImageRatio - imageRatio);
            
            if (error < minError) {
              minError = error;
              best = { cols, rows };
            }
          }
        }
      }
    }
    return best;
  }

  // 候補をソート：
  // 1. 合計数が多い順（優先）
  // 2. 同じ合計数ならエラーが小さい順
  candidates.sort((a, b) => {
    // 合計数が大きいほど優先
    if (a.total !== b.total) {
      return b.total - a.total;
    }
    // 同じ合計数ならエラーが小さい順
    return a.error - b.error;
  });

  const best = candidates[0];
  return { cols: best.cols, rows: best.rows };
};

/**
 * 画像分析による高度なグリッド検出
 * 背景色（白や明るい色）の垂直・水平ラインを分析してグリッドを検出
 * 
 * 改善版: 複数の方法でグリッドを検出し、最も確からしいものを選択
 */
export const analyzeGridFromImage = (
  img: HTMLImageElement
): { cols: number; rows: number; confidence: number } => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { cols: 4, rows: 10, confidence: 0 };
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;
  const w = img.width;
  const h = img.height;
  
  // === 方法1: 明るい線（グリッド線）の検出 ===
  const brightnessThreshold = 245;
  
  const rowBrightness: number[] = [];
  const colBrightness: number[] = [];
  
  for (let y = 0; y < h; y++) {
    let brightCount = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (brightness > brightnessThreshold) brightCount++;
    }
    rowBrightness.push(brightCount / w);
  }
  
  for (let x = 0; x < w; x++) {
    let brightCount = 0;
    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (brightness > brightnessThreshold) brightCount++;
    }
    colBrightness.push(brightCount / h);
  }
  
  // === 方法2: 色の変化（エッジ）の検出 ===
  const rowVariance: number[] = [];
  const colVariance: number[] = [];
  
  // 行ごとの色の変化量（隣接ピクセル間の差分の合計）
  for (let y = 0; y < h; y++) {
    let variance = 0;
    for (let x = 1; x < w; x++) {
      const idx1 = (y * w + (x - 1)) * 4;
      const idx2 = (y * w + x) * 4;
      const diff = Math.abs(data[idx1] - data[idx2]) + 
                   Math.abs(data[idx1 + 1] - data[idx2 + 1]) + 
                   Math.abs(data[idx1 + 2] - data[idx2 + 2]);
      variance += diff;
    }
    rowVariance.push(variance / (w - 1));
  }
  
  // 列ごとの色の変化量
  for (let x = 0; x < w; x++) {
    let variance = 0;
    for (let y = 1; y < h; y++) {
      const idx1 = ((y - 1) * w + x) * 4;
      const idx2 = (y * w + x) * 4;
      const diff = Math.abs(data[idx1] - data[idx2]) + 
                   Math.abs(data[idx1 + 1] - data[idx2 + 1]) + 
                   Math.abs(data[idx1 + 2] - data[idx2 + 2]);
      variance += diff;
    }
    colVariance.push(variance / (h - 1));
  }
  
  // グリッド線候補の検出（周期的なパターンを探す）
  const detectPeriod = (arr: number[], minPeriod: number, maxPeriod: number): number => {
    let bestPeriod = 0;
    let bestScore = -Infinity;
    
    for (let period = minPeriod; period <= maxPeriod; period++) {
      let score = 0;
      let count = 0;
      
      // 各周期位置での値を合計
      for (let i = 0; i < arr.length; i += period) {
        const windowSize = Math.min(5, arr.length - i);
        let maxInWindow = 0;
        for (let j = 0; j < windowSize; j++) {
          if (i + j < arr.length) {
            maxInWindow = Math.max(maxInWindow, arr[i + j]);
          }
        }
        score += maxInWindow;
        count++;
      }
      
      // 周期数が多いほどボーナス（一定数以上の場合）
      const normalizedScore = score / count;
      const periodBonus = count >= 4 ? 1 + (count - 4) * 0.1 : 1;
      const finalScore = normalizedScore * periodBonus;
      
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestPeriod = period;
      }
    }
    
    return bestPeriod;
  };
  
  // 明るさベースの周期検出
  const minRowPeriod = Math.floor(h / 12);
  const maxRowPeriod = Math.floor(h / 3);
  const minColPeriod = Math.floor(w / 12);
  const maxColPeriod = Math.floor(w / 3);
  
  const rowPeriod = detectPeriod(rowBrightness, minRowPeriod, maxRowPeriod);
  const colPeriod = detectPeriod(colBrightness, minColPeriod, maxColPeriod);
  
  if (rowPeriod > 0 && colPeriod > 0) {
    const detectedRows = Math.round(h / rowPeriod);
    const detectedCols = Math.round(w / colPeriod);
    
    // 妥当な範囲かチェック（1-12の範囲）
    if (detectedRows >= 1 && detectedRows <= 12 && detectedCols >= 1 && detectedCols <= 12) {
      // 標準的なスタンプ数（8, 16, 24, 32, 40）に近いかチェック
      const total = detectedRows * detectedCols;
      const standardTotals = [8, 16, 24, 32, 40];
      const isStandard = standardTotals.some(st => Math.abs(total - st) <= 2);
      
      const confidence = isStandard ? 0.7 : 0.4;
      return { cols: detectedCols, rows: detectedRows, confidence };
    }
  }
  
  // 検出に失敗した場合はアスペクト比ベースの検出にフォールバック
  const fallback = detectGridLayout(w, h);
  return { ...fallback, confidence: 0 };
};

export interface TrimConfig {
  top: number; // 0-1 (percentage)
  bottom: number;
  left: number;
  right: number;
}

export interface GapConfig {
  x: number; // 0-1 (percentage of trimmed width)
  y: number; // 0-1 (percentage of trimmed height)
}

/**
 * Slices a grid image into individual stickers.
 * Resizes each to 370x320px.
 * Supports trimming (percentages) and gaps.
 * 
 * Trim: 画像全体から外側の余白を削除する（パーセンテージ）
 * Gap: スタンプ間の間隔（トリミング後の領域に対するパーセンテージ）
 */
export const sliceImage = (
  sourceImage: HTMLImageElement,
  cols: number = 4,
  rows: number = 10,
  trim: TrimConfig = { top: 0, bottom: 0, left: 0, right: 0 },
  gap: GapConfig = { x: 0, y: 0 }
): Promise<string[]> => {
  return new Promise((resolve) => {
    const stickers: string[] = [];
    
    const imgW = sourceImage.width;
    const imgH = sourceImage.height;
    
    // Step 1: Calculate the trimmed area (effective source area)
    const trimmedX = imgW * trim.left;
    const trimmedY = imgH * trim.top;
    const trimmedW = imgW * (1 - trim.left - trim.right);
    const trimmedH = imgH * (1 - trim.top - trim.bottom);

    // Step 2: Calculate gaps in pixels
    // Gap is percentage of cell width/height (more intuitive)
    // First calculate cell size without gaps
    const baseCellW = trimmedW / cols;
    const baseCellH = trimmedH / rows;
    
    // Gap pixels = percentage of base cell size
    const gapPxX = baseCellW * gap.x;
    const gapPxY = baseCellH * gap.y;
    
    // Step 3: Recalculate actual cell size accounting for gaps
    // Total available = trimmed area
    // Total gaps = (n-1) * gapPx
    // Content area = Total - Total gaps
    // Cell size = Content area / n
    const totalGapW = (cols > 1) ? (cols - 1) * gapPxX : 0;
    const totalGapH = (rows > 1) ? (rows - 1) * gapPxY : 0;
    
    const cellW = (trimmedW - totalGapW) / cols;
    const cellH = (trimmedH - totalGapH) / rows;

    // Target dimensions for LINE stickers
    const targetW = 370;
    const targetH = 320;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Improve quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Clear rect first to ensure transparency
          ctx.clearRect(0, 0, targetW, targetH);

          // Calculate source position
          // Position = TrimStart + (cellIndex * cellSize) + (cellIndex * gapSize)
          const sx = trimmedX + c * cellW + c * gapPxX;
          const sy = trimmedY + r * cellH + r * gapPxY;

          ctx.drawImage(
            sourceImage,
            sx,      // source x
            sy,      // source y
            cellW,   // source width
            cellH,   // source height
            0,       // dest x
            0,       // dest y
            targetW, // dest width
            targetH  // dest height
          );
          
          // Force PNG for high quality and transparency support
          stickers.push(canvas.toDataURL('image/png', 1.0));
        }
      }
    }
    resolve(stickers);
  });
};

/**
 * Process a single image file.
 * Loads, detects layout, and slices the file.
 * 
 * 改善版: 画像分析とアスペクト比の両方でレイアウトを検出
 */
export const processImage = async (
  file: File
): Promise<{ stickers: string[], firstImageSrc: string, layout: { cols: number, rows: number } }> => {
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      // まず画像分析による検出を試みる
      const analyzed = analyzeGridFromImage(img);
      
      // 信頼度が高い場合は分析結果を使用
      let layout: { cols: number; rows: number };
      if (analyzed.confidence > 0.3) {
        layout = { cols: analyzed.cols, rows: analyzed.rows };
      } else {
        // フォールバック：アスペクト比ベースの検出
        layout = detectGridLayout(img.width, img.height);
      }
      
      // Initial slice with defaults (no trim/gap)
      const slices = await sliceImage(img, layout.cols, layout.rows);
      resolve({ stickers: slices, firstImageSrc: objectUrl, layout });
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
};


/**
 * Creates a "Main" image (240x240) from a specific sticker source data.
 */
export const createMainImage = (
  stickerDataUrl: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, 240, 240);
        ctx.drawImage(img, 0, 0, 240, 240);
        resolve(canvas.toDataURL('image/png', 1.0));
      } else {
        reject(new Error("Canvas context failed"));
      }
    };
    img.onerror = reject;
    img.src = stickerDataUrl;
  });
};

export const downloadStickerSet = async (
  stickers: { id: number; dataUrl: string }[],
  mainImage: string | null,
  fileNamePrefix: string = "sticker"
) => {
  if (!window.JSZip || !window.saveAs) {
    alert("ZIP library not loaded. Please refresh.");
    return;
  }

  const zip = new window.JSZip();
  const folder = zip.folder("line_stickers");

  // Add stickers
  stickers.forEach((sticker, index) => {
    // Extract base64
    const data = sticker.dataUrl.split(',')[1];
    // LINE usually requires 01.png, 02.png etc.
    const num = (index + 1).toString().padStart(2, '0');
    folder.file(`${num}.png`, data, { base64: true });
  });

  // Add main image if exists
  if (mainImage) {
    const data = mainImage.split(',')[1];
    folder.file("main.png", data, { base64: true });
  }

  // Generate and save
  const content = await zip.generateAsync({ type: "blob" });
  window.saveAs(content, `${fileNamePrefix}_set.zip`);
};

// --- COLOR EDITING UTILS ---

/**
 * RGB to LAB color space conversion
 * LABは人間の視覚に近い色空間で、色の差を測定するのに適している
 */
const rgbToLab = (r: number, g: number, b: number): number[] => {
  let r1 = r / 255, g1 = g / 255, b1 = b / 255;

  r1 = (r1 > 0.04045) ? Math.pow((r1 + 0.055) / 1.055, 2.4) : r1 / 12.92;
  g1 = (g1 > 0.04045) ? Math.pow((g1 + 0.055) / 1.055, 2.4) : g1 / 12.92;
  b1 = (b1 > 0.04045) ? Math.pow((b1 + 0.055) / 1.055, 2.4) : b1 / 12.92;

  let x = (r1 * 0.4124 + g1 * 0.3576 + b1 * 0.1805) / 0.95047;
  let y = (r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722) / 1.00000;
  let z = (r1 * 0.0193 + g1 * 0.1192 + b1 * 0.9505) / 1.08883;

  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
};

/**
 * Delta E (CIE76) - 2つのLAB色の差を計算
 * 値が小さいほど色が近い
 */
const deltaE = (labA: number[], labB: number[]): number => {
  const deltaL = labA[0] - labB[0];
  const deltaA = labA[1] - labB[1];
  const deltaB = labA[2] - labB[2];
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
};

/**
 * Sobel演算子によるエッジ強度の計算
 * エッジが強い場所（キャラクターの輪郭）を検出
 */
const computeEdgeStrength = (
  data: Uint8ClampedArray,
  w: number,
  h: number
): Float32Array => {
  const edges = new Float32Array(w * h);
  
  // Sobelカーネル
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0, gy = 0;
      
      // 3x3近傍を走査
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * w + (x + kx)) * 4;
          // グレースケール値を計算
          const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray * sobelX[kernelIdx];
          gy += gray * sobelY[kernelIdx];
        }
      }
      
      // 勾配の大きさ
      edges[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  
  return edges;
};

/**
 * エッジからの距離マップを計算
 * キャラクターの輪郭からどれだけ離れているかを計算
 */
const computeDistanceFromEdges = (
  edges: Float32Array,
  w: number,
  h: number,
  edgeThreshold: number = 30
): Uint8Array => {
  const isEdge = new Uint8Array(w * h);
  const distance = new Uint8Array(w * h);
  
  // エッジピクセルをマーク
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] > edgeThreshold) {
      isEdge[i] = 1;
    }
  }
  
  // 距離変換（最適化版 - ダブルバッファBFS）
  let currentQueue: [number, number][] = [];
  let nextQueue: [number, number][] = [];
  
  // エッジピクセルをキューに追加し、初期距離を設定
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (isEdge[idx]) {
        currentQueue.push([x, y]);
        distance[idx] = 0;
      } else {
        distance[idx] = 255; // 最大距離
      }
    }
  }
  
  // BFSで距離を計算（最大距離は制限）
  const maxDist = 10;
  let currentDist = 0;
  
  while (currentQueue.length > 0 && currentDist < maxDist) {
    currentDist++;
    
    for (const [x, y] of currentQueue) {
      const neighbors: [number, number][] = [[x+1, y], [x-1, y], [x, y+1], [x, y-1]];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nIdx = ny * w + nx;
          if (distance[nIdx] === 255) {
            distance[nIdx] = currentDist;
            nextQueue.push([nx, ny]);
          }
        }
      }
    }
    
    // スワップ
    currentQueue = nextQueue;
    nextQueue = [];
  }
  
  return distance;
};


/**
 * Global Color Removal (Magic Wand - Contiguous: False)
 * Uses Delta E.
 */
export const removeColorGlobally = (
  canvas: HTMLCanvasElement,
  targetColor: { r: number, g: number, b: number },
  tolerance: number = 20
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const targetLab = rgbToLab(targetColor.r, targetColor.g, targetColor.b);

  for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      const a = data[i+3];
      
      if (a === 0) continue;

      const currentLab = rgbToLab(r, g, b);
      const diff = deltaE(targetLab, currentLab);

      if (diff <= tolerance) {
        data[i+3] = 0; // Transparent
      }
  }
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Shared Flood Fill Logic
 */
const floodFillCore = (
  data: Uint8ClampedArray,
  w: number,
  h: number,
  seeds: [number, number][],
  targetLab: number[],
  tolerance: number
) => {
  const stack = [...seeds];
  const seen = new Uint8Array(w * h);

  // Mark seeds as seen
  for(const [sx, sy] of seeds) {
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        seen[sy * w + sx] = 1;
      }
  }

  while (stack.length) {
    const point = stack.pop();
    if (!point) continue;
    const [x, y] = point;
    
    // Safety check
    if (x < 0 || x >= w || y < 0 || y >= h) continue;

    const idx = (y * w + x) * 4;
    
    // Apply transparency
    data[idx + 3] = 0;

    // Check neighbors
    const neighbors = [
      [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nIdx = ny * w + nx;
        if (!seen[nIdx]) {
           const offset = nIdx * 4;
           if (data[offset + 3] !== 0) { // If not already transparent
             const r = data[offset];
             const g = data[offset + 1];
             const b = data[offset + 2];
             
             const currentLab = rgbToLab(r, g, b);
             if (deltaE(targetLab, currentLab) <= tolerance) {
               seen[nIdx] = 1;
               stack.push([nx, ny]);
             }
           }
        }
      }
    }
  }
};

/**
 * Flood Fill Transparency (Magic Wand - Contiguous: True)
 * Uses Delta E.
 */
export const floodFillTransparency = (
  canvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  tolerance: number = 20
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const startPos = (startY * w + startX) * 4;
  const targetR = data[startPos];
  const targetG = data[startPos + 1];
  const targetB = data[startPos + 2];
  const targetA = data[startPos + 3];

  if (targetA === 0) return; 

  const targetLab = rgbToLab(targetR, targetG, targetB);

  floodFillCore(data, w, h, [[startX, startY]], targetLab, tolerance);

  ctx.putImageData(imageData, 0, 0);
};

/**
 * Flood Fill From Borders with Island Removal (Safe Batch Processing)
 */
export const floodFillFromBorders = (
  canvas: HTMLCanvasElement,
  targetColor: { r: number, g: number, b: number },
  tolerance: number = 20,
  removeHoles: boolean = false
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const targetLab = rgbToLab(targetColor.r, targetColor.g, targetColor.b);
  const seeds: [number, number][] = [];

  // Step 1: Collect Border Seeds
  for (let x = 0; x < w; x++) {
    // Top
    let idx = (0 * w + x) * 4;
    if (data[idx + 3] !== 0) {
      let diff = deltaE(targetLab, rgbToLab(data[idx], data[idx+1], data[idx+2]));
      if (diff <= tolerance) seeds.push([x, 0]);
    }
    // Bottom
    idx = ((h - 1) * w + x) * 4;
    if (data[idx + 3] !== 0) {
      let diff = deltaE(targetLab, rgbToLab(data[idx], data[idx+1], data[idx+2]));
      if (diff <= tolerance) seeds.push([x, h - 1]);
    }
  }
  for (let y = 1; y < h - 1; y++) {
    // Left
    let idx = (y * w + 0) * 4;
    if (data[idx + 3] !== 0) {
      let diff = deltaE(targetLab, rgbToLab(data[idx], data[idx+1], data[idx+2]));
      if (diff <= tolerance) seeds.push([0, y]);
    }
    // Right
    idx = (y * w + (w - 1)) * 4;
    if (data[idx + 3] !== 0) {
      let diff = deltaE(targetLab, rgbToLab(data[idx], data[idx+1], data[idx+2]));
      if (diff <= tolerance) seeds.push([w - 1, y]);
    }
  }

  // Step 2: Flood Fill from Borders
  if (seeds.length > 0) {
    floodFillCore(data, w, h, seeds, targetLab, tolerance);
  }

  // Step 3: Remove Holes (Small Islands)
  if (removeHoles) {
    const visited = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
        if (data[i * 4 + 3] === 0) visited[i] = 1;
    }
    const ISLAND_SIZE_THRESHOLD = 500; 

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (visited[idx]) continue;

        const pixelIdx = idx * 4;
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];
        const diff = deltaE(targetLab, rgbToLab(r, g, b));

        if (diff <= tolerance) {
          const islandStack = [[x, y]];
          const islandPixels: number[] = []; 
          
          visited[idx] = 1;
          islandPixels.push(idx);

          let ptr = 0;
          while(ptr < islandPixels.length) {
             const currIdx = islandPixels[ptr];
             const cx = currIdx % w;
             const cy = Math.floor(currIdx / w);
             ptr++;

             const neighbors = [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]];
             for(const [nx, ny] of neighbors) {
               if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                 const nIdx = ny * w + nx;
                 if (!visited[nIdx]) {
                    const nOff = nIdx * 4;
                    if (data[nOff+3] !== 0) {
                      const nDiff = deltaE(targetLab, rgbToLab(data[nOff], data[nOff+1], data[nOff+2]));
                      if (nDiff <= tolerance) {
                        visited[nIdx] = 1;
                        islandPixels.push(nIdx);
                      }
                    }
                 }
               }
             }
          }

          if (islandPixels.length < ISLAND_SIZE_THRESHOLD) {
            for (const pIdx of islandPixels) {
              data[pIdx * 4 + 3] = 0;
            }
          }
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

/**
 * Manual Eraser Tool
 */
export const eraseOnCanvas = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  radius: number = 10
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
};

/**
 * Manual Restore Tool
 */
export const restoreOnCanvas = (
  canvas: HTMLCanvasElement,
  originalImage: HTMLImageElement,
  x: number,
  y: number,
  radius: number = 10
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  
  ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
  
  ctx.restore();
};


/**
 * Apply transparency to a raw base64 string
 */
export const processBatchTransparency = (
  base64Src: string,
  targetColor: { r: number, g: number, b: number },
  tolerance: number,
  contiguous: boolean,
  removeHoles: boolean
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
       const canvas = document.createElement('canvas');
       canvas.width = img.width;
       canvas.height = img.height;
       const ctx = canvas.getContext('2d');
       if (ctx) {
         ctx.imageSmoothingEnabled = true;
         ctx.imageSmoothingQuality = 'high';
         ctx.drawImage(img, 0, 0);
         
         if (contiguous) {
           floodFillFromBorders(canvas, targetColor, tolerance, removeHoles);
         } else {
           removeColorGlobally(canvas, targetColor, tolerance);
         }
         
         resolve(canvas.toDataURL('image/png', 1.0));
       } else {
         resolve(base64Src);
       }
    };
    img.onerror = () => {
        resolve(base64Src);
    };
    img.src = base64Src;
  });
};


/**
 * ===== 高精度背景透過アルゴリズム =====
 * 
 * 「あ」「お」などの文字の内側にある穴も適切に透過するための
 * 最上級アルゴリズム
 * 
 * 改善点:
 * - Sobelエッジ検出でキャラクターの輪郭を保護
 * - エッジからの距離に基づく安全マージン
 * - より保守的な色マッチング
 */

/**
 * 高精度背景透過（エッジ保護付き）- 高速RGB版
 * 
 * アルゴリズム:
 * 1. Sobel演算子でエッジ（キャラクターの輪郭）を検出
 * 2. エッジからの距離マップを計算
 * 3. クリック点から始めてflood fillで背景を透過
 * 4. エッジに近いピクセルは保護（透過しない）
 * 5. 文字内の穴も検出して透過（エッジ保護付き）
 */
export const advancedBackgroundRemoval = (
  canvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  tolerance: number = 20,
  fillHoles: boolean = true,
  edgeProtection: boolean = true
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // クリックしたピクセルの色を取得
  const startPos = (startY * w + startX) * 4;
  const targetR = data[startPos];
  const targetG = data[startPos + 1];
  const targetB = data[startPos + 2];
  const targetA = data[startPos + 3];

  if (targetA === 0) return;

  // RGB許容値（toleranceは元々LAB用なので2倍して調整）
  const rgbTolerance = tolerance * 2.5;

  // 高速RGB距離計算関数（インライン化で高速化）
  const colorMatch = (r: number, g: number, b: number): boolean => {
    const dr = r - targetR;
    const dg = g - targetG;
    const db = b - targetB;
    const rMean = (r + targetR) >> 1;
    const rWeight = rMean < 128 ? 2.0 : 3.0;
    const dist = Math.sqrt(dr * dr * rWeight + dg * dg * 4.0 + db * db * 2.0) / 3;
    return dist <= rgbTolerance;
  };

  // エッジ検出と距離マップ（大きすぎる画像では無効化）
  let edgeDistance: Uint8Array | null = null;
  const EDGE_SAFE_MARGIN = 2; // エッジから2ピクセル以内は保護
  const pixelCount = w * h;
  
  const useEdgeProtection = edgeProtection && pixelCount < 800000;
  
  if (useEdgeProtection) {
    const edges = computeEdgeStrength(data, w, h);
    edgeDistance = computeDistanceFromEdges(edges, w, h, 25);
  }

  // Step 1: クリックした点からflood fillで連結領域を透過
  // ダブルバッファBFSで高速化
  const processed = new Uint8Array(w * h);
  let currentQueue: number[] = [startY * w + startX];
  let nextQueue: number[] = [];
  processed[startY * w + startX] = 1;

  while (currentQueue.length > 0) {
    for (let i = 0; i < currentQueue.length; i++) {
      const idx = currentQueue[i];
      const x = idx % w;
      const y = (idx / w) | 0;
      const pixelIdx = idx * 4;
      
      // エッジ保護: エッジに近すぎる場合はスキップ
      if (edgeDistance && edgeDistance[idx] < EDGE_SAFE_MARGIN) {
        continue;
      }
      
      // 透過処理
      data[pixelIdx + 3] = 0;

      // 4方向の隣接ピクセルをチェック
      const nx1 = x + 1, nx2 = x - 1;
      const ny1 = y + 1, ny2 = y - 1;
      
      if (nx1 < w) {
        const nIdx = y * w + nx1;
        if (!processed[nIdx]) {
          const offset = nIdx * 4;
          if (data[offset + 3] !== 0 && colorMatch(data[offset], data[offset + 1], data[offset + 2])) {
            processed[nIdx] = 1;
            nextQueue.push(nIdx);
          }
        }
      }
      if (nx2 >= 0) {
        const nIdx = y * w + nx2;
        if (!processed[nIdx]) {
          const offset = nIdx * 4;
          if (data[offset + 3] !== 0 && colorMatch(data[offset], data[offset + 1], data[offset + 2])) {
            processed[nIdx] = 1;
            nextQueue.push(nIdx);
          }
        }
      }
      if (ny1 < h) {
        const nIdx = ny1 * w + x;
        if (!processed[nIdx]) {
          const offset = nIdx * 4;
          if (data[offset + 3] !== 0 && colorMatch(data[offset], data[offset + 1], data[offset + 2])) {
            processed[nIdx] = 1;
            nextQueue.push(nIdx);
          }
        }
      }
      if (ny2 >= 0) {
        const nIdx = ny2 * w + x;
        if (!processed[nIdx]) {
          const offset = nIdx * 4;
          if (data[offset + 3] !== 0 && colorMatch(data[offset], data[offset + 1], data[offset + 2])) {
            processed[nIdx] = 1;
            nextQueue.push(nIdx);
          }
        }
      }
    }
    
    // キュー入れ替え
    const temp = currentQueue;
    currentQueue = nextQueue;
    nextQueue = temp;
    nextQueue.length = 0;
  }

  // Step 2: 穴埋め処理 - 内部の閉じた領域も透過（エッジ保護付き）
  // 穴が小さい場合のみ実行（パフォーマンス対策）
  if (fillHoles && pixelCount < 600000) {
    // 外側の透明領域をマーク（BFS）
    const outsideTransparent = new Uint8Array(w * h);
    let borderQueue: number[] = [];
    
    // 境界から透明ピクセルを収集
    for (let x = 0; x < w; x++) {
      if (data[(0 * w + x) * 4 + 3] === 0) borderQueue.push(x);
      const bottomIdx = (h - 1) * w + x;
      if (data[bottomIdx * 4 + 3] === 0) borderQueue.push(bottomIdx);
    }
    for (let y = 1; y < h - 1; y++) {
      if (data[(y * w) * 4 + 3] === 0) borderQueue.push(y * w);
      const rightIdx = y * w + w - 1;
      if (data[rightIdx * 4 + 3] === 0) borderQueue.push(rightIdx);
    }
    
    for (const idx of borderQueue) {
      outsideTransparent[idx] = 1;
    }
    
    // BFSで外側透明領域を拡張
    let oQueue: number[] = borderQueue.slice();
    let oNext: number[] = [];
    
    while (oQueue.length > 0) {
      for (let i = 0; i < oQueue.length; i++) {
        const idx = oQueue[i];
        const x = idx % w;
        const y = (idx / w) | 0;
        
        const checkNeighbor = (nx: number, ny: number) => {
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nIdx = ny * w + nx;
            if (!outsideTransparent[nIdx] && data[nIdx * 4 + 3] === 0) {
              outsideTransparent[nIdx] = 1;
              oNext.push(nIdx);
            }
          }
        };
        
        checkNeighbor(x + 1, y);
        checkNeighbor(x - 1, y);
        checkNeighbor(x, y + 1);
        checkNeighbor(x, y - 1);
      }
      
      const temp = oQueue;
      oQueue = oNext;
      oNext = temp;
      oNext.length = 0;
    }

    // 穴を検出して透過（エッジ保護付き）
    const checkedForHoles = new Uint8Array(w * h);
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const offset = idx * 4;
        
        if (checkedForHoles[idx] || data[offset + 3] === 0) continue;
        
        // エッジ保護チェック
        if (edgeDistance && edgeDistance[idx] < EDGE_SAFE_MARGIN) {
          checkedForHoles[idx] = 1;
          continue;
        }
        
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        
        if (colorMatch(r, g, b)) {
          const holePixels: number[] = [];
          let hQueue: number[] = [idx];
          let hNext: number[] = [];
          checkedForHoles[idx] = 1;
          let touchesOutside = false;
          let touchesEdge = false;
          
          while (hQueue.length > 0 && holePixels.length < 50000) {
            for (let i = 0; i < hQueue.length; i++) {
              const hIdx = hQueue[i];
              const hx = hIdx % w;
              const hy = (hIdx / w) | 0;
              
              // エッジに触れているかチェック
              if (edgeDistance && edgeDistance[hIdx] < EDGE_SAFE_MARGIN) {
                touchesEdge = true;
              }
              
              holePixels.push(hIdx);
              
              const checkHoleNeighbor = (nx: number, ny: number) => {
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                  const nIdx = ny * w + nx;
                  
                  if (outsideTransparent[nIdx]) {
                    touchesOutside = true;
                  }
                  
                  if (!checkedForHoles[nIdx]) {
                    const nOffset = nIdx * 4;
                    if (data[nOffset + 3] !== 0 && colorMatch(data[nOffset], data[nOffset + 1], data[nOffset + 2])) {
                      checkedForHoles[nIdx] = 1;
                      hNext.push(nIdx);
                    }
                  }
                }
              };
              
              checkHoleNeighbor(hx + 1, hy);
              checkHoleNeighbor(hx - 1, hy);
              checkHoleNeighbor(hx, hy + 1);
              checkHoleNeighbor(hx, hy - 1);
            }
            
            const temp = hQueue;
            hQueue = hNext;
            hNext = temp;
            hNext.length = 0;
          }
          
          // 外側に繋がっておらず、エッジにも触れていない場合のみ透過
          if (!touchesOutside && !touchesEdge && holePixels.length > 0) {
            for (const hIdx of holePixels) {
              // 各ピクセルのエッジ距離も再チェック
              if (!edgeDistance || edgeDistance[hIdx] >= EDGE_SAFE_MARGIN) {
                data[hIdx * 4 + 3] = 0;
              }
            }
          }
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
};


/**
 * 高速RGB距離計算（重み付き - 人間の視覚特性を考慮）
 */
const rgbDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  // ITU-R BT.601 重み付け + 赤方向の補正
  const rMean = (r1 + r2) / 2;
  const rWeight = rMean < 128 ? 2.0 : 3.0;
  return Math.sqrt(dr * dr * rWeight + dg * dg * 4.0 + db * db * 2.0) / 3;
};


/**
 * 自動背景除去（画像の境界から背景色を推定）
 * 高精度版：境界全体からサンプリング、適応的許容値
 */
export const autoRemoveBackground = (
  canvas: HTMLCanvasElement,
  tolerance: number = 20,
  fillHoles: boolean = true,
  edgeProtection: boolean = true
): { success: boolean; message: string } => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { success: false, message: 'Canvas context not found' };
  
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  
  // RGB許容値に変換
  const rgbTolerance = tolerance * 2.0;

  // エッジ検出
  let edgeDistance: Uint8Array | null = null;
  const EDGE_SAFE_MARGIN = 2;
  const pixelCount = w * h;
  
  const useEdgeProtection = edgeProtection && pixelCount < 1000000;
  
  if (useEdgeProtection) {
    const edges = computeEdgeStrength(data, w, h);
    edgeDistance = computeDistanceFromEdges(edges, w, h, 30);
  }

  // 境界から広範囲にサンプル取得
  const samplePoints: [number, number][] = [];
  
  // 四隅（各コーナーから3x3マス）
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      samplePoints.push([dx, dy]);
      samplePoints.push([w - 1 - dx, dy]);
      samplePoints.push([dx, h - 1 - dy]);
      samplePoints.push([w - 1 - dx, h - 1 - dy]);
    }
  }
  
  // 上下の境界線（等間隔）
  const stepX = Math.max(1, Math.floor(w / 20));
  for (let x = 0; x < w; x += stepX) {
    samplePoints.push([x, 0]);
    samplePoints.push([x, 1]);
    samplePoints.push([x, h - 1]);
    samplePoints.push([x, h - 2]);
  }
  
  // 左右の境界線（等間隔）
  const stepY = Math.max(1, Math.floor(h / 20));
  for (let y = 0; y < h; y += stepY) {
    samplePoints.push([0, y]);
    samplePoints.push([1, y]);
    samplePoints.push([w - 1, y]);
    samplePoints.push([w - 2, y]);
  }

  // サンプル色を収集（エッジ上は除外）
  const sampleColors: { r: number, g: number, b: number }[] = [];
  
  for (const [sx, sy] of samplePoints) {
    if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
      const idx = sy * w + sx;
      const offset = idx * 4;
      
      // エッジ近くのサンプルは除外
      if (edgeDistance && edgeDistance[idx] < 5) continue;
      
      if (data[offset + 3] > 0) {
        sampleColors.push({ 
          r: data[offset], 
          g: data[offset + 1], 
          b: data[offset + 2] 
        });
      }
    }
  }

  if (sampleColors.length === 0) {
    return { success: false, message: '有効なサンプルピクセルが見つかりません' };
  }

  // 類似色をグループ化（RGB距離）
  const colorGroups: { colors: typeof sampleColors, avgR: number, avgG: number, avgB: number }[] = [];
  
  for (const color of sampleColors) {
    let addedToGroup = false;
    for (const group of colorGroups) {
      if (rgbDistance(color.r, color.g, color.b, group.avgR, group.avgG, group.avgB) < 30) {
        group.colors.push(color);
        const n = group.colors.length;
        group.avgR = (group.avgR * (n - 1) + color.r) / n;
        group.avgG = (group.avgG * (n - 1) + color.g) / n;
        group.avgB = (group.avgB * (n - 1) + color.b) / n;
        addedToGroup = true;
        break;
      }
    }
    if (!addedToGroup) {
      colorGroups.push({ colors: [color], avgR: color.r, avgG: color.g, avgB: color.b });
    }
  }

  colorGroups.sort((a, b) => b.colors.length - a.colors.length);
  
  if (colorGroups.length === 0) {
    return { success: false, message: '背景色を特定できませんでした' };
  }

  const mainGroup = colorGroups[0];
  
  if (mainGroup.colors.length < 3) {
    return { success: false, message: '背景色のサンプルが不十分です。手動で背景をクリックしてください。' };
  }
  
  const targetR = Math.round(mainGroup.avgR);
  const targetG = Math.round(mainGroup.avgG);
  const targetB = Math.round(mainGroup.avgB);

  // 境界からflood fill（高速RGB版）
  const processed = new Uint8Array(w * h);
  const seeds: [number, number][] = [];

  // 4辺のピクセルをシード候補として追加
  for (let x = 0; x < w; x++) {
    // 上辺
    let idx = x;
    let offset = idx * 4;
    if (data[offset + 3] !== 0 && (!edgeDistance || edgeDistance[idx] >= EDGE_SAFE_MARGIN)) {
      if (rgbDistance(data[offset], data[offset + 1], data[offset + 2], targetR, targetG, targetB) <= rgbTolerance) {
        seeds.push([x, 0]);
        processed[idx] = 1;
      }
    }
    // 下辺
    idx = (h - 1) * w + x;
    offset = idx * 4;
    if (data[offset + 3] !== 0 && (!edgeDistance || edgeDistance[idx] >= EDGE_SAFE_MARGIN)) {
      if (rgbDistance(data[offset], data[offset + 1], data[offset + 2], targetR, targetG, targetB) <= rgbTolerance) {
        seeds.push([x, h - 1]);
        processed[idx] = 1;
      }
    }
  }
  for (let y = 1; y < h - 1; y++) {
    // 左辺
    let idx = y * w;
    let offset = idx * 4;
    if (data[offset + 3] !== 0 && (!edgeDistance || edgeDistance[idx] >= EDGE_SAFE_MARGIN)) {
      if (rgbDistance(data[offset], data[offset + 1], data[offset + 2], targetR, targetG, targetB) <= rgbTolerance) {
        seeds.push([0, y]);
        processed[idx] = 1;
      }
    }
    // 右辺
    idx = y * w + (w - 1);
    offset = idx * 4;
    if (data[offset + 3] !== 0 && (!edgeDistance || edgeDistance[idx] >= EDGE_SAFE_MARGIN)) {
      if (rgbDistance(data[offset], data[offset + 1], data[offset + 2], targetR, targetG, targetB) <= rgbTolerance) {
        seeds.push([w - 1, y]);
        processed[idx] = 1;
      }
    }
  }

  // Flood fill from borders（高速版）
  const stack = [...seeds];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const idx = y * w + x;
    
    // エッジ保護
    if (edgeDistance && edgeDistance[idx] < EDGE_SAFE_MARGIN) {
      continue;
    }
    
    data[idx * 4 + 3] = 0;

    // インライン展開で高速化
    if (x + 1 < w) {
      const nIdx = idx + 1;
      if (!processed[nIdx]) {
        const offset = nIdx * 4;
        if (data[offset + 3] !== 0 && 
            rgbDistance(data[offset], data[offset + 1], data[offset + 2], targetR, targetG, targetB) <= rgbTolerance) {
          processed[nIdx] = 1;
          stack.push([x + 1, y]);
        }
      }
    }
    if (x - 1 >= 0) {
      const nIdx = idx - 1;
      if (!processed[nIdx]) {
        const offset = nIdx * 4;
        if (data[offset + 3] !== 0 && 
            rgbDistance(data[offset], data[offset + 1], data[offset + 2], targetR, targetG, targetB) <= rgbTolerance) {
          processed[nIdx] = 1;
          stack.push([x - 1, y]);
        }
      }
    }
    if (y + 1 < h) {
      const nIdx = idx + w;
      if (!processed[nIdx]) {
        const offset = nIdx * 4;
        if (data[offset + 3] !== 0 && 
            rgbDistance(data[offset], data[offset + 1], data[offset + 2], targetR, targetG, targetB) <= rgbTolerance) {
          processed[nIdx] = 1;
          stack.push([x, y + 1]);
        }
      }
    }
    if (y - 1 >= 0) {
      const nIdx = idx - w;
      if (!processed[nIdx]) {
        const offset = nIdx * 4;
        if (data[offset + 3] !== 0 && 
            rgbDistance(data[offset], data[offset + 1], data[offset + 2], targetR, targetG, targetB) <= rgbTolerance) {
          processed[nIdx] = 1;
          stack.push([x, y - 1]);
        }
      }
    }
  }

  // 穴埋め（簡略化版 - 大きい画像ではスキップ）
  if (fillHoles && pixelCount < 500000) {
    const outsideTransparent = new Uint8Array(w * h);
    const borderSeeds: [number, number][] = [];
    
    for (let x = 0; x < w; x++) {
      if (data[x * 4 + 3] === 0) borderSeeds.push([x, 0]);
      if (data[((h - 1) * w + x) * 4 + 3] === 0) borderSeeds.push([x, h - 1]);
    }
    for (let y = 1; y < h - 1; y++) {
      if (data[(y * w) * 4 + 3] === 0) borderSeeds.push([0, y]);
      if (data[(y * w + (w - 1)) * 4 + 3] === 0) borderSeeds.push([w - 1, y]);
    }

    for (const [sx, sy] of borderSeeds) {
      const seedIdx = sy * w + sx;
      if (!outsideTransparent[seedIdx]) {
        const tStack: [number, number][] = [[sx, sy]];
        outsideTransparent[seedIdx] = 1;
        
        while (tStack.length > 0) {
          const [tx, ty] = tStack.pop()!;
          const tIdx = ty * w + tx;
          
          // インライン展開で高速化
          if (tx + 1 < w) {
            const nIdx = tIdx + 1;
            if (!outsideTransparent[nIdx] && data[nIdx * 4 + 3] === 0) {
              outsideTransparent[nIdx] = 1;
              tStack.push([tx + 1, ty]);
            }
          }
          if (tx - 1 >= 0) {
            const nIdx = tIdx - 1;
            if (!outsideTransparent[nIdx] && data[nIdx * 4 + 3] === 0) {
              outsideTransparent[nIdx] = 1;
              tStack.push([tx - 1, ty]);
            }
          }
          if (ty + 1 < h) {
            const nIdx = tIdx + w;
            if (!outsideTransparent[nIdx] && data[nIdx * 4 + 3] === 0) {
              outsideTransparent[nIdx] = 1;
              tStack.push([tx, ty + 1]);
            }
          }
          if (ty - 1 >= 0) {
            const nIdx = tIdx - w;
            if (!outsideTransparent[nIdx] && data[nIdx * 4 + 3] === 0) {
              outsideTransparent[nIdx] = 1;
              tStack.push([tx, ty - 1]);
            }
          }
        }
      }
    }

    // 穴を検出して透過（高速版 - RGB距離）
    const checkedForHoles = new Uint8Array(w * h);
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const offset = idx * 4;
        
        if (checkedForHoles[idx] || data[offset + 3] === 0) continue;
        
        // エッジ保護
        if (edgeDistance && edgeDistance[idx] < EDGE_SAFE_MARGIN) {
          checkedForHoles[idx] = 1;
          continue;
        }
        
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        
        if (rgbDistance(r, g, b, targetR, targetG, targetB) <= rgbTolerance) {
          const holePixels: number[] = [];
          const holeStack: [number, number][] = [[x, y]];
          checkedForHoles[idx] = 1;
          let touchesOutside = false;
          let touchesEdge = false;
          
          // 穴のサイズ制限（無限ループ防止）
          const maxHoleSize = 10000;
          
          while (holeStack.length > 0 && holePixels.length < maxHoleSize) {
            const [hx, hy] = holeStack.pop()!;
            const hIdx = hy * w + hx;
            
            if (edgeDistance && edgeDistance[hIdx] < EDGE_SAFE_MARGIN) {
              touchesEdge = true;
            }
            
            holePixels.push(hIdx);
            
            // 4方向チェック
            const checkNeighbor = (nx: number, ny: number) => {
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = ny * w + nx;
                
                if (outsideTransparent[nIdx]) {
                  touchesOutside = true;
                }
                
                if (!checkedForHoles[nIdx]) {
                  const nOffset = nIdx * 4;
                  if (data[nOffset + 3] !== 0) {
                    if (rgbDistance(data[nOffset], data[nOffset + 1], data[nOffset + 2], targetR, targetG, targetB) <= rgbTolerance) {
                      checkedForHoles[nIdx] = 1;
                      holeStack.push([nx, ny]);
                    }
                  }
                }
              }
            };
            
            checkNeighbor(hx + 1, hy);
            checkNeighbor(hx - 1, hy);
            checkNeighbor(hx, hy + 1);
            checkNeighbor(hx, hy - 1);
          }
          
          if (!touchesOutside && !touchesEdge && holePixels.length > 0 && holePixels.length < maxHoleSize) {
            for (const hIdx of holePixels) {
              if (!edgeDistance || edgeDistance[hIdx] >= EDGE_SAFE_MARGIN) {
                data[hIdx * 4 + 3] = 0;
              }
            }
          }
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return { success: true, message: `背景を削除しました (RGB: ${targetR}, ${targetG}, ${targetB})` };
};
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, Download, CheckCircle, Scissors, ArrowLeft, Grid3X3, Layers, 
  Sliders, RefreshCw, Wand2, Crop, ZoomIn, ZoomOut, Sparkles, Star,
  Move, GripVertical, Settings, Eye, ChevronRight, Check, X, Maximize2,
  Undo2, Redo2, ExternalLink, Shield, FileText, Plus, Image as ImageIcon
} from 'lucide-react';
import { Sticker } from './types';
import { createMainImage, downloadStickerSet, processImage, processMultipleImages, sliceImage, TrimConfig, combineImagesVertically } from './utils/imageProcessing';
import EditorModal from './components/EditorModal';

// プライバシーポリシー・利用規約モーダル
const LegalModal: React.FC<{ type: 'privacy' | 'terms'; onClose: () => void }> = ({ type, onClose }) => {
  const isPrivacy = type === 'privacy';
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {isPrivacy ? <Shield className="text-[#06C755]" size={20} /> : <FileText className="text-[#06C755]" size={20} />}
            <h2 className="font-bold text-lg">{isPrivacy ? 'プライバシーポリシー' : '利用規約'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-600 leading-relaxed space-y-4">
          {isPrivacy ? (
            <>
              <p className="text-gray-400 text-xs">最終更新日: 2025年11月</p>
              <h3 className="font-bold text-gray-900 mt-4">1. はじめに</h3>
              <p>LINE Stamp Cutter（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。</p>
              
              <h3 className="font-bold text-gray-900 mt-4">2. 収集する情報</h3>
              <p>本サービスは、ユーザーの個人情報を<strong>一切収集しません</strong>。</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>アップロードされた画像はブラウザ内でのみ処理され、サーバーに送信されません</li>
                <li>Cookie、アクセスログ、トラッキングは使用しません</li>
                <li>アカウント登録は不要です</li>
              </ul>
              
              <h3 className="font-bold text-gray-900 mt-4">3. データの処理</h3>
              <p>すべての画像処理はユーザーのブラウザ内（クライアントサイド）で完結します。画像データが外部サーバーに送信されることはありません。</p>
              
              <h3 className="font-bold text-gray-900 mt-4">4. 第三者サービス</h3>
              <p>本サービスは以下の外部CDNを使用しています：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Google Fonts（フォント配信）</li>
                <li>cdnjs（JSZip, FileSaver ライブラリ）</li>
              </ul>
              <p className="mt-2">これらのサービスは独自のプライバシーポリシーを持っています。</p>
              
              <h3 className="font-bold text-gray-900 mt-4">5. お問い合わせ</h3>
              <p>プライバシーに関するお問い合わせは、以下までご連絡ください：</p>
              <a href="https://x.com/ikasumi_dev" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#06C755] hover:underline">
                @ikasumi_dev (X/Twitter) <ExternalLink size={12} />
              </a>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-xs">最終更新日: 2025年11月</p>
              <h3 className="font-bold text-gray-900 mt-4">1. サービスの概要</h3>
              <p>LINE Stamp Cutter（以下「本サービス」）は、画像をLINEスタンプ用にスライス・加工するための無料Webツールです。LINEスタンプを作成したいクリエイターの方に向けて制作されています。</p>
              
              <h3 className="font-bold text-gray-900 mt-4">2. 利用条件</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>本サービスは無料で利用できます</li>
                <li>アカウント登録は不要です</li>
                <li>個人利用・商用利用を問わず利用可能です</li>
              </ul>
              
              <h3 className="font-bold text-gray-900 mt-4">3. 商用利用について</h3>
              <p>本サービスで作成したスタンプは<strong>商用利用が可能</strong>です。ただし、商用利用の際は以下の条件を守ってください：</p>
              <div className="bg-[#06C755]/10 border border-[#06C755]/30 rounded-lg p-4 mt-2">
                <p className="font-medium text-gray-900">【必須】クレジット表記</p>
                <p className="mt-1">商用利用（LINEスタンプの販売等）の際は、スタンプの説明文やSNS等に以下のいずれかを明記してください：</p>
                <ul className="list-disc list-inside space-y-1 ml-2 mt-2 text-gray-700">
                  <li>「LINE Stamp Cutter を使用して作成」</li>
                  <li>「Created with LINE Stamp Cutter」</li>
                </ul>
              </div>
              
              <h3 className="font-bold text-gray-900 mt-4">4. 禁止事項</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>本サービスを利用した違法行為</li>
                <li>他者の著作権・知的財産権を侵害する画像の処理</li>
                <li>本サービスへの攻撃・妨害行為</li>
              </ul>
              
              <h3 className="font-bold text-gray-900 mt-4">5. 著作権について</h3>
              <p>ユーザーがアップロードする画像の著作権はユーザーに帰属します。著作権者の許可なく他者の画像を使用しないでください。</p>
              
              <h3 className="font-bold text-gray-900 mt-4">6. 免責事項</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>本サービスは「現状のまま」提供され、いかなる保証もありません</li>
                <li>本サービスの利用により生じた損害について、運営者は責任を負いません</li>
                <li>サービスの内容は予告なく変更・終了する場合があります</li>
              </ul>
              
              <h3 className="font-bold text-gray-900 mt-4">7. LINEスタンプについて</h3>
              <p>LINEスタンプの審査・販売についてはLINE株式会社の規約に従ってください。本サービスはLINE株式会社とは無関係の第三者ツールです。</p>
              
              <h3 className="font-bold text-gray-900 mt-4">8. お問い合わせ</h3>
              <p>ご質問・ご要望は以下までご連絡ください：</p>
              <a href="https://x.com/ikasumi_dev" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#06C755] hover:underline">
                @ikasumi_dev (X/Twitter) <ExternalLink size={12} />
              </a>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="w-full py-3 bg-[#06C755] text-white rounded-xl font-bold hover:bg-[#05B04C] transition-colors">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [mainImageIndex, setMainImageIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  
  const [layout, setLayout] = useState({ cols: 6, rows: 4 });
  const [trim, setTrim] = useState<TrimConfig>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [gap, setGap] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  
  // グリッド線の個別位置（0-1の範囲で正規化）
  const [colLines, setColLines] = useState<number[]>([]);
  const [rowLines, setRowLines] = useState<number[]>([]);
  const [useCustomLines, setUseCustomLines] = useState(false);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [editingStickerId, setEditingStickerId] = useState<number | null>(null);
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draggingLine, setDraggingLine] = useState<{ type: 'col' | 'row', index: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showResetModal, setShowResetModal] = useState(false);
  const [showGridEditor, setShowGridEditor] = useState(false);
  const [gridEditorZoom, setGridEditorZoom] = useState(1);
  const [gridEditorPan, setGridEditorPan] = useState({ x: 0, y: 0 });
  const [isGridEditorPanning, setIsGridEditorPanning] = useState(false);
  const [gridEditorPanStart, setGridEditorPanStart] = useState({ x: 0, y: 0 });
  const [draggingLineGrid, setDraggingLineGrid] = useState<{ type: 'col' | 'row', index: number } | null>(null);
  
  // Undo履歴
  const [gridHistory, setGridHistory] = useState<{ colLines: number[], rowLines: number[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addImageInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const gridEditorImageRef = useRef<HTMLImageElement>(null);

  // 等間隔のグリッド線を初期化
  const initializeGridLines = useCallback((cols: number, rows: number) => {
    const newColLines: number[] = [];
    const newRowLines: number[] = [];
    
    for (let i = 1; i < cols; i++) {
      newColLines.push(i / cols);
    }
    for (let i = 1; i < rows; i++) {
      newRowLines.push(i / rows);
    }
    
    setColLines(newColLines);
    setRowLines(newRowLines);
    // 履歴をクリア
    setGridHistory([]);
    setHistoryIndex(-1);
  }, []);

  // グリッド履歴を保存
  const saveGridHistory = useCallback(() => {
    const currentState = { colLines: [...colLines], rowLines: [...rowLines] };
    setGridHistory(prev => {
      // 現在位置より後の履歴を削除して新しい状態を追加
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      // 最大20件まで保持
      if (newHistory.length > 20) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [colLines, rowLines, historyIndex]);

  // Undo
  const undoGridChange = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = gridHistory[historyIndex - 1];
      setColLines(prevState.colLines);
      setRowLines(prevState.rowLines);
      setHistoryIndex(prev => prev - 1);
      setUseCustomLines(true);
    } else if (historyIndex === 0 && gridHistory.length > 0) {
      // 最初の状態に戻す（元のグリッド）
      initializeGridLines(layout.cols, layout.rows);
      setUseCustomLines(false);
    }
  }, [historyIndex, gridHistory, layout.cols, layout.rows, initializeGridLines]);

  // Redo
  const redoGridChange = useCallback(() => {
    if (historyIndex < gridHistory.length - 1) {
      const nextState = gridHistory[historyIndex + 1];
      setColLines(nextState.colLines);
      setRowLines(nextState.rowLines);
      setHistoryIndex(prev => prev + 1);
      setUseCustomLines(true);
    }
  }, [historyIndex, gridHistory]);

  // レイアウト変更時にグリッド線を再初期化
  useEffect(() => {
    if (!useCustomLines) {
      initializeGridLines(layout.cols, layout.rows);
    }
  }, [layout.cols, layout.rows, useCustomLines, initializeGridLines]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    try {
      let result;
      
      if (files.length === 1) {
        // 単一ファイルの場合
        result = await processImage(files[0]);
      } else {
        // 複数ファイルの場合：縦に結合
        const fileArray = Array.from(files);
        result = await processMultipleImages(fileArray);
      }
      
      const { stickers: slicedDataUrls, firstImageSrc, layout: detectedLayout } = result;

      setUploadedImage(firstImageSrc);
      setLayout(detectedLayout);
      setTrim({ top: 0, bottom: 0, left: 0, right: 0 });
      setGap({ x: 0, y: 0 });
      setZoomLevel(1);
      setUseCustomLines(false);
      initializeGridLines(detectedLayout.cols, detectedLayout.rows);
      
      const newStickers: Sticker[] = slicedDataUrls.map((url, index) => ({
        id: index,
        originalIndex: index,
        dataUrl: url,
        isMain: false
      }));
      
      setStickers(newStickers);
      
      if (newStickers.length > 0) {
         handleSetMainImage(0, newStickers[0].dataUrl);
      }
      
    } catch (error) {
      console.error("Error processing image", error);
      alert("画像の処理中にエラーが発生しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDrop = async (files: File[]) => {
    // 画像ファイルのみフィルタ
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('画像ファイルをアップロードしてください。');
      return;
    }

    setIsProcessing(true);
    
    try {
      let result;
      
      if (imageFiles.length === 1) {
        result = await processImage(imageFiles[0]);
      } else {
        result = await processMultipleImages(imageFiles);
      }
      
      const { stickers: slicedDataUrls, firstImageSrc, layout: detectedLayout } = result;

      setUploadedImage(firstImageSrc);
      setLayout(detectedLayout);
      setTrim({ top: 0, bottom: 0, left: 0, right: 0 });
      setGap({ x: 0, y: 0 });
      setZoomLevel(1);
      setUseCustomLines(false);
      initializeGridLines(detectedLayout.cols, detectedLayout.rows);
      
      const newStickers: Sticker[] = slicedDataUrls.map((url, index) => ({
        id: index,
        originalIndex: index,
        dataUrl: url,
        isMain: false
      }));
      
      setStickers(newStickers);
      
      if (newStickers.length > 0) {
         handleSetMainImage(0, newStickers[0].dataUrl);
      }
      
    } catch (error) {
      console.error("Error processing image", error);
      alert("画像の処理中にエラーが発生しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  // 既存の画像に追加の画像を結合する
  const handleAddImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !uploadedImage) return;

    setIsProcessing(true);

    try {
      // 現在の画像をBlobに変換
      const currentImageBlob = await fetch(uploadedImage).then(r => r.blob());
      const currentImageFile = new File([currentImageBlob], 'current.png', { type: 'image/png' });
      
      // 新しいファイルを結合
      const allFiles = [currentImageFile, ...Array.from(files)];
      const combinedDataUrl = await combineImagesVertically(allFiles);
      
      // 結合された画像を処理
      const img = new Image();
      img.onload = async () => {
        // 現在のレイアウトを維持しつつ行数を追加ファイル分増やす
        const newRows = layout.rows + files.length; // 追加画像1枚につき1行増やす（簡易的な推定）
        const newLayout = { cols: layout.cols, rows: newRows };
        
        setUploadedImage(combinedDataUrl);
        setLayout(newLayout);
        setUseCustomLines(false);
        initializeGridLines(newLayout.cols, newLayout.rows);
        
        const slices = await sliceImage(img, newLayout.cols, newLayout.rows, trim, gap);
        const newStickers: Sticker[] = slices.map((url, index) => ({
          id: index,
          originalIndex: index,
          dataUrl: url,
          isMain: false
        }));
        
        setStickers(newStickers);
        
        if (newStickers.length > 0 && mainImageIndex >= 0 && mainImageIndex < newStickers.length) {
          handleSetMainImage(mainImageIndex, newStickers[mainImageIndex].dataUrl);
        } else if (newStickers.length > 0) {
          handleSetMainImage(0, newStickers[0].dataUrl);
        }
        
        setIsProcessing(false);
      };
      img.onerror = () => {
        alert("画像の結合中にエラーが発生しました。");
        setIsProcessing(false);
      };
      img.src = combinedDataUrl;
      
    } catch (error) {
      console.error("Error adding images", error);
      alert("画像の追加中にエラーが発生しました。");
      setIsProcessing(false);
    }
    
    // 入力をリセット
    if (addImageInputRef.current) {
      addImageInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileDrop(Array.from(files));
    }
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = () => {
    setUploadedImage(null);
    setStickers([]);
    setMainImage(null);
    setMainImageIndex(-1);
    setLayout({ cols: 6, rows: 4 });
    setTrim({ top: 0, bottom: 0, left: 0, right: 0 });
    setGap({ x: 0, y: 0 });
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setEditingStickerId(null);
    setIsEditingSource(false);
    setUseCustomLines(false);
    setShowResetModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // カスタムグリッド線を使ってスライス
  const sliceWithCustomLines = useCallback(async (
    src: string, 
    colPositions: number[], 
    rowPositions: number[],
    trimConfig: TrimConfig
  ) => {
    return new Promise<string[]>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const stickers: string[] = [];
        
        const imgW = img.width;
        const imgH = img.height;
        
        // トリミング適用
        const trimmedX = imgW * trimConfig.left;
        const trimmedY = imgH * trimConfig.top;
        const trimmedW = imgW * (1 - trimConfig.left - trimConfig.right);
        const trimmedH = imgH * (1 - trimConfig.top - trimConfig.bottom);
        
        // 列の境界（0と1を含む）
        const colBounds = [0, ...colPositions, 1];
        // 行の境界（0と1を含む）
        const rowBounds = [0, ...rowPositions, 1];
        
        const targetW = 370;
        const targetH = 320;
        
        for (let r = 0; r < rowBounds.length - 1; r++) {
          for (let c = 0; c < colBounds.length - 1; c++) {
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.clearRect(0, 0, targetW, targetH);
              
              const sx = trimmedX + colBounds[c] * trimmedW;
              const sy = trimmedY + rowBounds[r] * trimmedH;
              const sw = (colBounds[c + 1] - colBounds[c]) * trimmedW;
              const sh = (rowBounds[r + 1] - rowBounds[r]) * trimmedH;
              
              ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
              stickers.push(canvas.toDataURL('image/png', 1.0));
            }
          }
        }
        
        resolve(stickers);
      };
      img.src = src;
    });
  }, []);

  const updateStickers = useCallback(async (src: string, c: number, r: number, t: TrimConfig, g: {x:number, y:number}) => {
    setIsProcessing(true);
    
    if (useCustomLines && colLines.length > 0 && rowLines.length > 0) {
      // カスタムグリッド線を使用
      const slicedDataUrls = await sliceWithCustomLines(src, colLines, rowLines, t);
      const newStickers = slicedDataUrls.map((url, index) => ({
        id: index,
        originalIndex: index,
        dataUrl: url,
        isMain: false
      }));
      setStickers(newStickers);
      
      if (mainImageIndex >= 0 && mainImageIndex < newStickers.length) {
        handleSetMainImage(mainImageIndex, newStickers[mainImageIndex].dataUrl);
      } else if (newStickers.length > 0) {
        handleSetMainImage(0, newStickers[0].dataUrl);
      }
      setIsProcessing(false);
    } else {
      // 通常のスライス
      const img = new Image();
      img.onload = async () => {
        const slicedDataUrls = await sliceImage(img, c, r, t, g);
        const newStickers = slicedDataUrls.map((url, index) => ({
          id: index,
          originalIndex: index,
          dataUrl: url,
          isMain: false
        }));
        setStickers(newStickers);
        
        if (mainImageIndex >= 0 && mainImageIndex < newStickers.length) {
          handleSetMainImage(mainImageIndex, newStickers[mainImageIndex].dataUrl);
        } else if (newStickers.length > 0) {
          handleSetMainImage(0, newStickers[0].dataUrl);
        }
        setIsProcessing(false);
      };
      img.src = src;
    }
  }, [useCustomLines, colLines, rowLines, mainImageIndex, sliceWithCustomLines]);

  // Undo/Redo後にスタンプを更新（グリッドエディターが開いていない時のみ）
  const undoAndUpdate = useCallback(() => {
    undoGridChange();
    // 少し遅延させて状態が更新されてからスタンプを更新
    setTimeout(() => {
      if (uploadedImage && !showGridEditor) {
        updateStickers(uploadedImage, layout.cols, layout.rows, trim, gap);
      }
    }, 50);
  }, [undoGridChange, uploadedImage, showGridEditor, updateStickers, layout.cols, layout.rows, trim, gap]);

  const redoAndUpdate = useCallback(() => {
    redoGridChange();
    setTimeout(() => {
      if (uploadedImage && !showGridEditor) {
        updateStickers(uploadedImage, layout.cols, layout.rows, trim, gap);
      }
    }, 50);
  }, [redoGridChange, uploadedImage, showGridEditor, updateStickers, layout.cols, layout.rows, trim, gap]);

  const handleLayoutChange = (newCols: number, newRows: number) => {
    setLayout({ cols: newCols, rows: newRows });
    setUseCustomLines(false);
    initializeGridLines(newCols, newRows);
    if (uploadedImage) {
      updateStickers(uploadedImage, newCols, newRows, trim, gap);
    }
  };

  const handleTrimChange = (key: keyof TrimConfig, value: number) => {
    const percent = value / 100;
    const newTrim = { ...trim, [key]: percent };
    
    if (key === 'left' && newTrim.left + newTrim.right >= 0.9) return;
    if (key === 'right' && newTrim.left + newTrim.right >= 0.9) return;
    if (key === 'top' && newTrim.top + newTrim.bottom >= 0.9) return;
    if (key === 'bottom' && newTrim.top + newTrim.bottom >= 0.9) return;

    setTrim(newTrim);
    
    if (uploadedImage) {
      updateStickers(uploadedImage, layout.cols, layout.rows, newTrim, gap);
    }
  };

  const handleGapChange = (key: 'x' | 'y', value: number) => {
    const percent = value / 100;
    const newGap = { ...gap, [key]: percent };
    setGap(newGap);
    if (uploadedImage) {
       updateStickers(uploadedImage, layout.cols, layout.rows, trim, newGap);
    }
  };

  // グリッド線のドラッグ処理（マウス・タッチ共通）
  const handleLineMouseDown = (type: 'col' | 'row', index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // ドラッグ開始時に現在の状態を保存
    saveGridHistory();
    setDraggingLine({ type, index });
    setUseCustomLines(true);
  };

  const handleLineTouchStart = (type: 'col' | 'row', index: number) => (e: React.TouchEvent) => {
    e.stopPropagation();
    saveGridHistory();
    setDraggingLine({ type, index });
    setUseCustomLines(true);
  };

  // マウス・タッチ共通の座標処理
  const handleLineDrag = useCallback((clientX: number, clientY: number) => {
    if (!draggingLine || !previewRef.current || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    
    if (draggingLine.type === 'col') {
      const x = (clientX - rect.left) / rect.width;
      const clampedX = Math.max(0.05, Math.min(0.95, x));
      
      setColLines(prev => {
        const newLines = [...prev];
        newLines[draggingLine.index] = clampedX;
        return newLines.sort((a, b) => a - b);
      });
    } else {
      const y = (clientY - rect.top) / rect.height;
      const clampedY = Math.max(0.05, Math.min(0.95, y));
      
      setRowLines(prev => {
        const newLines = [...prev];
        newLines[draggingLine.index] = clampedY;
        return newLines.sort((a, b) => a - b);
      });
    }
  }, [draggingLine]);

  const handleLineMouseMove = useCallback((e: MouseEvent) => {
    handleLineDrag(e.clientX, e.clientY);
  }, [handleLineDrag]);

  const handleLineTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleLineDrag(touch.clientX, touch.clientY);
    }
  }, [handleLineDrag]);

  const handleLineMouseMoveOld = useCallback((e: MouseEvent) => {
    if (!draggingLine || !previewRef.current || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    
    if (draggingLine.type === 'col') {
      const x = (e.clientX - rect.left) / rect.width;
      const clampedX = Math.max(0.05, Math.min(0.95, x));
      
      setColLines(prev => {
        const newLines = [...prev];
        newLines[draggingLine.index] = clampedX;
        // ソートして順序を維持
        return newLines.sort((a, b) => a - b);
      });
    } else {
      const y = (e.clientY - rect.top) / rect.height;
      const clampedY = Math.max(0.05, Math.min(0.95, y));
      
      setRowLines(prev => {
        const newLines = [...prev];
        newLines[draggingLine.index] = clampedY;
        return newLines.sort((a, b) => a - b);
      });
    }
  }, [draggingLine]);

  const handleLineMouseUp = useCallback(() => {
    if (draggingLine && uploadedImage) {
      updateStickers(uploadedImage, layout.cols, layout.rows, trim, gap);
    }
    setDraggingLine(null);
  }, [draggingLine, uploadedImage, layout, trim, gap, updateStickers]);

  useEffect(() => {
    if (draggingLine) {
      window.addEventListener('mousemove', handleLineMouseMove);
      window.addEventListener('mouseup', handleLineMouseUp);
      window.addEventListener('touchmove', handleLineTouchMove, { passive: false });
      window.addEventListener('touchend', handleLineMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleLineMouseMove);
        window.removeEventListener('mouseup', handleLineMouseUp);
        window.removeEventListener('touchmove', handleLineTouchMove);
        window.removeEventListener('touchend', handleLineMouseUp);
      };
    }
  }, [draggingLine, handleLineMouseMove, handleLineMouseUp, handleLineTouchMove]);

  // グリッド線をリセット
  const resetGridLines = useCallback(() => {
    // 現在の状態を履歴に保存してからリセット
    if (useCustomLines) {
      saveGridHistory();
    }
    setUseCustomLines(false);
    initializeGridLines(layout.cols, layout.rows);
    if (uploadedImage) {
      updateStickers(uploadedImage, layout.cols, layout.rows, trim, gap);
    }
  }, [saveGridHistory, useCustomLines, initializeGridLines, layout.cols, layout.rows, uploadedImage, trim, gap, updateStickers]);

  // プレビューのスクロール/パン（ドラッグ・タッチで移動）
  const handlePreviewMouseDown = (e: React.MouseEvent) => {
    if (draggingLine) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handlePreviewTouchStart = (e: React.TouchEvent) => {
    if (draggingLine) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
    }
  };

  // ホイールでズーム
  const handlePreviewWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.min(Math.max(0.5, prev + delta), 3));
  };

  const handlePanMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  }, [isPanning, panStart]);

  const handlePanTouchMove = useCallback((e: TouchEvent) => {
    if (!isPanning || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setPanOffset({
      x: touch.clientX - panStart.x,
      y: touch.clientY - panStart.y
    });
  }, [isPanning, panStart]);

  const handlePanMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handlePanMouseMove);
      window.addEventListener('mouseup', handlePanMouseUp);
      window.addEventListener('touchmove', handlePanTouchMove, { passive: false });
      window.addEventListener('touchend', handlePanMouseUp);
      return () => {
        window.removeEventListener('mousemove', handlePanMouseMove);
        window.removeEventListener('mouseup', handlePanMouseUp);
        window.removeEventListener('touchmove', handlePanTouchMove);
        window.removeEventListener('touchend', handlePanMouseUp);
      };
    }
  }, [isPanning, handlePanMouseMove, handlePanMouseUp, handlePanTouchMove]);

  // ズームリセット時にパンもリセット
  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // グリッドエディター用のハンドラー
  const handleGridEditorMouseDown = (e: React.MouseEvent) => {
    if (draggingLineGrid) return;
    e.preventDefault();
    setIsGridEditorPanning(true);
    setGridEditorPanStart({ x: e.clientX - gridEditorPan.x, y: e.clientY - gridEditorPan.y });
  };

  const handleGridEditorTouchStart = (e: React.TouchEvent) => {
    if (draggingLineGrid) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsGridEditorPanning(true);
      setGridEditorPanStart({ x: touch.clientX - gridEditorPan.x, y: touch.clientY - gridEditorPan.y });
    }
  };

  // グリッドエディターのライン/パン移動（共通座標処理）
  const handleGridEditorDrag = useCallback((clientX: number, clientY: number) => {
    if (draggingLineGrid && gridEditorImageRef.current) {
      const rect = gridEditorImageRef.current.getBoundingClientRect();
      
      const trimmedLeft = rect.left + rect.width * trim.left;
      const trimmedTop = rect.top + rect.height * trim.top;
      const trimmedWidth = rect.width * (1 - trim.left - trim.right);
      const trimmedHeight = rect.height * (1 - trim.top - trim.bottom);
      
      if (draggingLineGrid.type === 'col') {
        const x = (clientX - trimmedLeft) / trimmedWidth;
        const clampedX = Math.max(0.02, Math.min(0.98, x));
        
        setColLines(prev => {
          const newLines = [...prev];
          const targetIndex = Math.min(draggingLineGrid.index, newLines.length - 1);
          if (targetIndex >= 0) {
            newLines[targetIndex] = clampedX;
          }
          return newLines.sort((a, b) => a - b);
        });
      } else {
        const y = (clientY - trimmedTop) / trimmedHeight;
        const clampedY = Math.max(0.02, Math.min(0.98, y));
        
        setRowLines(prev => {
          const newLines = [...prev];
          const targetIndex = Math.min(draggingLineGrid.index, newLines.length - 1);
          if (targetIndex >= 0) {
            newLines[targetIndex] = clampedY;
          }
          return newLines.sort((a, b) => a - b);
        });
      }
      return;
    }
    
    if (isGridEditorPanning) {
      setGridEditorPan({
        x: clientX - gridEditorPanStart.x,
        y: clientY - gridEditorPanStart.y
      });
    }
  }, [draggingLineGrid, isGridEditorPanning, gridEditorPanStart, trim]);

  const handleGridEditorGlobalMouseMove = useCallback((e: MouseEvent) => {
    handleGridEditorDrag(e.clientX, e.clientY);
  }, [handleGridEditorDrag]);

  const handleGridEditorGlobalTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      handleGridEditorDrag(touch.clientX, touch.clientY);
    }
  }, [handleGridEditorDrag]);

  const handleGridEditorGlobalMouseUp = useCallback(() => {
    setIsGridEditorPanning(false);
    setDraggingLineGrid(null);
  }, []);

  useEffect(() => {
    if (showGridEditor && (isGridEditorPanning || draggingLineGrid)) {
      window.addEventListener('mousemove', handleGridEditorGlobalMouseMove);
      window.addEventListener('mouseup', handleGridEditorGlobalMouseUp);
      window.addEventListener('touchmove', handleGridEditorGlobalTouchMove, { passive: false });
      window.addEventListener('touchend', handleGridEditorGlobalMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleGridEditorGlobalMouseMove);
        window.removeEventListener('mouseup', handleGridEditorGlobalMouseUp);
        window.removeEventListener('touchmove', handleGridEditorGlobalTouchMove);
        window.removeEventListener('touchend', handleGridEditorGlobalMouseUp);
      };
    }
  }, [showGridEditor, isGridEditorPanning, draggingLineGrid, handleGridEditorGlobalMouseMove, handleGridEditorGlobalMouseUp, handleGridEditorGlobalTouchMove]);

  const handleGridEditorWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setGridEditorZoom(prev => Math.min(Math.max(0.3, prev + delta), 5));
  };

  // グリッドエディターでのライン移動開始（マウス・タッチ共通）
  const handleGridEditorLineMouseDown = (type: 'col' | 'row', index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    saveGridHistory();
    setDraggingLineGrid({ type, index });
    setUseCustomLines(true);
  };

  const handleGridEditorLineTouchStart = (type: 'col' | 'row', index: number) => (e: React.TouchEvent) => {
    e.stopPropagation();
    saveGridHistory();
    setDraggingLineGrid({ type, index });
    setUseCustomLines(true);
  };

  const openGridEditor = () => {
    setGridEditorZoom(1);
    setGridEditorPan({ x: 0, y: 0 });
    setShowGridEditor(true);
  };

  const closeGridEditor = () => {
    setShowGridEditor(false);
    if (uploadedImage) {
      updateStickers(uploadedImage, layout.cols, layout.rows, trim, gap);
    }
  };

  const handleSwapDimensions = () => {
    handleLayoutChange(layout.rows, layout.cols);
  };

  const handleSetMainImage = async (index: number, dataUrl: string) => {
    setMainImageIndex(index);
    try {
      const resized = await createMainImage(dataUrl);
      setMainImage(resized);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    if (stickers.length === 0) return;
    downloadStickerSet(stickers, mainImage);
  };

  const handleSaveEditedSticker = (newSrc: string) => {
    if (editingStickerId !== null) {
      setStickers(prev => prev.map(s => {
        if (s.id === editingStickerId) {
          return { ...s, dataUrl: newSrc };
        }
        return s;
      }));

      if (editingStickerId === mainImageIndex) {
        handleSetMainImage(editingStickerId, newSrc);
      }
    }
  };

  const handleSaveSourceImage = (newSrc: string) => {
    setUploadedImage(newSrc);
    updateStickers(newSrc, layout.cols, layout.rows, trim, gap);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(Math.max(0.5, prev + delta), 3));
  };

  const LayoutPresetButton = ({ c, r, label }: { c: number, r: number, label: string }) => (
    <button 
      onClick={() => handleLayoutChange(c, r)}
      className={`px-4 py-3 rounded-xl text-xs font-bold border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1 hover-lift
        ${layout.cols === c && layout.rows === r 
          ? 'text-white border-transparent shadow-line gradient-line' 
          : 'bg-white text-gray-600 border-gray-100 hover:border-[#06C755] hover:text-[#06C755]'}`}
    >
      <span className="block text-sm font-bold">{label}</span>
      <span className={`block text-[10px] ${layout.cols === c && layout.rows === r ? 'text-white/80' : 'text-gray-400'}`}>
        {c} × {r}
      </span>
    </button>
  );

  // ホーム画面
  if (!uploadedImage) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900 overflow-hidden">
        {/* Premium Navbar */}
        <nav className="glass border-b border-gray-100 sticky top-0 z-50 animate-fade-in-down">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl gradient-line flex items-center justify-center shadow-line animate-pulse-slow">
                  <Scissors size={24} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Star size={10} className="text-yellow-800" fill="currentColor" />
                </div>
              </div>
              <div>
                <h1 className="font-bold text-xl tracking-tight text-gray-900">LINE Stamp Cutter</h1>
                <p className="text-xs text-gray-400 font-medium">スタンプ切り出しツール</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <a href="https://creator.line.me/" target="_blank" rel="noopener noreferrer" 
                className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#06C755] transition-colors">
                LINE Creators Market
                <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="flex-1 relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-dots opacity-30" />
          <div className="absolute top-0 left-0 right-0 h-[600px] gradient-hero" />
          
          {/* Floating Elements */}
          <div className="absolute top-32 left-[10%] w-20 h-20 rounded-3xl bg-[#06C755]/10 animate-float delay-100" style={{ animationDelay: '0s' }} />
          <div className="absolute top-48 right-[15%] w-16 h-16 rounded-2xl bg-[#06C755]/10 animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-72 left-[20%] w-12 h-12 rounded-xl bg-yellow-400/20 animate-float" style={{ animationDelay: '2s' }} />
          
          <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32">
            {/* Badge */}
            <div className="flex justify-center mb-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-white shadow-premium border border-gray-100">
                <div className="w-2 h-2 rounded-full bg-[#06C755] animate-pulse" />
                <span className="text-gray-600">LINE Creators Market 完全対応</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#06C755] text-white">PRO</span>
              </div>
            </div>

            {/* Main Title */}
            <div className="text-center space-y-6 mb-16">
              <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight animate-fade-in-up delay-100">
                スタンプ画像を
                <br />
                <span className="text-gradient">プロ品質</span>で作成
              </h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
                画像をアップロードするだけで、AIが自動で最適な分割を検出。
                <br className="hidden md:block" />
                グリッド線を自由に調整して、完璧なスタンプセットを作成できます。
              </p>
            </div>

            {/* Upload Area */}
            <div className="max-w-xl mx-auto animate-fade-in-scale delay-300">
              <div 
                className="group relative cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className={`relative bg-white rounded-3xl p-12 transition-all duration-500 shadow-premium-lg border-2 border-dashed
                  ${isDragging 
                    ? 'border-[#06C755] bg-[#E8F8EE] scale-[1.02] shadow-line-lg' 
                    : 'border-gray-200 hover:border-[#06C755] hover:shadow-line'}`}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                  
                  <div className="flex flex-col items-center gap-6">
                    {isProcessing ? (
                      <div className="spinner" />
                    ) : (
                      <>
                        <div className={`relative transition-all duration-500 ${isDragging ? 'scale-110' : 'group-hover:scale-105'}`}>
                          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-300
                            ${isDragging ? 'gradient-line shadow-line-lg' : 'bg-[#E8F8EE]'}`}>
                            <Upload size={40} className={isDragging ? 'text-white' : 'text-[#06C755]'} />
                          </div>
                          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center">
                            <Sparkles size={20} className="text-[#06C755]" />
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <h3 className={`text-2xl font-bold mb-2 transition-colors ${isDragging ? 'text-[#06C755]' : 'text-gray-900'}`}>
                            {isDragging ? 'ドロップしてアップロード' : '画像をアップロード'}
                          </h3>
                          <p className="text-gray-400 mb-2">クリックまたはドラッグ＆ドロップ</p>
                          <p className="text-xs text-[#06C755] font-medium mb-4 flex items-center justify-center gap-1">
                            <Plus size={12} /> 複数画像を選択すると縦に結合されます
                          </p>
                          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                            <span className="px-2 py-1 rounded bg-gray-100">PNG</span>
                            <span className="px-2 py-1 rounded bg-gray-100">JPG</span>
                            <span className="px-2 py-1 rounded bg-gray-100">WEBP</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Decorative corners */}
                <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-[#06C755] rounded-tl-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-[#06C755] rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-[#06C755] rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-[#06C755] rounded-br-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
              {[
                { icon: Grid3X3, title: '自動グリッド検出', desc: 'AIが最適なレイアウトを自動で検出。手動で微調整も可能です。', delay: 'delay-400' },
                { icon: Wand2, title: 'ワンクリック背景透過', desc: '高精度アルゴリズムで背景を自動透過。文字も綺麗に残します。', delay: 'delay-500' },
                { icon: Download, title: 'LINE規格で出力', desc: '370×320pxに自動リサイズ。ZIPでまとめてダウンロード。', delay: 'delay-600' },
              ].map((feature, i) => (
                <div key={i} className={`card-premium rounded-2xl p-8 animate-fade-in-up ${feature.delay}`}>
                  <div className="w-14 h-14 rounded-2xl gradient-line flex items-center justify-center mb-5 shadow-line">
                    <feature.icon size={24} className="text-white" />
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 mb-2">{feature.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white py-8 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-line flex items-center justify-center">
                <Scissors size={14} className="text-white" />
              </div>
              <span className="text-sm text-gray-500">© 2024 LINE Stamp Cutter</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <button onClick={() => setLegalModal('privacy')} className="text-gray-500 hover:text-[#06C755] transition-colors">
                プライバシーポリシー
              </button>
              <button onClick={() => setLegalModal('terms')} className="text-gray-500 hover:text-[#06C755] transition-colors">
                利用規約
              </button>
              <a href="https://x.com/ikasumi_dev" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-500 hover:text-[#06C755] transition-colors">
                お問い合わせ <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </footer>

        {/* Legal Modal */}
        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      </div>
    );
  }

  // エディター画面
  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F7F8FA] text-gray-900">
      {/* Navbar */}
      <nav className="glass border-b border-gray-100 sticky top-0 z-50 animate-fade-in-down">
        <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl gradient-line flex items-center justify-center shadow-line">
              <Scissors size={20} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-base tracking-tight text-gray-900">LINE Stamp Cutter</h1>
              <p className="text-[10px] text-gray-400">スタンプ切り出しツール</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 px-4 py-2 transition-all hover:bg-gray-100 rounded-xl"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">最初に戻る</span>
            </button>
            <button 
              onClick={handleDownload}
              className="btn-premium flex items-center justify-center gap-2 gradient-line text-white px-6 py-2.5 rounded-full font-bold shadow-line transition-all active:scale-95 whitespace-nowrap text-sm"
            >
              <Download size={16} />
              ダウンロード
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row animate-fade-in">
        {/* Left Panel - Settings */}
        <div className="w-full lg:w-[480px] bg-white border-r border-gray-100 flex flex-col h-[50vh] sm:h-[55vh] lg:h-[calc(100vh-64px)] shrink-0 shadow-premium z-20 animate-slide-in-left">
          <div className="p-3 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <Settings size={18} className="text-[#06C755]" />
              グリッド設定
            </h3>
            <div className="flex items-center gap-2">
              {useCustomLines && (
                <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-[#06C755]/10 text-[#06C755]">
                  カスタム
                </span>
              )}
              <button onClick={handleSwapDimensions} className="text-xs font-semibold flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg transition-colors border border-gray-200 hover:border-[#06C755] hover:text-[#06C755] active:bg-[#E8F8EE]">
                <RefreshCw size={12} /> <span className="hidden sm:inline">縦横入替</span><span className="sm:hidden">入替</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-6 scrollbar-premium">
            {/* Preview with Draggable Grid Lines */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Eye size={12} /> プレビュー
                </label>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleZoom(-0.25)} className="p-2 sm:p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:text-[#06C755] hover:bg-[#E8F8EE] active:bg-[#06C755] active:text-white transition-colors"><ZoomOut size={14}/></button>
                  <button onClick={handleResetView} className="px-2 py-1.5 sm:py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 hover:bg-[#E8F8EE] hover:text-[#06C755] transition-colors min-w-[48px]">{Math.round(zoomLevel*100)}%</button>
                  <button onClick={() => handleZoom(0.25)} className="p-2 sm:p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:text-[#06C755] hover:bg-[#E8F8EE] active:bg-[#06C755] active:text-white transition-colors"><ZoomIn size={14}/></button>
                </div>
              </div>
              
              <div 
                ref={previewRef}
                className={`relative overflow-hidden bg-gray-100 rounded-2xl border border-gray-200 h-[160px] sm:h-[200px] flex items-center justify-center touch-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handlePreviewMouseDown}
                onTouchStart={handlePreviewTouchStart}
                onWheel={handlePreviewWheel}
              >
                <div 
                  className={`${isPanning ? '' : 'transition-transform duration-200 ease-out'}`}
                  style={{ 
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                    transformOrigin: 'center center'
                  }}
                >
                  <div className="relative inline-block">
                    <img 
                      ref={imageRef}
                      src={uploadedImage} 
                      alt="Source" 
                      className="max-w-[280px] sm:max-w-[320px] max-h-[140px] sm:max-h-[180px] w-auto h-auto block"
                      draggable={false}
                    />
                    
                    {/* Trim Overlay - トリミング範囲外を暗く */}
                    {(trim.top > 0 || trim.bottom > 0 || trim.left > 0 || trim.right > 0) && (
                      <>
                        {trim.top > 0 && <div className="absolute top-0 left-0 right-0 bg-black/50 pointer-events-none" style={{ height: `${trim.top * 100}%` }} />}
                        {trim.bottom > 0 && <div className="absolute bottom-0 left-0 right-0 bg-black/50 pointer-events-none" style={{ height: `${trim.bottom * 100}%` }} />}
                        {trim.left > 0 && <div className="absolute left-0 bg-black/50 pointer-events-none" style={{ width: `${trim.left * 100}%`, top: `${trim.top * 100}%`, bottom: `${trim.bottom * 100}%` }} />}
                        {trim.right > 0 && <div className="absolute right-0 bg-black/50 pointer-events-none" style={{ width: `${trim.right * 100}%`, top: `${trim.top * 100}%`, bottom: `${trim.bottom * 100}%` }} />}
                      </>
                    )}
                    
                    {/* Grid Overlay - トリミング範囲内にグリッド表示 */}
                    <div 
                      className="absolute pointer-events-none"
                      style={{
                        left: `${trim.left * 100}%`,
                        top: `${trim.top * 100}%`,
                        right: `${trim.right * 100}%`,
                        bottom: `${trim.bottom * 100}%`,
                      }}
                    >
                      {/* 間隔の表示 */}
                      {(gap.x > 0 || gap.y > 0) && (
                        <div className="absolute inset-0 border-2 border-dashed border-orange-400/50" />
                      )}
                      
                      {colLines.map((pos, i) => (
                        <div
                          key={`col-${i}`}
                          className="absolute top-0 bottom-0 w-0.5 bg-[#06C755]"
                          style={{ left: `${pos * 100}%` }}
                        />
                      ))}
                      {rowLines.map((pos, i) => (
                        <div
                          key={`row-${i}`}
                          className="absolute left-0 right-0 h-0.5 bg-[#06C755]"
                          style={{ top: `${pos * 100}%` }}
                        />
                      ))}
                      {/* Cell numbers */}
                      {Array.from({ length: (colLines.length + 1) * (rowLines.length + 1) }).map((_, i) => {
                        const col = i % (colLines.length + 1);
                        const row = Math.floor(i / (colLines.length + 1));
                        const colBounds = [0, ...colLines, 1];
                        const rowBounds = [0, ...rowLines, 1];
                        const left = colBounds[col] * 100;
                        const top = rowBounds[row] * 100;
                        const width = (colBounds[col + 1] - colBounds[col]) * 100;
                        const height = (rowBounds[row + 1] - rowBounds[row]) * 100;
                        
                        return (
                          <div 
                            key={`cell-${i}`}
                            className="absolute border border-[#06C755]/20 flex items-center justify-center"
                            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                          >
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-[#06C755]/80 text-white">
                              {i + 1}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Trim indicator labels */}
                    {(trim.top > 0 || trim.bottom > 0 || trim.left > 0 || trim.right > 0) && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div 
                          className="absolute border-2 border-dashed border-red-400"
                          style={{
                            left: `${trim.left * 100}%`,
                            top: `${trim.top * 100}%`,
                            right: `${trim.right * 100}%`,
                            bottom: `${trim.bottom * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Hint */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center pointer-events-none">
                  <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-[10px] text-white font-medium">
                    ドラッグで移動 • スクロールでズーム
                  </div>
                </div>
              </div>
              
              {/* Grid Editor Button */}
              <button 
                onClick={openGridEditor}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all text-sm border-2 border-[#06C755] text-[#06C755] bg-[#E8F8EE] hover:bg-[#06C755] hover:text-white"
              >
                <Maximize2 size={16} /> グリッド線を編集（大画面）
              </button>
              
              {/* Undo/Redo + Reset Grid Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={undoAndUpdate}
                  disabled={historyIndex < 0}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors border ${historyIndex >= 0 ? 'border-gray-200 text-gray-600 hover:border-[#06C755] hover:text-[#06C755]' : 'border-gray-100 text-gray-300 cursor-not-allowed'}`}
                >
                  <Undo2 size={12} /> 戻す
                </button>
                <button 
                  onClick={redoAndUpdate}
                  disabled={historyIndex >= gridHistory.length - 1}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors border ${historyIndex < gridHistory.length - 1 ? 'border-gray-200 text-gray-600 hover:border-[#06C755] hover:text-[#06C755]' : 'border-gray-100 text-gray-300 cursor-not-allowed'}`}
                >
                  <Redo2 size={12} /> やり直し
                </button>
                {useCustomLines && (
                  <button 
                    onClick={resetGridLines}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-amber-600 border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-colors"
                  >
                    <RefreshCw size={12} /> リセット
                  </button>
                )}
              </div>
            </div>

            {/* Add Image Button */}
            <div className="relative">
              <input 
                type="file" 
                ref={addImageInputRef} 
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={handleAddImages} 
              />
              <button 
                onClick={() => addImageInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all text-sm border-2 border-dashed border-[#06C755] text-[#06C755] hover:bg-[#E8F8EE] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> 画像を追加（縦に結合）
              </button>
            </div>

            {/* Background Edit Button */}
            <button 
              onClick={() => setIsEditingSource(true)} 
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all text-sm btn-premium gradient-line text-white shadow-line hover:shadow-line-lg"
            >
              <Wand2 size={16} /> 背景を一括編集
            </button>

            {/* Advanced Settings (Collapsible) - グリッド設定 */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Crop size={14} />
                  グリッド詳細設定
                </span>
                <ChevronRight size={16} className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              </button>
              
              {showAdvanced && (
                <div className="p-4 border-t border-gray-200 space-y-4 animate-fade-in">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600">トリミング (%)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['top', 'bottom', 'left', 'right'] as const).map((key) => (
                        <div key={key}>
                          <div className="text-[10px] text-gray-400 mb-1">{key === 'top' ? '上' : key === 'bottom' ? '下' : key === 'left' ? '左' : '右'}</div>
                          <input 
                            type="range" 
                            min="0" 
                            max="45" 
                            step="0.5" 
                            value={trim[key] * 100} 
                            onChange={(e) => handleTrimChange(key, parseFloat(e.target.value))} 
                            className="w-full" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600">間隔 (%)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['x', 'y'] as const).map((key) => (
                        <div key={key}>
                          <div className="text-[10px] text-gray-400 mb-1">{key === 'x' ? '横' : '縦'}</div>
                          <input 
                            type="range" 
                            min="0" 
                            max="15" 
                            step="0.5" 
                            value={gap[key] * 100} 
                            onChange={(e) => handleGapChange(key, parseFloat(e.target.value))} 
                            className="w-full" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Layout */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">クイックレイアウト</label>
              <div className="grid grid-cols-2 gap-2">
                <LayoutPresetButton c={4} r={2} label="8個" />
                <LayoutPresetButton c={2} r={4} label="8個 (縦)" />
                <LayoutPresetButton c={4} r={4} label="16個" />
                <LayoutPresetButton c={6} r={4} label="24個" />
                <LayoutPresetButton c={4} r={6} label="24個 (縦)" />
                <LayoutPresetButton c={8} r={4} label="32個" />
                <LayoutPresetButton c={4} r={8} label="32個 (縦)" />
                <LayoutPresetButton c={8} r={5} label="40個" />
              </div>
            </div>

            {/* Custom Layout */}
            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
              <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                <Sliders size={12} /> カスタムレイアウト
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <span className="text-[10px] text-gray-400 block mb-1">列 (横)</span>
                  <input 
                    type="number" 
                    min="1" 
                    max="12" 
                    value={layout.cols} 
                    onChange={(e) => handleLayoutChange(parseInt(e.target.value) || 1, layout.rows)} 
                    className="w-full bg-white border-2 border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium input-premium" 
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-gray-400 block mb-1">行 (縦)</span>
                  <input 
                    type="number" 
                    min="1" 
                    max="12" 
                    value={layout.rows} 
                    onChange={(e) => handleLayoutChange(layout.cols, parseInt(e.target.value) || 1)} 
                    className="w-full bg-white border-2 border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium input-premium" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Stickers */}
        <div className="flex-1 flex flex-col h-[50vh] sm:h-[45vh] lg:h-[calc(100vh-64px)] overflow-hidden relative animate-slide-in-right">
          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 glass z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 p-4 sm:p-8 bg-white rounded-2xl shadow-premium-lg animate-scale-in">
                <div className="spinner" />
                <span className="font-bold text-gray-600 text-sm">処理中...</span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg gradient-line flex items-center justify-center">
                <Layers size={14} className="text-white sm:w-4 sm:h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">スタンプ一覧</h3>
                <p className="text-[10px] sm:text-xs text-gray-400">{stickers.length}個のスタンプ</p>
              </div>
            </div>
          </div>

          {/* Sticker Grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 scrollbar-premium">
            {/* Main Image Card */}
            <div className="mb-4 sm:mb-6 card-premium rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center gap-3 sm:gap-5 animate-fade-in-up">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl border-2 border-[#06C755] bg-[#E8F8EE] overflow-hidden shrink-0 flex items-center justify-center shadow-line">
                {mainImage ? <img src={mainImage} alt="Main" className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400">なし</span>}
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">メイン画像</h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white gradient-line">必須</span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">ストアに表示されるアイコン</p>
              </div>
            </div>

            {/* Stickers Grid - モバイルではタップで操作 */}
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-4 pb-8">
              {stickers.map((sticker, index) => {
                const isMain = index === mainImageIndex;
                return (
                  <div 
                    key={sticker.id} 
                    className={`sticker-item relative group card-premium rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all duration-300
                      ${isMain ? 'border-[#06C755] ring-2 ring-[#06C755]/20' : 'border-transparent hover:border-[#06C755]/50'}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="aspect-[370/320] w-full bg-transparency">
                      <img src={sticker.dataUrl} alt={`Sticker ${index + 1}`} className="w-full h-full object-contain p-1 sm:p-2" draggable={false} />
                    </div>
                    
                    {/* PC: Hover Overlay / Mobile: Tap Overlay */}
                    <div className="absolute inset-0 bg-white/95 opacity-0 group-hover:opacity-100 lg:group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3">
                      <button 
                        onClick={() => setEditingStickerId(sticker.id)} 
                        className="w-full bg-white border-2 border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold hover:border-[#06C755] hover:text-[#06C755] active:bg-[#E8F8EE] transition-all flex items-center justify-center gap-1 sm:gap-2"
                      >
                        <Sliders size={12} className="sm:w-3.5 sm:h-3.5" /> 編集
                      </button>
                      <button 
                        onClick={() => handleSetMainImage(index, sticker.dataUrl)} 
                        className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-2 text-white
                          ${isMain ? 'bg-[#05A347]' : 'gradient-line hover:shadow-line active:opacity-80'}`}
                      >
                        {isMain ? <><Check size={12} className="sm:w-3.5 sm:h-3.5" /> 選択中</> : "メイン"}
                      </button>
                    </div>

                    {/* Mobile: 常に表示される操作ボタン */}
                    <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setEditingStickerId(sticker.id)} 
                          className="flex-1 bg-white/90 px-1.5 py-1 rounded text-[9px] font-bold text-gray-700 active:bg-[#E8F8EE] flex items-center justify-center gap-0.5"
                        >
                          <Sliders size={10} /> 編集
                        </button>
                        <button 
                          onClick={() => handleSetMainImage(index, sticker.dataUrl)} 
                          className={`flex-1 px-1.5 py-1 rounded text-[9px] font-bold flex items-center justify-center gap-0.5 text-white
                            ${isMain ? 'bg-[#05A347]' : 'bg-[#06C755] active:bg-[#05A347]'}`}
                        >
                          {isMain ? <Check size={10} /> : "メイン"}
                        </button>
                      </div>
                    </div>

                    {/* Number Badge */}
                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-md text-white gradient-line shadow-sm">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    
                    {/* Main Badge */}
                    {isMain && (
                      <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full gradient-line flex items-center justify-center shadow-line">
                          <Check size={10} className="text-white sm:w-3 sm:h-3" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {editingStickerId !== null && (
        <EditorModal 
          isOpen={true} 
          onClose={() => setEditingStickerId(null)} 
          imageSrc={stickers.find(s => s.id === editingStickerId)?.dataUrl || ''} 
          onSave={handleSaveEditedSticker} 
        />
      )}

      {isEditingSource && uploadedImage && (
        <EditorModal 
          isOpen={true} 
          onClose={() => setIsEditingSource(false)} 
          imageSrc={uploadedImage} 
          onSave={handleSaveSourceImage} 
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowResetModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
            {/* Header Gradient */}
            <div className="h-2 gradient-line" />
            
            <div className="p-8">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-50 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              
              {/* Content */}
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  編集内容を破棄しますか？
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  ホーム画面に戻ると、現在の編集内容は<br/>
                  すべて失われます。この操作は取り消せません。
                </p>
              </div>
              
              {/* Info Box */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#E8F8EE] flex items-center justify-center shrink-0">
                    <Layers size={18} className="text-[#06C755]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-700">
                      {stickers.length}個のスタンプ
                    </p>
                    <p className="text-xs text-gray-400">
                      編集中のデータがあります
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-6 py-3.5 rounded-xl font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25 transition-all"
                >
                  破棄して戻る
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Editor Popup Modal */}
      {showGridEditor && uploadedImage && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-gray-900/95 backdrop-blur-md animate-fade-in">
          {/* Header - モバイル対応 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-6 py-3 sm:py-4 bg-gray-900/50 border-b border-white/10 gap-2 sm:gap-0">
            {/* Top row - Title and Close/Complete */}
            <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeGridEditor}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">グリッド線エディター</h2>
                  <p className="text-[10px] sm:text-xs text-white/60 hidden sm:block">線をドラッグして位置を調整</p>
                </div>
              </div>
              
              {/* Mobile: Complete button in header */}
              <button
                onClick={closeGridEditor}
                className="sm:hidden flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#06C755] active:bg-[#05A347] text-white font-bold transition-colors"
              >
                <Check size={16} />
                完了
              </button>
            </div>
            
            {/* Bottom row on mobile / Right side on desktop - Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 overflow-x-auto pb-1 sm:pb-0">
              {/* Undo/Redo */}
              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 shrink-0">
                <button 
                  onClick={undoGridChange}
                  disabled={historyIndex < 0}
                  className={`p-2 sm:p-2.5 rounded-lg transition-colors ${historyIndex >= 0 ? 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white' : 'text-white/30 cursor-not-allowed'}`}
                  title="元に戻す"
                >
                  <Undo2 size={16} />
                </button>
                <button 
                  onClick={redoGridChange}
                  disabled={historyIndex >= gridHistory.length - 1}
                  className={`p-2 sm:p-2.5 rounded-lg transition-colors ${historyIndex < gridHistory.length - 1 ? 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white' : 'text-white/30 cursor-not-allowed'}`}
                  title="やり直す"
                >
                  <Redo2 size={16} />
                </button>
              </div>
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button 
                  onClick={() => setGridEditorZoom(z => Math.max(0.5, z - 0.25))} 
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors"
                >
                  <ZoomOut size={16} />
                </button>
                <div className="px-2 sm:px-3 py-1.5 bg-white/10 rounded-xl text-xs sm:text-sm font-bold text-white min-w-[50px] sm:min-w-[60px] text-center">
                  {Math.round(gridEditorZoom * 100)}%
                </div>
                <button 
                  onClick={() => setGridEditorZoom(z => Math.min(3, z + 0.25))} 
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors"
                >
                  <ZoomIn size={16} />
                </button>
                <button 
                  onClick={() => { setGridEditorZoom(1); setGridEditorPan({ x: 0, y: 0 }); }} 
                  className="hidden sm:block ml-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                >
                  表示リセット
                </button>
              </div>
              
              {/* Reset Grid */}
              <button 
                onClick={resetGridLines}
                className="px-3 sm:px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 text-amber-400 text-xs sm:text-sm font-medium transition-colors shrink-0"
              >
                <span className="hidden sm:inline">グリッド</span>リセット
              </button>
              
              {/* Desktop: Apply Button */}
              <button
                onClick={closeGridEditor}
                className="hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05A347] text-white font-bold transition-colors shadow-lg shadow-[#06C755]/30"
              >
                <Check size={18} />
                完了
              </button>
            </div>
          </div>
          
          {/* Editor Canvas */}
          <div 
            className={`flex-1 overflow-hidden relative touch-none ${(isGridEditorPanning || draggingLineGrid) ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleGridEditorMouseDown}
            onTouchStart={handleGridEditorTouchStart}
            onWheel={handleGridEditorWheel}
          >
            <div 
              className="absolute top-1/2 left-1/2"
              style={{ 
                transform: `translate(calc(-50% + ${gridEditorPan.x}px), calc(-50% + ${gridEditorPan.y}px)) scale(${gridEditorZoom})`,
                transformOrigin: 'center center'
              }}
            >
              <div className="relative">
                <img 
                  ref={gridEditorImageRef}
                  src={uploadedImage} 
                  alt="Grid Editor" 
                  className="max-w-none shadow-2xl rounded-lg"
                  style={{ maxHeight: 'min(70vh, calc(100dvh - 180px))', width: 'auto' }}
                  draggable={false}
                />
                
                {/* Trim Overlay - トリミング範囲外を暗く */}
                {(trim.top > 0 || trim.bottom > 0 || trim.left > 0 || trim.right > 0) && (
                  <>
                    {trim.top > 0 && <div className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none" style={{ height: `${trim.top * 100}%` }} />}
                    {trim.bottom > 0 && <div className="absolute bottom-0 left-0 right-0 bg-black/60 pointer-events-none" style={{ height: `${trim.bottom * 100}%` }} />}
                    {trim.left > 0 && <div className="absolute left-0 bg-black/60 pointer-events-none" style={{ width: `${trim.left * 100}%`, top: `${trim.top * 100}%`, bottom: `${trim.bottom * 100}%` }} />}
                    {trim.right > 0 && <div className="absolute right-0 bg-black/60 pointer-events-none" style={{ width: `${trim.right * 100}%`, top: `${trim.top * 100}%`, bottom: `${trim.bottom * 100}%` }} />}
                  </>
                )}
                
                {/* Grid Lines Overlay - トリミング範囲内にグリッド表示 */}
                <div 
                  className="absolute"
                  style={{
                    left: `${trim.left * 100}%`,
                    top: `${trim.top * 100}%`,
                    right: `${trim.right * 100}%`,
                    bottom: `${trim.bottom * 100}%`,
                  }}
                >
                  {/* Column lines (draggable) - タッチ対応 */}
                  {colLines.map((pos, i) => (
                    <div
                      key={`grid-col-${i}`}
                      className={`absolute top-0 bottom-0 cursor-ew-resize group ${draggingLineGrid?.type === 'col' && draggingLineGrid?.index === i ? 'z-30' : 'z-20'}`}
                      style={{ left: `${pos * 100}%`, width: '32px', marginLeft: '-16px' }}
                      onMouseDown={handleGridEditorLineMouseDown('col', i)}
                      onTouchStart={handleGridEditorLineTouchStart('col', i)}
                    >
                      <div className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 transition-all ${draggingLineGrid?.type === 'col' && draggingLineGrid?.index === i ? 'w-1 bg-yellow-400' : 'w-0.5 bg-[#06C755] group-hover:w-1 group-hover:bg-yellow-400'}`} />
                      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-14 sm:w-6 sm:h-12 rounded-full flex items-center justify-center transition-all ${draggingLineGrid?.type === 'col' && draggingLineGrid?.index === i ? 'bg-yellow-400 scale-110' : 'bg-[#06C755] group-hover:bg-yellow-400 group-hover:scale-110'}`}>
                        <GripVertical size={14} className="text-white" />
                      </div>
                    </div>
                  ))}
                  
                  {/* Row lines (draggable) - タッチ対応 */}
                  {rowLines.map((pos, i) => (
                    <div
                      key={`grid-row-${i}`}
                      className={`absolute left-0 right-0 cursor-ns-resize group ${draggingLineGrid?.type === 'row' && draggingLineGrid?.index === i ? 'z-30' : 'z-20'}`}
                      style={{ top: `${pos * 100}%`, height: '32px', marginTop: '-16px' }}
                      onMouseDown={handleGridEditorLineMouseDown('row', i)}
                      onTouchStart={handleGridEditorLineTouchStart('row', i)}
                    >
                      <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 transition-all ${draggingLineGrid?.type === 'row' && draggingLineGrid?.index === i ? 'h-1 bg-yellow-400' : 'h-0.5 bg-[#06C755] group-hover:h-1 group-hover:bg-yellow-400'}`} />
                      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-8 sm:w-12 sm:h-6 rounded-full flex items-center justify-center transition-all ${draggingLineGrid?.type === 'row' && draggingLineGrid?.index === i ? 'bg-yellow-400 scale-110' : 'bg-[#06C755] group-hover:bg-yellow-400 group-hover:scale-110'}`}>
                        <GripVertical size={14} className="text-white rotate-90" />
                      </div>
                    </div>
                  ))}
                  
                  {/* Cell numbers */}
                  {Array.from({ length: (colLines.length + 1) * (rowLines.length + 1) }).map((_, i) => {
                    const col = i % (colLines.length + 1);
                    const row = Math.floor(i / (colLines.length + 1));
                    const colBounds = [0, ...colLines, 1];
                    const rowBounds = [0, ...rowLines, 1];
                    const left = colBounds[col] * 100;
                    const top = rowBounds[row] * 100;
                    const width = (colBounds[col + 1] - colBounds[col]) * 100;
                    const height = (rowBounds[row + 1] - rowBounds[row]) * 100;
                    
                    return (
                      <div 
                        key={`grid-cell-${i}`}
                        className="absolute border border-[#06C755]/40 flex items-center justify-center pointer-events-none"
                        style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                      >
                        <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-[#06C755]/90 text-white shadow-lg">
                          {i + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Trim boundary indicator */}
                {(trim.top > 0 || trim.bottom > 0 || trim.left > 0 || trim.right > 0) && (
                  <div 
                    className="absolute border-2 border-dashed border-red-400 pointer-events-none z-40"
                    style={{
                      left: `${trim.left * 100}%`,
                      top: `${trim.top * 100}%`,
                      right: `${trim.right * 100}%`,
                      bottom: `${trim.bottom * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
            
            {/* Help Overlay */}
            <div className="absolute bottom-2 sm:bottom-6 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 bg-black/70 backdrop-blur-sm rounded-xl sm:rounded-2xl text-white text-xs sm:text-sm font-medium max-w-[95%] sm:max-w-[90%]">
              <span className="flex items-center gap-1 sm:gap-2">
                <Move size={14} className="text-[#06C755] sm:hidden" />
                <Move size={16} className="text-[#06C755] hidden sm:block" />
                <span className="hidden sm:inline">緑のハンドルをドラッグ</span>
                <span className="sm:hidden">ハンドルをドラッグ</span>
              </span>
              <span className="w-px h-4 sm:h-5 bg-white/30"></span>
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-white/20 rounded">空白</span>
                <span className="hidden sm:inline">をドラッグで画像移動</span>
                <span className="sm:hidden">で移動</span>
              </span>
              <span className="w-px h-4 sm:h-5 bg-white/30 hidden sm:block"></span>
              <span className="hidden sm:flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-white/20 rounded">スクロール</span>
                でズーム
              </span>
              {(trim.top > 0 || trim.bottom > 0 || trim.left > 0 || trim.right > 0) && (
                <>
                  <span className="w-px h-4 sm:h-5 bg-white/30"></span>
                  <span className="flex items-center gap-1 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-dashed border-red-400 rounded-sm"></span>
                    <span className="hidden sm:inline">トリミング範囲</span>
                    <span className="sm:hidden">トリム</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

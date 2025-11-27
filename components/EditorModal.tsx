import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Loader2, Wand2, Save, Eraser, RotateCcw, Sparkles, ZoomIn, ZoomOut, Palette, Move, MousePointer2, Crosshair } from 'lucide-react';
import { eraseOnCanvas, advancedBackgroundRemoval, autoRemoveBackground } from '../utils/imageProcessing';

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (newImageSrc: string) => void;
}

// 背景色オプション
const bgColors = [
  { name: 'チェック', value: '', pattern: true },
  { name: 'グリーン', value: '#00B140', pattern: false },
  { name: 'マゼンタ', value: '#FF00FF', pattern: false },
  { name: 'ブルー', value: '#0066FF', pattern: false },
];

// ツールチップコンポーネント
const Tooltip: React.FC<{ text: string; subtext?: string; children: React.ReactNode }> = ({ text, subtext, children }) => (
  <div className="relative group">
    {children}
    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-gray-700">
      <div className="font-bold">{text}</div>
      {subtext && <div className="text-gray-400 text-[10px] mt-0.5">{subtext}</div>}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
    </div>
  </div>
);

const EditorModal: React.FC<EditorModalProps> = ({ isOpen, onClose, imageSrc, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  
  const [history, setHistory] = useState<string[]>([]);
  
  // ツール: 'pan', 'auto', 'wand', 'eraser'
  const [activeTool, setActiveTool] = useState<'pan' | 'auto' | 'wand' | 'eraser'>('auto');

  // 設定
  const [tolerance, setTolerance] = useState(25);
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);

  // 背景色
  const [bgColorIndex, setBgColorIndex] = useState(0);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>('');

  // クリック位置のプレビュー
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen && imageSrc && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      const img = new Image();
      img.onload = () => {
        if (canvasRef.current && containerRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          originalImageRef.current = img;
          saveToHistory();
          
          // Calculate fit zoom
          const containerRect = containerRef.current.getBoundingClientRect();
          const containerWidth = containerRect.width - 60;
          const containerHeight = containerRect.height - 60;
          
          const fitZoom = Math.min(
            containerWidth / img.width,
            containerHeight / img.height,
            1
          );
          
          setZoom(Math.max(0.1, fitZoom));
          setPan({ x: 0, y: 0 });
          setLastMessage('');
        }
      };
      img.src = imageSrc;
      setHistory([]);
    }
  }, [isOpen, imageSrc]);

  const saveToHistory = () => {
    if (canvasRef.current) {
      setHistory(prev => [...prev.slice(-15), canvasRef.current!.toDataURL('image/png', 1.0)]);
    }
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); 
    const previousState = newHistory[newHistory.length - 1];
    
    setHistory(newHistory);
    
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (canvasRef.current && ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = previousState;
    setLastMessage('元に戻しました');
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.Touch) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = 'clientX' in e ? e.clientX : e.clientX;
    const clientY = 'clientY' in e ? e.clientY : e.clientY;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // コンテナ座標を取得（パン用）
  const getContainerCoordinates = (e: React.MouseEvent) => {
    return { x: e.clientX, y: e.clientY };
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (isPanning && activeTool === 'pan') {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleContainerMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan') {
      // パンモードの場合はコンテナのハンドラに任せる
      return;
    }

    const { x, y } = getCanvasCoordinates(e);

    setIsDrawing(true);

    if (activeTool === 'auto') {
      handleAutoRemove();
      setIsDrawing(false);
    } else if (activeTool === 'wand') {
      handleMagicWand(x, y);
      setIsDrawing(false);
    } else if (activeTool === 'eraser') {
      handleBrush(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan') return;

    const { x, y } = getCanvasCoordinates(e);
    
    // プレビュー位置を更新（wand と eraser の両方で）
    if (activeTool === 'wand' || activeTool === 'eraser') {
      setPreviewPos({ x, y });
    }

    if (!isDrawing) return;
    
    if (activeTool === 'eraser') {
      handleBrush(x, y);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && activeTool === 'eraser') {
      saveToHistory();
    }
    setIsDrawing(false);
  };

  const handleMouseLeave = () => {
    setPreviewPos(null);
    handleMouseUp();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.1, Math.min(4, prev + delta)));
  };

  const handleAutoRemove = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);
    setLastMessage('処理中...');
    
    setTimeout(() => {
      try {
        const result = autoRemoveBackground(canvas, tolerance, true, true);
        if (result.success) {
          setLastMessage('✓ 背景を除去しました');
          saveToHistory();
        } else {
          setLastMessage(result.message);
        }
      } catch (error) {
        setLastMessage('エラーが発生しました');
      }
      setIsProcessing(false);
    }, 50);
  };

  const handleMagicWand = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // クリック位置が画像範囲内か確認
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      setLastMessage('画像の範囲内をクリックしてください');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // クリック位置のピクセルを取得して透明かチェック
    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    if (pixel[3] === 0) {
      setLastMessage('既に透明な部分です');
      return;
    }

    setIsProcessing(true);
    setLastMessage('処理中...');
    
    setTimeout(() => {
      try {
        advancedBackgroundRemoval(canvas, Math.floor(x), Math.floor(y), tolerance, true, true);
        setLastMessage(`✓ RGB(${pixel[0]}, ${pixel[1]}, ${pixel[2]}) を除去`);
        saveToHistory();
      } catch (error) {
        setLastMessage('エラーが発生しました');
      }
      setIsProcessing(false);
    }, 10);
  };

  const handleBrush = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    eraseOnCanvas(canvas, x, y, brushSize / 2);
  };

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png', 1.0));
      onClose();
    }
  };

  const handleReset = () => {
    if (originalImageRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(originalImageRef.current, 0, 0);
        saveToHistory();
        setLastMessage('✓ リセットしました');
      }
    }
  };

  const fitToContainer = () => {
    if (containerRef.current && canvasRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width - 60;
      const containerHeight = containerRect.height - 60;
      const fitZoom = Math.min(
        containerWidth / canvasRef.current.width,
        containerHeight / canvasRef.current.height,
        1
      );
      setZoom(Math.max(0.1, fitZoom));
      setPan({ x: 0, y: 0 });
    }
  };

  // キーボードショートカット
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === ' ') {
        e.preventDefault();
        setActiveTool('pan');
      } else if (e.key === '1') {
        setActiveTool('auto');
      } else if (e.key === '2') {
        setActiveTool('wand');
      } else if (e.key === '3') {
        setActiveTool('eraser');
      } else if (e.key === '4') {
        setActiveTool('pan');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setActiveTool('auto');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, history]);

  if (!isOpen) return null;

  const currentBg = bgColors[bgColorIndex];

  // カーソルスタイル
  const getCursorStyle = () => {
    switch (activeTool) {
      case 'pan': return isPanning ? 'grabbing' : 'grab';
      case 'auto': return 'pointer';
      case 'wand': return 'crosshair';
      case 'eraser': return 'none';
      default: return 'default';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl w-full h-full md:max-w-[90vw] md:max-h-[90vh] overflow-hidden flex flex-col border border-gray-800">
        
        {/* Header */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-800 flex justify-between items-center bg-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-[#06C755] to-[#05B04C]">
              <Wand2 className="text-white" size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">背景透過エディタ</h2>
              <p className="text-[9px] sm:text-[10px] text-gray-500 hidden sm:block">Space: 移動 / 1-4: ツール切替 / Cmd+Z: 戻る</p>
            </div>
            
            {lastMessage && (
              <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg ml-2 sm:ml-4 hidden sm:block ${lastMessage.startsWith('✓') ? 'bg-[#06C755]/20 border border-[#06C755]/30' : 'bg-yellow-500/20 border border-yellow-500/30'}`}>
                <span className={`text-xs font-medium ${lastMessage.startsWith('✓') ? 'text-[#06C755]' : 'text-yellow-400'}`}>{lastMessage}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={handleSave}
              className="flex items-center gap-1 sm:gap-2 bg-[#06C755] text-white hover:bg-[#05B04C] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold transition-all text-sm"
            >
              <Save size={14} />
              <span className="hidden sm:inline">保存</span>
            </button>
            <button onClick={onClose} className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          
          {/* Tool Panel - Horizontal on mobile, Vertical on desktop */}
          <div className="w-full sm:w-16 bg-[#1a1a1a] border-b sm:border-b-0 sm:border-r border-gray-800 flex sm:flex-col items-center p-2 sm:py-4 gap-2 shrink-0 overflow-x-auto sm:overflow-x-visible">
            
            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider hidden sm:block mb-1">ツール</div>
            
            <Tooltip text="自動背景除去" subtext="画像の境界から背景色を検出 [1]">
              <button 
                onClick={() => setActiveTool('auto')}
                className={`p-2 sm:p-3 rounded-xl transition-all ${activeTool === 'auto' ? 'bg-[#06C755] text-white shadow-lg shadow-[#06C755]/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
              >
                <Sparkles size={18} />
              </button>
            </Tooltip>

            <Tooltip text="クリック透過" subtext="クリック位置の色を透過 [2]">
              <button 
                onClick={() => setActiveTool('wand')}
                className={`p-2 sm:p-3 rounded-xl transition-all ${activeTool === 'wand' ? 'bg-[#06C755] text-white shadow-lg shadow-[#06C755]/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
              >
                <Wand2 size={18} />
              </button>
            </Tooltip>

            <Tooltip text="消しゴム" subtext="ドラッグで直接消去 [3]">
              <button 
                onClick={() => setActiveTool('eraser')}
                className={`p-2 sm:p-3 rounded-xl transition-all ${activeTool === 'eraser' ? 'bg-[#06C755] text-white shadow-lg shadow-[#06C755]/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
              >
                <Eraser size={18} />
              </button>
            </Tooltip>

            <Tooltip text="移動" subtext="ドラッグで画像を移動 [4/Space]">
              <button 
                onClick={() => setActiveTool('pan')}
                className={`p-2 sm:p-3 rounded-xl transition-all ${activeTool === 'pan' ? 'bg-[#06C755] text-white shadow-lg shadow-[#06C755]/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
              >
                <Move size={18} />
              </button>
            </Tooltip>
             
            <div className="w-px h-6 sm:w-auto sm:h-auto sm:flex-1 bg-gray-700 sm:bg-transparent mx-1 sm:mx-0" />
            
            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider hidden sm:block mb-1">表示</div>
             
            <Tooltip text="縮小" subtext="25%ずつ縮小">
              <button 
                onClick={() => setZoom(prev => Math.max(0.1, prev - 0.25))}
                className="p-2 sm:p-2.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
              >
                <ZoomOut size={16} />
              </button>
            </Tooltip>
             
            <Tooltip text="フィット" subtext="画面に合わせて表示">
              <button 
                onClick={fitToContainer}
                className="px-2 py-1 sm:py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-[10px] font-bold"
              >
                {Math.round(zoom * 100)}%
              </button>
            </Tooltip>
             
            <Tooltip text="拡大" subtext="25%ずつ拡大">
              <button 
                onClick={() => setZoom(prev => Math.min(4, prev + 0.25))}
                className="p-2 sm:p-2.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
              >
                <ZoomIn size={16} />
              </button>
            </Tooltip>

            <Tooltip text="背景色変更" subtext={`現在: ${currentBg.name}`}>
              <button 
                onClick={() => setBgColorIndex((bgColorIndex + 1) % bgColors.length)}
                className="p-2 sm:p-2.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all sm:mt-2"
                style={{ color: currentBg.pattern ? undefined : currentBg.value }}
              >
                <Palette size={16} />
              </button>
            </Tooltip>

            <Tooltip text="位置リセット" subtext="中央に戻す">
              <button 
                onClick={() => {
                  setPan({ x: 0, y: 0 });
                  fitToContainer();
                }}
                className="p-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition-all mt-2"
              >
                <Crosshair size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Center: Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-hidden flex items-center justify-center relative"
            style={{ 
              backgroundColor: currentBg.pattern ? '#1a1a1a' : currentBg.value,
              cursor: activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'default'
            }}
            onWheel={handleWheel}
            onMouseDown={handleContainerMouseDown}
            onMouseMove={handleContainerMouseMove}
            onMouseUp={handleContainerMouseUp}
            onMouseLeave={handleContainerMouseUp}
          >
             <div 
               className="relative"
               style={{ 
                 transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                 transformOrigin: 'center center',
                 transition: isPanning ? 'none' : 'transform 0.1s ease-out'
               }}
             >
               {/* Transparency background pattern */}
               {currentBg.pattern && (
                 <div className="absolute inset-0 bg-[repeating-conic-gradient(#404040_0%_25%,#2a2a2a_0%_50%)] bg-[length:20px_20px] rounded-lg" />
               )}
               
               <canvas 
                 ref={canvasRef} 
                 className="relative block rounded-lg shadow-2xl"
                 style={{ 
                   maxWidth: 'none', 
                   maxHeight: 'none', 
                   touchAction: 'none',
                   cursor: getCursorStyle()
                 }}
                 onMouseDown={handleMouseDown}
                 onMouseMove={handleMouseMove}
                 onMouseUp={handleMouseUp}
                 onMouseLeave={handleMouseLeave}
               />

               {/* 消しゴムカーソルプレビュー */}
               {activeTool === 'eraser' && previewPos && (
                 <div
                   className="absolute pointer-events-none rounded-full"
                   style={{
                     width: brushSize,
                     height: brushSize,
                     left: previewPos.x - brushSize / 2,
                     top: previewPos.y - brushSize / 2,
                     border: '2px solid white',
                     boxShadow: '0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)',
                   }}
                 />
               )}
             </div>
             
             {isProcessing && (
               <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm z-20">
                  <div className="bg-[#1a1a1a] px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 border border-gray-800">
                    <Loader2 className="animate-spin text-[#06C755]" size={24} />
                    <span className="font-semibold text-white">処理中...</span>
                  </div>
               </div>
             )}

             {/* Info overlay */}
             <div className="absolute bottom-4 left-4 flex gap-2">
               <div className="px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg text-xs text-gray-400">
                 <span className="text-white font-bold">{Math.round(zoom * 100)}%</span>
               </div>
               <div className="px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg text-xs text-gray-400">
                 背景: <span className="text-white font-bold">{currentBg.name}</span>
               </div>
             </div>
          </div>

          {/* Right: Settings Panel - Hidden on mobile, shown on desktop */}
          <div className="hidden sm:flex w-64 bg-[#1a1a1a] border-l border-gray-800 flex-col overflow-hidden shrink-0">
             
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-bold text-white mb-1">
                {activeTool === 'auto' ? '🔮 自動背景除去' : 
                 activeTool === 'wand' ? '🪄 クリック透過' : 
                 activeTool === 'eraser' ? '🧹 消しゴム' : '✋ 移動'}
              </h3>
              <p className="text-[10px] text-gray-500">
                {activeTool === 'auto' ? '画像の境界から背景色を自動検出して除去します' : 
                 activeTool === 'wand' ? 'クリックした位置の色と類似色を透過します' : 
                 activeTool === 'eraser' ? 'ドラッグで任意の部分を消去できます' :
                 'ドラッグで画像を移動できます'}
              </p>
            </div>
             
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* 許容値 - pan以外で表示 */}
              {activeTool !== 'pan' && activeTool !== 'eraser' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400">許容値</label>
                    <span className="text-xs text-white font-bold bg-gray-800 px-2 py-0.5 rounded">{tolerance}</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="50" 
                    value={tolerance} 
                    onChange={(e) => setTolerance(parseInt(e.target.value))}
                    className="w-full accent-[#06C755]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>精密</span>
                    <span>広範囲</span>
                  </div>
                </div>
              )}

              {/* 消しゴムサイズ */}
              {activeTool === 'eraser' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400">ブラシサイズ</label>
                    <span className="text-xs text-white font-bold bg-gray-800 px-2 py-0.5 rounded">{brushSize}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full accent-[#06C755]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>細かい</span>
                    <span>大きい</span>
                  </div>
                </div>
              )}

              {/* アクションボタン */}
              {activeTool === 'auto' && (
                <button 
                  onClick={handleAutoRemove}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-[#06C755] text-white hover:bg-[#05B04C] py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles size={18} />
                  背景を除去
                </button>
              )}

              {activeTool === 'wand' && (
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-start gap-3">
                    <MousePointer2 size={20} className="text-[#06C755] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-300 font-medium mb-1">使い方</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        除去したい背景色の部分をクリックしてください。クリックした位置の色と類似した色が透過されます。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTool === 'pan' && (
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-start gap-3">
                    <Move size={20} className="text-[#06C755] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-300 font-medium mb-1">使い方</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        ドラッグして画像を移動できます。ズーム時に細部を確認するのに便利です。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 共通アクション */}
              <div className="border-t border-gray-800 pt-4 space-y-2">
                <button 
                  onClick={handleUndo}
                  disabled={history.length <= 1}
                  className="w-full flex items-center justify-center gap-2 bg-gray-800 text-gray-300 hover:bg-gray-700 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  元に戻す ({history.length - 1})
                </button>
                
                <button 
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300 py-2.5 rounded-xl font-medium transition-all"
                >
                  リセット
                </button>
              </div>

              {/* ヒント */}
              <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  💡 <span className="text-gray-400">ヒント:</span> Spaceキーを押している間、一時的に移動ツールに切り替わります。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorModal;

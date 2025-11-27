import React, { useState } from 'react';
import { FileText, Download, Sparkles, AlertCircle, RefreshCw, Languages } from 'lucide-react';
import { AudioInput } from './components/AudioInput';
import { Button } from './components/Button';
import { AudioState, ProcessingState, TranslationMode } from './types';
import { generateSubtitles } from './services/geminiService';

const App = () => {
  const [audioState, setAudioState] = useState<AudioState>({
    file: null,
    url: null,
    name: '',
  });

  const [srtContent, setSrtContent] = useState<string>('');
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: '',
    error: null,
  });
  
  const [selectedMode, setSelectedMode] = useState<TranslationMode>(TranslationMode.BILINGUAL_CN_EN);

  const handleAudioSelected = (file: File | Blob, name: string) => {
    const url = URL.createObjectURL(file);
    setAudioState({ file, url, name });
    setSrtContent(''); // Clear previous results
    setProcessingState({ isProcessing: false, progress: '', error: null });
  };

  const clearAudio = () => {
    if (audioState.url) URL.revokeObjectURL(audioState.url);
    setAudioState({ file: null, url: null, name: '' });
    setSrtContent('');
    setProcessingState({ isProcessing: false, progress: '', error: null });
  };

  const handleProcess = async () => {
    if (!audioState.file) return;

    setProcessingState({
      isProcessing: true,
      progress: '正在上传并分析音频...',
      error: null,
    });

    try {
      const result = await generateSubtitles(audioState.file, selectedMode);
      setSrtContent(result);
      setProcessingState({
        isProcessing: false,
        progress: '完成',
        error: null,
      });
    } catch (err: any) {
      setProcessingState({
        isProcessing: false,
        progress: '',
        error: err.message || '发生未知错误，请重试。',
      });
    }
  };

  const handleDownload = () => {
    if (!srtContent) return;
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = audioState.name.replace(/\.[^/.]+$/, "") + ".srt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileText size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              AutoSub 智能字幕
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
             <span className="hidden sm:inline">模型驱动：Gemini 2.5 Flash</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
        
        {/* Intro Section */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            瞬间生成 <span className="text-indigo-400">专业字幕</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            上传音频或直接录音，AI 将自动识别语音、翻译并导出为完美对齐的 .SRT 字幕文件。
          </p>
        </div>

        {/* Input Area */}
        <section className="w-full">
           <AudioInput 
              onAudioSelected={handleAudioSelected} 
              currentFile={audioState.name}
              onClear={clearAudio}
           />
        </section>

        {/* Controls Section - Only visible if file is selected */}
        {audioState.file && !processingState.isProcessing && !srtContent && (
          <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              <div className="w-full md:w-auto flex-1">
                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                  <Languages size={16} />
                  选择输出模式
                </label>
                <select 
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value as TranslationMode)}
                  className="w-full md:w-80 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                >
                  {Object.values(TranslationMode).map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-auto">
                <Button 
                  onClick={handleProcess} 
                  className="w-full md:w-auto h-11 text-base shadow-indigo-500/25"
                  icon={<Sparkles size={20} />}
                >
                  开始生成字幕
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Loading State */}
        {processingState.isProcessing && (
           <div className="py-12 text-center animate-in fade-in duration-500">
             <div className="relative inline-flex mb-6">
                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles size={24} className="text-indigo-400 animate-pulse" />
                </div>
             </div>
             <h3 className="text-xl font-semibold text-white mb-2">正在分析音频...</h3>
             <p className="text-slate-400">处理时间取决于文件长度，请耐心等待。</p>
           </div>
        )}

        {/* Error State */}
        {processingState.error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 flex items-start gap-4 text-red-200 animate-in slide-in-from-bottom-2">
            <AlertCircle className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-100 mb-1">处理失败</h4>
              <p className="text-sm opacity-90">{processingState.error}</p>
              <Button 
                variant="secondary" 
                onClick={handleProcess} 
                className="mt-4 bg-red-900/20 border-red-800 hover:bg-red-900/40 text-red-100"
                icon={<RefreshCw size={16} />}
              >
                重试
              </Button>
            </div>
          </div>
        )}

        {/* Result Area */}
        {srtContent && (
          <section className="space-y-4 animate-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                生成结果
              </h3>
              <div className="flex gap-2">
                 <Button 
                   variant="secondary" 
                   onClick={() => setSrtContent('')}
                   className="hidden sm:inline-flex"
                 >
                   清空
                 </Button>
                 <Button 
                   onClick={handleDownload} 
                   icon={<Download size={18} />}
                   className="bg-green-600 hover:bg-green-700 focus:ring-green-500 shadow-green-500/20"
                 >
                   下载 .SRT 文件
                 </Button>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-xl"></div>
              <div className="relative w-full h-96 bg-slate-800 rounded-xl border border-slate-700 p-4 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono uppercase tracking-wider border-b border-slate-700 pb-2">
                  <span>预览</span>
                  <span>SRT 格式</span>
                </div>
                <textarea 
                  className="flex-1 w-full bg-transparent resize-none outline-none text-slate-300 font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
                  value={srtContent}
                  readOnly
                  spellCheck={false}
                />
              </div>
            </div>
            
            <div className="flex sm:hidden justify-end">
                <Button 
                   variant="secondary" 
                   onClick={() => setSrtContent('')}
                   className="w-full"
                 >
                   重新开始
                 </Button>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} AutoSub AI. 保留所有权利。</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">隐私协议</span>
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">使用条款</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
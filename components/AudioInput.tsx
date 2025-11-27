import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, StopCircle, Music, X } from 'lucide-react';
import { Button } from './Button';

interface AudioInputProps {
  onAudioSelected: (file: File | Blob, name: string) => void;
  onClear: () => void;
  currentFile: string | null;
}

export const AudioInput: React.FC<AudioInputProps> = ({ onAudioSelected, onClear, currentFile }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onAudioSelected(file, file.name);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const fileName = `录音-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        onAudioSelected(blob, fileName);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请检查浏览器权限。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  if (currentFile) {
    return (
      <div className="w-full p-6 border-2 border-indigo-500/50 bg-indigo-500/10 rounded-xl flex items-center justify-between animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-400">
            <Music size={24} />
          </div>
          <div>
            <p className="font-semibold text-white max-w-[200px] sm:max-w-md truncate">{currentFile}</p>
            <p className="text-xs text-indigo-300">准备就绪，可以开始生成字幕</p>
          </div>
        </div>
        <button 
          onClick={onClear}
          className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
          title="移除文件"
        >
          <X size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-8 transition-colors bg-slate-800/50">
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          
          {isRecording ? (
             <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                  <div className="p-4 bg-red-500 rounded-full text-white relative z-10">
                    <Mic size={32} />
                  </div>
                </div>
                <div className="text-2xl font-mono text-white font-bold">{formatTime(recordingTime)}</div>
                <p className="text-slate-400 text-sm">正在录音...</p>
                <Button variant="danger" onClick={stopRecording} icon={<StopCircle size={18} />}>
                  停止录音
                </Button>
             </div>
          ) : (
            <>
              <div className="flex gap-4">
                <div className="p-4 bg-slate-700 rounded-full text-slate-300 mb-2">
                  <Upload size={32} />
                </div>
              </div>
              
              <div>
                <p className="text-lg font-medium text-white mb-1">
                  拖拽音频文件到这里
                </p>
                <p className="text-sm text-slate-400">
                  支持 MP3, WAV, M4A, WEBM (最大 20MB)
                </p>
              </div>

              <div className="flex items-center gap-4 w-full max-w-xs">
                 <div className="relative w-full">
                   <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                   />
                   <Button className="w-full pointer-events-none" variant="secondary" icon={<Upload size={18} />}>
                     浏览文件
                   </Button>
                 </div>
                 
                 <span className="text-slate-500 text-sm font-medium">或</span>

                 <Button 
                   className="w-full" 
                   variant="primary" 
                   onClick={startRecording} 
                   icon={<Mic size={18} />}
                  >
                   录制语音
                 </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
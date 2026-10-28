import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';
import { FileMeta } from '../types';

interface AudioRecorderProps {
  onSendAudio: (fileMeta: FileMeta) => void;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSendAudio, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopTracks = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const options = { mimeType: 'audio/webm' };
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Microphone access denied or unavailable');
      console.warn('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      stopTracks();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = async () => {
    if (!audioChunksRef.current.length && !audioUrl) return;

    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

    // Convert blob to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      onSendAudio({
        name: `voice_note_${Date.now()}.${mimeType.includes('mp4') ? 'm4a' : 'webm'}`,
        size: audioBlob.size,
        mimeType,
        dataUrl: base64Data,
        duration,
      });
    };
    reader.readAsDataURL(audioBlob);
  };

  const togglePlayback = () => {
    if (!audioElementRef.current && audioUrl) {
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      audio.onended = () => setIsPlaying(false);
    }

    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElementRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 shadow-xs">
      {error ? (
        <div className="flex-1 text-xs text-rose-500 truncate">{error}</div>
      ) : isRecording ? (
        <>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-mono font-bold text-rose-600">REC</span>
          </div>

          <div className="flex-1 flex items-center justify-center gap-1 h-6">
            {/* Visual audio waveform bars */}
            {[40, 70, 90, 50, 100, 30, 80, 60, 95, 45, 75, 85].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-indigo-500 rounded-full transition-all duration-150 animate-pulse"
                style={{
                  height: `${Math.max(20, (h * (0.6 + Math.random() * 0.4)))}%`,
                  animationDelay: `${i * 70}ms`,
                }}
              />
            ))}
          </div>

          <span className="text-xs font-mono text-slate-700 font-bold">
            {formatTime(duration)}
          </span>

          <button
            type="button"
            onClick={stopRecording}
            className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-rose-600 transition-colors cursor-pointer"
            title="Stop Recording"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={togglePlayback}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-mono text-indigo-700 font-semibold">Voice Note</span>
            <span className="text-xs text-slate-500">({formatTime(duration)})</span>
          </div>

          <button
            type="button"
            onClick={handleSend}
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 px-3 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Send</span>
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => {
          stopTracks();
          onCancel();
        }}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
        title="Discard"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

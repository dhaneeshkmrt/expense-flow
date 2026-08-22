'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_RECORDING_SECONDS = 60; // 60 seconds limit
const TARGET_BITRATE = 16000; // 16 kbps

interface VoiceRecorderProps {
  audioDataUrl?: string;
  onChange: (dataUrl: string | undefined) => void;
}

export function VoiceRecorder({ audioDataUrl, onChange }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported mimeType with 16kbps bitrate
      let options: MediaRecorderOptions = { audioBitsPerSecond: TARGET_BITRATE };
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: TARGET_BITRATE };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm', audioBitsPerSecond: TARGET_BITRATE };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4', audioBitsPerSecond: TARGET_BITRATE };
        }
      }

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingSeconds(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          // Check cumulative size (< 95KB to stay safely under 100KB)
          const totalSize = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
          if (totalSize >= 95 * 1024) {
            stopRecording();
          }
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          onChange(reader.result as string);
        };
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorder.start(1000); // 1-second chunks for progress tracking
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  }, [onChange, stopRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioDataUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioDataUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioDataUrl, isPlaying]);

  const handleDelete = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    onChange(undefined);
  }, [onChange]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (audioDataUrl) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={togglePlay}
          className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground">Voice Note Recorded</div>
          <div className="text-xs text-muted-foreground">Tap play to listen · Compressed (16kbps)</div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleDelete}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const isNearLimit = recordingSeconds >= 50;

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 py-6 px-4">
      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'outline'}
        size="icon"
        onClick={isRecording ? stopRecording : startRecording}
        className={cn(
          'h-14 w-14 rounded-full transition-all',
          isRecording && 'animate-pulse shadow-lg shadow-destructive/30'
        )}
      >
        {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      <div className="text-center space-y-1">
        <p className="text-sm">
          {isRecording ? (
            <span className={cn('font-semibold', isNearLimit ? 'text-red-500' : 'text-destructive')}>
              Recording... {formatTime(recordingSeconds)} / {formatTime(MAX_RECORDING_SECONDS)}
            </span>
          ) : (
            <span className="text-muted-foreground">Tap to start voice recording</span>
          )}
        </p>
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <span>Max 60 seconds · 16kbps compressed (&lt;100KB)</span>
        </div>
      </div>

      {isRecording && (
        <div className="w-full max-w-xs space-y-1">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                isNearLimit ? 'bg-red-500' : 'bg-primary'
              )}
              style={{ width: `${(recordingSeconds / MAX_RECORDING_SECONDS) * 100}%` }}
            />
          </div>
          {isNearLimit && (
            <p className="text-[11px] text-red-500 flex items-center justify-center gap-1">
              <AlertCircle className="h-3 w-3" /> Reaching 60s limit — will auto-save
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Activity,
  ShieldCheck,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Sparkles,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export const VoiceCallModal: React.FC = () => {
  const { user } = useAuth();
  const {
    activeCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleCallMute,
    toggleCamera,
    toggleSpeaker,
    toggleScreenShare,
    isCallMuted,
    isCameraOff,
    isRemoteCameraOff,
    isSpeakerOn,
    isScreenSharing,
    callDuration,
    localStream,
    remoteStream,
    isCallMinimized,
    setIsCallMinimized,
  } = useSocket();

  // Waveform bars amplitude state for voice calls
  const [audioLevels, setAudioLevels] = useState<number[]>([12, 22, 16, 32, 26, 42, 32, 22, 16, 26, 16, 12]);
  const [isSwappedView, setIsSwappedView] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // Bind local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOff, activeCall?.callType, isSwappedView]);

  // Bind remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall?.callType, isSwappedView]);

  // Audio Analyser for live voice reactive waveform in voice call
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected' || activeCall.callType === 'video') {
      return;
    }

    const stream = remoteStream || localStream;
    if (!stream) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateWaveform = () => {
        analyser.getByteFrequencyData(dataArray);
        const levels = [];
        const step = Math.max(1, Math.floor(dataArray.length / 12));
        for (let i = 0; i < 12; i++) {
          const val = dataArray[i * step] || 0;
          levels.push(Math.max(8, Math.min(48, Math.round((val / 255) * 44) + 8)));
        }
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        source.disconnect();
        audioCtx.close().catch(() => {});
      };
    } catch {
      // Audio context error fallback
    }
  }, [activeCall?.status, activeCall?.callType, remoteStream, localStream]);

  if (!activeCall) return null;

  const isIncoming = activeCall.status === 'incoming_ringing';
  const isOutgoing = activeCall.status === 'outgoing_ringing';
  const isConnected = activeCall.status === 'connected';
  const isVideo = activeCall.callType === 'video';

  // Determine other user's identity
  const otherUser = isIncoming
    ? activeCall.caller
    : activeCall.targetUser || {
        id: activeCall.targetUserId,
        username: 'User',
        displayName: activeCall.conversationName || (isVideo ? 'Video Contact' : 'Voice Contact'),
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + activeCall.targetUserId,
      };

  // Format call duration MM:SS
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalContainerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 1. MINIMIZED FLOATING PILL (Allows user to multitask across app while in active call)
  if (isCallMinimized) {
    return (
      <aside
        aria-label="Active call status"
        className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 text-white px-4 py-2.5 rounded-full shadow-2xl animate-in slide-in-from-top-3 duration-300"
      >
        <button
          type="button"
          onClick={() => setIsCallMinimized(false)}
          className="flex items-center gap-2.5 cursor-pointer text-left hover:opacity-90 transition-opacity"
        >
          <div className="relative">
            <img
              src={otherUser.avatar}
              alt=""
              className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500"
            />
            {isConnected && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold leading-tight truncate max-w-[110px]">
                {otherUser.displayName || otherUser.username}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold uppercase tracking-wider">
                {isVideo ? 'Video' : 'Voice'}
              </span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1">
              {isConnected ? (
                <span>{formatDuration(callDuration)}</span>
              ) : (
                <span>{isIncoming ? 'Incoming...' : 'Calling...'}</span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
          <button
            type="button"
            onClick={toggleCallMute}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isCallMuted
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title={isCallMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isCallMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {isVideo && (
            <button
              type="button"
              onClick={toggleCamera}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isCameraOff
                  ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {isCameraOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={endCall}
            className="p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
            title="End call"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsCallMinimized(false)}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Expand call"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // 2. VIDEO CALL MODAL
  if (isVideo) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Video Call"
        ref={modalContainerRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div className="w-full max-w-4xl h-[92vh] sm:h-[86vh] max-h-[820px] bg-slate-950 text-white rounded-3xl shadow-2xl border border-slate-800 flex flex-col relative overflow-hidden">
          {/* Top Video Header */}
          <div className="absolute top-0 inset-x-0 z-30 p-4 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={otherUser.avatar}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500 shadow-md"
                />
                {isConnected && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-950" />
                )}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold leading-tight drop-shadow-sm flex items-center gap-2">
                  <span>{otherUser.displayName || otherUser.username}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-mono border border-indigo-400/20">
                    HD Video
                  </span>
                </h3>
                <div className="text-xs text-slate-300 font-mono flex items-center gap-1.5 drop-shadow-sm">
                  {isConnected ? (
                    <span className="text-emerald-400 font-bold">{formatDuration(callDuration)}</span>
                  ) : isIncoming ? (
                    <span className="text-emerald-400 animate-pulse">Incoming video call...</span>
                  ) : (
                    <span className="text-indigo-300 animate-pulse">Calling with video...</span>
                  )}
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> E2EE
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsCallMinimized(true)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Minimize call"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Video Display Canvas */}
          <div className="relative flex-1 w-full bg-slate-900 flex items-center justify-center overflow-hidden">
            {/* Active remote video stream or connecting/camera off fallback */}
            {isConnected && !isRemoteCameraOff ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              /* Avatar Placeholder when remote camera is off or call is ringing */
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="relative">
                  <div
                    className={`absolute inset-0 rounded-full bg-indigo-500/20 blur-xl ${
                      isIncoming || isOutgoing ? 'animate-pulse' : ''
                    }`}
                  />
                  <img
                    src={otherUser.avatar}
                    alt=""
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover ring-4 ring-indigo-500/40 shadow-2xl relative z-10"
                  />
                  {isConnected && (
                    <div className="absolute -bottom-2 inset-x-0 mx-auto w-max z-20 bg-slate-800 text-slate-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-slate-700">
                      Camera Paused
                    </div>
                  )}
                </div>

                <div className="space-y-1 z-10">
                  <h4 className="text-xl font-bold">{otherUser.displayName || otherUser.username}</h4>
                  <p className="text-xs text-indigo-300 font-mono">@{otherUser.username}</p>
                </div>

                {isIncoming && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full animate-bounce">
                    <Video className="w-4 h-4" />
                    <span>Incoming Video Call...</span>
                  </div>
                )}
                {isOutgoing && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full animate-pulse">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Ringing video camera...</span>
                  </div>
                )}
              </div>
            )}

            {/* Floating Picture-in-Picture Local Self-Preview */}
            {localStream && (
              <div
                className={`absolute z-30 bottom-24 right-4 sm:bottom-28 sm:right-6 w-28 h-40 sm:w-36 sm:h-52 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all ${
                  isCameraOff ? 'border-slate-700 bg-slate-800/90' : 'border-indigo-500/80'
                }`}
              >
                {!isCameraOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-slate-400">
                    <VideoOff className="w-6 h-6 mb-1 text-slate-500" />
                    <span className="text-[10px] font-medium">Camera Off</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-[9px] font-semibold text-white px-1.5 py-0.5 rounded">
                  You
                </div>
              </div>
            )}
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="p-4 sm:p-6 bg-slate-950/95 border-t border-slate-800/80 z-30 flex items-center justify-center">
            {isIncoming ? (
              /* INCOMING PROMPT CONTROLS */
              <div className="flex items-center justify-around w-full max-w-xs mx-auto gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={rejectCall}
                    className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                    title="Decline"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <span className="text-xs font-medium text-slate-400">Decline</span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={acceptCall}
                    className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all cursor-pointer animate-bounce"
                    title="Accept with Video"
                  >
                    <Video className="w-6 h-6" />
                  </button>
                  <span className="text-xs font-bold text-indigo-400">Accept Video</span>
                </div>
              </div>
            ) : (
              /* CONNECTED / OUTGOING CONTROLS */
              <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
                {/* Mic Mute/Unmute */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleCallMute}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      isCallMuted
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                    title={isCallMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isCallMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <span className="text-[10px] text-slate-400">
                    {isCallMuted ? 'Muted' : 'Mic'}
                  </span>
                </div>

                {/* Camera Toggle */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      isCameraOff
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                    title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                  >
                    {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                  <span className="text-[10px] text-slate-400">
                    {isCameraOff ? 'Cam Off' : 'Camera'}
                  </span>
                </div>

                {/* Screen Sharing Toggle */}
                {typeof window !== 'undefined' && typeof navigator?.mediaDevices?.getDisplayMedia === 'function' && (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleScreenShare}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                        isScreenSharing
                          ? 'bg-indigo-600 text-white border border-indigo-400 shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                      title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
                    >
                      {isScreenSharing ? (
                        <MonitorOff className="w-5 h-5 text-white" />
                      ) : (
                        <Monitor className="w-5 h-5" />
                      )}
                    </button>
                    <span className="text-[10px] text-slate-400">
                      {isScreenSharing ? 'Sharing' : 'Share'}
                    </span>
                  </div>
                )}

                {/* Speaker Toggle */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleSpeaker}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      !isSpeakerOn
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                    title={isSpeakerOn ? 'Mute audio' : 'Unmute audio'}
                  >
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <span className="text-[10px] text-slate-400">
                    {isSpeakerOn ? 'Audio' : 'Muted'}
                  </span>
                </div>

                {/* End Call Button */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={endCall}
                    className="w-13 h-13 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all cursor-pointer"
                    title="End video call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <span className="text-[10px] font-bold text-rose-400">End</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. VOICE CALL MODAL (Audio-Focused with Waveform)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice Call"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/80 flex flex-col items-center text-center relative overflow-hidden">
        {/* Subtle background ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#5036FF]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header bar */}
        <div className="w-full flex items-center justify-between z-10 mb-6">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>E2EE Voice Encrypted</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCallMinimized(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
            title="Minimize call"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar with Animated Pulsing Sound Waves */}
        <div className="relative my-4 flex items-center justify-center">
          <div
            className={`absolute w-36 h-36 rounded-full border border-indigo-500/20 ${
              isConnected || isIncoming || isOutgoing ? 'animate-ping duration-1000' : ''
            }`}
          />
          <div
            className={`absolute w-48 h-48 rounded-full border border-purple-500/15 ${
              isConnected || isIncoming || isOutgoing ? 'animate-pulse' : ''
            }`}
          />

          <img
            src={otherUser.avatar}
            alt=""
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-indigo-500/60 shadow-2xl z-10"
          />

          {isConnected && (
            <div className="absolute -bottom-1 z-20 bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
              Live
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="mt-4 mb-2 z-10 space-y-1">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {otherUser.displayName || otherUser.username}
          </h2>
          <p className="text-xs text-indigo-300 font-mono">@{otherUser.username}</p>
        </div>

        {/* Call Status Text & Live Duration */}
        <div className="z-10 mb-6">
          {isIncoming && (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 animate-pulse">
              <PhoneIncoming className="w-4 h-4" />
              <span>Incoming Voice Call...</span>
            </div>
          )}

          {isOutgoing && (
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300 animate-pulse">
              <Phone className="w-4 h-4 animate-bounce" />
              <span>Calling & Ringing...</span>
            </div>
          )}

          {isConnected && (
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-wider">
                {formatDuration(callDuration)}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>WebRTC High-Fidelity Audio</span>
              </p>
            </div>
          )}
        </div>

        {/* Reactive Audio Equalizer Waveform */}
        {isConnected && (
          <div className="w-full flex items-center justify-center gap-1.5 h-12 mb-6 z-10 px-6">
            {audioLevels.map((lvl, idx) => (
              <span
                key={idx}
                className="w-1.5 bg-gradient-to-t from-indigo-500 via-purple-400 to-emerald-400 rounded-full transition-all duration-75"
                style={{ height: `${lvl}px` }}
              />
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="w-full z-10 pt-2 border-t border-slate-800/70">
          {isIncoming ? (
            <div className="flex items-center justify-around w-full max-w-xs mx-auto gap-4 pt-2">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={rejectCall}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                  title="Decline"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
                <span className="text-xs font-medium text-slate-400">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={acceptCall}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all cursor-pointer animate-bounce"
                  title="Accept Call"
                >
                  <PhoneCall className="w-7 h-7" />
                </button>
                <span className="text-xs font-bold text-emerald-400">Accept</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4 sm:gap-6 pt-2">
              {/* Mic Mute/Unmute */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleCallMute}
                  className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    isCallMuted
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                  title={isCallMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isCallMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <span className="text-[11px] text-slate-400">
                  {isCallMuted ? 'Muted' : 'Mute'}
                </span>
              </div>

              {/* Speaker On/Off */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleSpeaker}
                  className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    !isSpeakerOn
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                  title={isSpeakerOn ? 'Mute speaker' : 'Enable speaker'}
                >
                  {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <span className="text-[11px] text-slate-400">
                  {isSpeakerOn ? 'Speaker' : 'Muted'}
                </span>
              </div>

              {/* End Call Button */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={endCall}
                  className="w-14 h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all cursor-pointer"
                  title="End call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span className="text-[11px] font-bold text-rose-400">End</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

const VideoCall = ({ socket, currentPartner, user, onEndCall }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callStatus, setCallStatus] = useState(''); // '', 'incoming', 'connecting', 'connected', 'ended'
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const pendingOfferRef = useRef(null);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  const startCallTimer = useCallback(() => {
    stopCallTimer();
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [stopCallTimer]);

  const cleanupStreams = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  const handleCallEnd = useCallback(() => {
    stopCallTimer();

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    cleanupStreams();
    setIsCallActive(false);
    setIsCalling(false);
    setIsIncomingCall(false);
    setCallStatus('');
    setCallDuration(0);

    if (onEndCall) onEndCall();
  }, [cleanupStreams, onEndCall, stopCallTimer]);

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setIsCalling(false);
      setCallStatus('');
      return null;
    }
  }, []);

  const initializePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('video_call_ice_candidate', {
          targetUserId: currentPartner?.id,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setCallStatus('connected');
        setIsCallActive(true);
        startCallTimer();
      }
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        handleCallEnd();
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    return pc;
  }, [currentPartner?.id, handleCallEnd, socket, startCallTimer]);

  const handleIncomingOffer = useCallback(
    async (data) => {
      const { fromUserId, fromUsername, offer } = data;
      if (!currentPartner || fromUserId !== currentPartner.id) return;

      pendingOfferRef.current = { offer, fromUserId, fromUsername };
      setIsIncomingCall(true);
      setCallStatus('incoming');
    },
    [currentPartner]
  );

  const handleIncomingAnswer = useCallback(
    async (data) => {
      const { fromUserId, answer } = data;
      if (!currentPartner || fromUserId !== currentPartner.id) return;
      try {
        await peerConnectionRef.current?.setRemoteDescription(answer);
        setCallStatus('connected');
        setIsCallActive(true);
        startCallTimer();
      } catch (error) {
        console.error('Error handling incoming answer:', error);
      }
    },
    [currentPartner, startCallTimer]
  );

  const handleIncomingIceCandidate = useCallback(
    async (data) => {
      const { fromUserId, candidate } = data;
      if (!currentPartner || fromUserId !== currentPartner.id) return;
      try {
        await peerConnectionRef.current?.addIceCandidate(candidate);
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    },
    [currentPartner]
  );

  const handleCallReject = useCallback(() => {
    setIsIncomingCall(false);
    setIsCalling(false);
    setCallStatus('');
  }, []);

  const answerCall = useCallback(async () => {
    if (!pendingOfferRef.current) return;

    setIsIncomingCall(false);
    setCallStatus('connecting');

    initializePeerConnection();

    const stream = await getLocalStream();
    if (!stream || !peerConnectionRef.current) return;

    stream.getTracks().forEach((track) => peerConnectionRef.current.addTrack(track, stream));

    await peerConnectionRef.current.setRemoteDescription(pendingOfferRef.current.offer);
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);

    socket?.emit('video_call_answer', {
      targetUserId: pendingOfferRef.current.fromUserId,
      answer,
    });

    pendingOfferRef.current = null;
    setIsCallActive(true);
  }, [getLocalStream, initializePeerConnection, socket]);

  const rejectCall = useCallback(() => {
    if (!currentPartner) return;
    socket?.emit('video_call_reject', { targetUserId: currentPartner.id });
    setIsIncomingCall(false);
    setCallStatus('');
    pendingOfferRef.current = null;
  }, [currentPartner, socket]);

  const startCall = useCallback(async () => {
    if (!currentPartner) return;

    setIsCalling(true);
    setCallStatus('connecting');

    initializePeerConnection();

    const stream = await getLocalStream();
    if (!stream || !peerConnectionRef.current) {
      setIsCalling(false);
      setCallStatus('');
      return;
    }

    stream.getTracks().forEach((track) => peerConnectionRef.current.addTrack(track, stream));

    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);

    socket?.emit('video_call_offer', {
      targetUserId: currentPartner.id,
      fromUsername: user?.username,
      offer,
    });
  }, [currentPartner, getLocalStream, initializePeerConnection, socket, user?.username]);

  const endCall = useCallback(() => {
    if (currentPartner) {
      socket?.emit('video_call_end', { targetUserId: currentPartner.id });
    }
    handleCallEnd();
  }, [currentPartner, handleCallEnd, socket]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  useEffect(() => {
    if (!socket || !currentPartner) return undefined;

    socket.on('video_call_offer', handleIncomingOffer);
    socket.on('video_call_answer', handleIncomingAnswer);
    socket.on('video_call_ice_candidate', handleIncomingIceCandidate);
    socket.on('video_call_end', handleCallEnd);
    socket.on('video_call_reject', handleCallReject);

    return () => {
      socket.off('video_call_offer', handleIncomingOffer);
      socket.off('video_call_answer', handleIncomingAnswer);
      socket.off('video_call_ice_candidate', handleIncomingIceCandidate);
      socket.off('video_call_end', handleCallEnd);
      socket.off('video_call_reject', handleCallReject);
    };
  }, [currentPartner, handleCallEnd, handleCallReject, handleIncomingAnswer, handleIncomingIceCandidate, handleIncomingOffer, socket]);

  useEffect(() => () => {
    handleCallEnd();
  }, [handleCallEnd]);

  if (!currentPartner) return null;

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden flex flex-col shadow-xl">
      {isIncomingCall && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-20">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl w-[90%] max-w-md space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {currentPartner.username.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">{currentPartner.username}</h3>
              <p className="text-gray-600">Incoming video call</p>
            </div>
            <div className="flex gap-4 justify-center">
              <button onClick={answerCall} className="px-5 py-3 rounded-full bg-green-500 text-white font-semibold shadow hover:bg-green-600 transition">
                Answer
              </button>
              <button onClick={rejectCall} className="px-5 py-3 rounded-full bg-red-500 text-white font-semibold shadow hover:bg-red-600 transition">
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {isCallActive || isCalling || callStatus === 'connecting' ? (
        <div className="flex flex-col flex-1">
          <div className="relative flex-1 bg-black">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 flex flex-col justify-between p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white text-lg font-bold shadow">
                  {currentPartner.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-semibold">{currentPartner.username}</div>
                  <div className="text-sm opacity-80">{formatDuration(callDuration)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`inline-block w-2 h-2 rounded-full ${callStatus === 'connected' ? 'bg-green-400' : 'bg-amber-400'}`} />
                <span>{callStatus === 'connecting' ? 'Connecting...' : 'Connected'}</span>
              </div>
            </div>

            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-xl overflow-hidden border border-white/20 shadow-lg">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">You</div>
            </div>
          </div>

          <div className="bg-black/80 text-white py-4 px-6 flex items-center justify-center gap-4">
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition ${isVideoEnabled ? 'bg-white/10' : 'bg-red-600'}`}
              title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
            >
              🎥
            </button>
            <button
              onClick={toggleAudio}
              className={`w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition ${isAudioEnabled ? 'bg-white/10' : 'bg-red-600'}`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              🎤
            </button>
            <button
              onClick={endCall}
              className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-lg font-bold shadow-lg hover:bg-red-700 transition"
              title="End call"
            >
              ⏹
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white p-8 gap-4">
          <div className="text-center space-y-2">
            <div className="text-2xl font-semibold">Ready to start a call?</div>
            <div className="text-sm opacity-80">Start a video call with {currentPartner.username}</div>
          </div>
          <button onClick={startCall} className="px-6 py-3 rounded-full bg-white text-indigo-600 font-semibold shadow-lg hover:shadow-xl transition">
            Start Video Call
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
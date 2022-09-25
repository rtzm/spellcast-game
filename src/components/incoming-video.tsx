import React, { useEffect, useRef, useState } from "react";
import Controls from "./controls";

type IncomingVideoProps = {
  onError: () => void;
  onLoad: (video: HTMLVideoElement | null, downsampledHeight: number, downsampledWidth: number) => void;
}
/**
 * The video element that will be sourced with getUserMedia's MediaStream.
 * Set playsinline to true so that iOS doesn't make it go full screen on play.
 * Also mute it, just in case.
 */
const IncomingVideo = ({ onError, onLoad }: IncomingVideoProps) => {
  const idealWidth: number = 120;
	const idealHeight: number = 90;

  /**
	 * Media constraints for the call to getUserMedia
	 */
	const mediaConstraints = { 
		audio: false, 
		video: {
			// TODO: make this exact when ready for mobile-only
			facingMode: "environment",
			// TODO: add frame rate for better mobile processing
			frameRate: {
				ideal: 10,
				max: 15
			}
		}
	};

  /**
   * This would be preferable to set using WebRTC constraints, but those are 
   * inconsistently applied across browsers, especially Safari iOS.
   *
   * @return The rate at which video should be downsampled to achieve ideal
   */
  const calculateDownsample = function(video: HTMLVideoElement): number {
    let widthDownsample = video.videoWidth / idealWidth;
    let heightDownsample = video.videoHeight / idealHeight;
    return (widthDownsample > heightDownsample) ? 
      heightDownsample : 
      widthDownsample;
  };
  const [capturing, setCapturing] = useState(false);
  // Currently capturing video
  const [stream, setStream] = useState<MediaStream | null>(null);

  // How much the video size should be reduced by
  const [downsampleRate, setDownsampleRate] = useState<number>(4);
  
  const thisVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {  
    // TODO: add handling for making this work on all mobile browsers
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then((stream) => setStream(stream)) 
        .catch(() => onError());
    } else {
      // TODO: Chrome for iOS can't use this: http://www.openradar.me/33571214
      onError();
    }
  
  }, [])

  useEffect(() => {console.log(downsampleRate)}, [downsampleRate]);
  useEffect(() => {
    if (thisVideo?.current && stream) {
    	stream.getAudioTracks().forEach(track => track.enabled = false);
      thisVideo.current.srcObject = stream;
      const newDownsampleRate = calculateDownsample(thisVideo.current);
      if (newDownsampleRate > downsampleRate) {
        setDownsampleRate(newDownsampleRate);
      }
      // TODO: https://developer.chrome.com/blog/play-request-was-interrupted/#fix
      thisVideo.current.play();
    }
  }, [thisVideo, stream]);
  return (
    <>
      <video
        ref={thisVideo}
        playsInline={true}
        muted={true}
        onLoadedMetadata={() => onLoad(
          thisVideo.current, 
          Math.floor((thisVideo.current?.videoWidth || 1) / downsampleRate), 
          Math.floor((thisVideo.current?.videoHeight || 1) / downsampleRate)      
        )}
      />
      <Controls
        playing={capturing}
        onPlay={() => {
          thisVideo.current?.play();
          setCapturing(!capturing);
        }}
        onPause={() => {
          thisVideo.current?.pause();
          setCapturing(!capturing);
        }} 
      />
    </>
  );
}

export default IncomingVideo;
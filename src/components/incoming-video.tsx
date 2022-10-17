import React, { useEffect, useRef, useState } from "react";
import Controls from "./controls";

type IncomingVideoProps = {
  playing: boolean;
  onError: () => void;
  onLoad: (video: HTMLVideoElement | null, downsampledHeight: number, downsampledWidth: number) => void;
}
/**
 * The video element that will be sourced with getUserMedia's MediaStream.
 * Set playsinline to true so that iOS doesn't make it go full screen on play.
 * Also mute it, just in case.
 */
const IncomingVideo = ({ playing, onError, onLoad }: IncomingVideoProps) => {
  // TODO: skipped downsampling while figuring out perspective transforms
  // const idealWidth: number = 640;
	// const idealHeight: number = 480;

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
   * TODO: Skipped while figuring out perspective transforms
   * @return The rate at which video should be downsampled to achieve ideal
   */
  // const calculateDownsample = function(video: HTMLVideoElement): number {
  //   console.log(video.width, video.height);
  //   let widthDownsample = video.videoWidth / idealWidth;
  //   let heightDownsample = video.videoHeight / idealHeight;
  //   return (widthDownsample > heightDownsample) ? 
  //     heightDownsample : 
  //     widthDownsample;
  // };
  // Currently capturing video
  const [stream, setStream] = useState<MediaStream | null>(null);

  // How much the video size should be reduced by
  // TODO: skipped because while figuring out perspective transforms
  // const [downsampleRate, setDownsampleRate] = useState<number>(4);
  
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

  useEffect(() => {
    if (thisVideo?.current && stream) {
    	stream.getAudioTracks().forEach(track => track.enabled = false);
      thisVideo.current.srcObject = stream;

      // const newDownsampleRate = calculateDownsample(thisVideo.current);
      // if (newDownsampleRate > downsampleRate) {
      //   setDownsampleRate(newDownsampleRate);
      // }
      // TODO: https://developer.chrome.com/blog/play-request-was-interrupted/#fix
      thisVideo.current.play();
    }
  }, [thisVideo, stream]);

  useEffect(() => {
    if (playing && thisVideo.current) {
      thisVideo.current.play();
    } else if (!playing && thisVideo.current) {
      thisVideo.current.pause();
    }
  }, [playing, thisVideo]);

  return (
    <video
      disablePictureInPicture={true}
      style={{ display: "none" }}
      ref={thisVideo}
      playsInline={true}
      muted={true}
      onLoadedMetadata={() => onLoad(
        thisVideo.current, 
        thisVideo.current?.videoWidth || 0, 
        thisVideo.current?.videoHeight || 0
      )}
    />
  );
}

export default IncomingVideo;
import React, { useEffect, useRef, useState } from "react";
import Converter from './converter';

type ProcessorProps = {
  video: HTMLVideoElement | null;
  height: number;
  width: number;
  // TODO: assign correct type
  onConvert: (value: any) => void;
};

const Processor = ({ video, height, width }: ProcessorProps) => {

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [rafId, setRafId] = useState<number>(-1);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [recording, setRecording] = useState<boolean>(false);

  const offscreenCanvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (offscreenCanvas.current) {
      setContext(offscreenCanvas.current.getContext('2d', { alpha: false }))
    }
  }, [offscreenCanvas]);

  const process = (context: CanvasRenderingContext2D, video: HTMLVideoElement) => {
    setRafId(window.requestAnimationFrame(() => process(context, video)));
    context.drawImage(video, 0, 0, width, height);
    setImageData(context.getImageData(0, 0, width, height));
  }

  const stop = () => {
    window.cancelAnimationFrame(rafId);
  };

  useEffect(() => {
    if (context && video) {
      process(context, video);
      // TODO: connect this to actual user interaction
      setRecording(true);
    } else {
      // TODO: how to stop this correctly?
      stop();
      setRecording(false);
    }
  }, [context, video]);


  return (
    <>
      <canvas
        id="offscreen-canvas"
        style={{
          display: 'none'
        }}
        width={width}
        height={height}
        ref={offscreenCanvas}
      />
      <Converter
        height={height}
        width={width}
        imageData={imageData}
        // TODO: do something with this vector when it works
        onConvert={(avgVector) => {}}
      />
    </>
  );
}

export default Processor;
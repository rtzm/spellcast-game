import React, { useEffect, useRef, useState } from "react";
import { Vector } from "../types";
import createConverter, { Converter } from "./converter";

type ProcessorProps = {
  video: HTMLVideoElement | null;
  height: number;
  width: number;
  // TODO: assign correct type
  onProcessVector: (value: Vector) => void;
};

const Processor = ({ video, height, width, onProcessVector }: ProcessorProps) => {

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [rafId, setRafId] = useState<number>(-1);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [recording, setRecording] = useState<boolean>(false);
  const [converter, setConverter] = useState<Converter | null>(null);

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

  // Create Converter singleton
  useEffect(() => {
    setConverter(createConverter());
  }, [])
  
  useEffect(() => {
    if (imageData) {
      onProcessVector(converter?.convertFrame(imageData) || { x: 0, y: 0 });
    }
  }, [converter, imageData]);

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
    return () => { stop(); }
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
    </>
  );
}

export default Processor;
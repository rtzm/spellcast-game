import React, { useEffect, useRef, useState } from "react";
import * as jsfeat from 'jsfeat';

import { Vector } from "../types";
import createConverter, { Converter } from "./converter";

type ProcessorProps = {
  video: HTMLVideoElement | null;
  height: number;
  width: number;
  onProcessVector: (value: Vector) => void;
};

const TOTAL_WIDTH = 640;
const TOTAL_HEIGHT = 480;
const TOP_WIDTH_WARP = 0.5;
const START_TOP_LEFT = (TOTAL_WIDTH * TOP_WIDTH_WARP) * 1/2;
const START_TOP_RIGHT = (TOTAL_WIDTH * TOP_WIDTH_WARP) * 3/2;
const ZOOMED_WIDTH = START_TOP_RIGHT - START_TOP_LEFT;
const BOTTOM_WIDTH_WARP = 0.5;
const BOTTOM_ZOOMED_HEIGHT = TOTAL_HEIGHT * BOTTOM_WIDTH_WARP;

const Processor = ({ video, height, width, onProcessVector }: ProcessorProps) => {

  const [offscreenContext, setOffscreenContext] = useState<CanvasRenderingContext2D | null>(null);
  const [zoomedContext, setZoomedContext] = useState<CanvasRenderingContext2D | null>(null);
  const [initialZoomedContext, setInitialZoomedContext] = useState<CanvasRenderingContext2D | null>(null);
  const rafRef = React.useRef<number | undefined>();
  const previousTimeRef = React.useRef<number>();

  const [converter, setConverter] = useState<Converter | null>(null);
  const [img_u8, setImgU8] = useState<any>();
  const [img_u8_warp, setImgU8Warp] = useState<any>();
  const [transform, setTransform] = useState<any>();

  const offscreenCanvas = useRef<HTMLCanvasElement>(null);
  const zoomedCanvas = useRef<HTMLCanvasElement>(null);
  const initialZoomedCanvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (offscreenCanvas.current) {
      setOffscreenContext(offscreenCanvas.current.getContext('2d', { alpha: false }))
    }
  }, [offscreenCanvas]);

  useEffect(() => {
    if (zoomedCanvas.current) {
      const tempZoomedContext = zoomedCanvas.current.getContext('2d', { alpha: false });
      if (tempZoomedContext) {
        tempZoomedContext.imageSmoothingEnabled = true;
        // @ts-ignore
        tempZoomedContext.mozImageSmoothingEnabled = true;
        // @ts-ignore
        tempZoomedContext.webkitImageSmoothingEnabled = true;
        // @ts-ignore
        tempZoomedContext.msImageSmoothingEnabled = true;
  
        setZoomedContext(tempZoomedContext)  
      }
    }
  }, [zoomedCanvas]);

  useEffect(() => {
    if (initialZoomedCanvas.current) {
      const tempInitialZoomedContext = initialZoomedCanvas.current.getContext('2d', { alpha: false });
      if (tempInitialZoomedContext) {
        tempInitialZoomedContext.imageSmoothingEnabled = true;
        // @ts-ignore
        tempInitialZoomedContext.mozImageSmoothingEnabled = true;
        // @ts-ignore
        tempInitialZoomedContext.webkitImageSmoothingEnabled = true;
        // @ts-ignore
        tempInitialZoomedContext.msImageSmoothingEnabled = true;
  
        setInitialZoomedContext(tempInitialZoomedContext)  
      }
    }
  }, [initialZoomedCanvas]);

  const process = (
    time: number,
    offscreenContext: CanvasRenderingContext2D,
    zoomedContext: CanvasRenderingContext2D,
    video: HTMLVideoElement
  ) => {
    if (previousTimeRef.current) {
      // TODO: move more of this into the Converter
      offscreenContext.drawImage(video, 0, 0, width, height);

      if (offscreenCanvas && offscreenCanvas.current && initialZoomedContext && initialZoomedCanvas && initialZoomedCanvas.current) {
        initialZoomedContext.drawImage(
          offscreenCanvas.current,
          0,
          0,
          TOTAL_WIDTH,
          BOTTOM_ZOOMED_HEIGHT,
          0,
          0,
          TOTAL_WIDTH,
          TOTAL_HEIGHT);

        // jsfeat projection transform
        const tempImageData = initialZoomedContext.getImageData(0, 0, TOTAL_WIDTH, TOTAL_HEIGHT);

        // Make image grayscale for easier processing
        jsfeat.imgproc.grayscale(tempImageData.data, TOTAL_WIDTH, TOTAL_HEIGHT, img_u8);

        // warp perspective
        jsfeat.imgproc.warp_perspective(img_u8, img_u8_warp, transform, 0);

        // render result back to canvas
        var data_u32 = new Uint32Array(tempImageData.data.buffer);
        var alpha = (0xff << 24);
        var i = img_u8_warp.cols*img_u8_warp.rows, pix = 0;
        while(--i >= 0) {
            pix = img_u8_warp.data[i];
            data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
        }
        initialZoomedContext.putImageData(tempImageData, 0, 0);
        
        zoomedContext.drawImage(initialZoomedCanvas.current,
          START_TOP_LEFT, 0, ZOOMED_WIDTH, BOTTOM_ZOOMED_HEIGHT,
          0, 0, ZOOMED_WIDTH, BOTTOM_ZOOMED_HEIGHT);
        const imageData = zoomedContext.getImageData(0, 0, ZOOMED_WIDTH, BOTTOM_ZOOMED_HEIGHT);
        onProcessVector(converter?.convertFrame(imageData) || { x: 0, y: 0 })  
      }
    }
    previousTimeRef.current = time;
    rafRef.current = window.requestAnimationFrame((time) => process(time, offscreenContext, zoomedContext, video));
  }

  // Create Converter singleton and transform singletons
  useEffect(() => {
    setConverter(createConverter());
    setImgU8(new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t));
    setImgU8Warp(new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t));
    const tempTransform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);

    // TODO: replace this matrix with the actual one I want
    jsfeat.math.perspective_4point_transform(tempTransform,
      // x1, y1 -> x1', y1' 
      0, 0, START_TOP_LEFT, 0,
      // x2, y2 -> x2', y2'
      640, 0, START_TOP_RIGHT, 0,
      // x3, y3 -> x3', y3'
      640, 480, 640, BOTTOM_ZOOMED_HEIGHT,
      // x4, y4 -> x4', y4'
      0, 480, 0, BOTTOM_ZOOMED_HEIGHT
    );

    jsfeat.matmath.invert_3x3(tempTransform, tempTransform);
    setTransform(tempTransform);
  }, [])

  useEffect(() => {
    if (offscreenContext && zoomedContext && video) {
      rafRef.current = window.requestAnimationFrame((time) => process(time, offscreenContext, zoomedContext, video));
    }
    return () => { rafRef.current && window.cancelAnimationFrame(rafRef.current); }
  }, [offscreenContext, video]);


  return (
    <>
      <canvas
        id="initial-zoomed-canvas"
        style={{
          display: 'none'
        }}
        width={TOTAL_WIDTH}
        height={TOTAL_HEIGHT}
        ref={initialZoomedCanvas}
      />
      <canvas
        id="offscreen-canvas"
        style={{
          display: 'none'
        }}
        width={TOTAL_WIDTH}
        height={TOTAL_HEIGHT}
        ref={offscreenCanvas}
      />
      <canvas
        id="offscreen-zoomed-canvas"
        style={{
          display: 'none'
        }}
        width={ZOOMED_WIDTH}
        height={BOTTOM_ZOOMED_HEIGHT}
        ref={zoomedCanvas}
      />
    </>
  );
}

export default Processor;
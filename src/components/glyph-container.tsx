import React, { MouseEvent, TouchEvent, useEffect, useRef, useState } from "react";
import { createWorker, Worker } from 'tesseract.js';
import { Vector } from "../types";

type GlyphContainerProps = {
  deltaVector: Vector;
  onCast: (text: string) => void;
}

const GlyphContainer = ({ deltaVector, onCast }: GlyphContainerProps) => {
  const totalWidth = 480;
  const totalHeight = 320;
  const SENSIVITITY = 2;

  const [reticlePosition, setReticlePosition] = useState<Vector>({
    x: Math.round(totalWidth/2),
    y: Math.round(totalHeight/2)
  })
  const glyphCanvas = useRef<HTMLCanvasElement>(null);
  const reticleCanvas = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [tesseractWorker, setTesseractWorker] = useState<Worker | null>()

  useEffect(() => {
    const worker = createWorker({
      // TODO: figure out local trained data (not reading from here correctly)
      // langPath: "./../assets/lang-data",
      logger: m => console.log(m),
    });
    (async () => {
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
    })();
    setTesseractWorker(worker);
    return () => { worker?.terminate() };
  }, []);

  /**
   * Get current position and subtract vector
   * (since the vectors are inverted for the image)
   * TODO: Move this to a separate util.
   * 
   * @param startVector 
   * @param deltaVector 
   * @returns 
   */
  const getEndVector = (startVector: Vector, deltaVector: Vector, sensitivity: number): Vector => {
    const newVector = {
      x: startVector.x - deltaVector.x * sensitivity,
      y: startVector.y - deltaVector.y * sensitivity
    };

    // Prevent position from moving past frame
    if (newVector.x > totalWidth) {
      newVector.x = totalWidth;
    }
    if (newVector.x < 0) {
      newVector.x = 0;
    }
    if (newVector.y > totalHeight) {
      newVector.y = totalHeight;
    }
    if (newVector.y < 0) {
      newVector.y = 0;
    }

    return newVector;
  };

  useEffect(() => {
    const glyphContext = glyphCanvas.current?.getContext('2d', { alpha: true });
    const reticleContext = reticleCanvas.current?.getContext('2d', { alpha: true });

    if (glyphContext && reticleContext) {
      glyphContext.strokeStyle = "red";
      reticleContext.strokeStyle = "black";

      const endVector = getEndVector(reticlePosition, deltaVector, SENSIVITITY);

      if (drawing) {
        // Draw path
        // TODO: replace drawing with offscreen canvas for optimization
        // See https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
        // Or possibly https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
        glyphContext.beginPath();
        glyphContext.moveTo(reticlePosition.x, reticlePosition.y);
        glyphContext.lineTo(endVector.x, endVector.y);
        glyphContext.stroke();		
      }
  
      // draw reticle
      reticleContext.clearRect(0, 0, totalWidth, totalHeight);
      reticleContext.beginPath();
      if (drawing) {        
        // Draw a circle around the point
        reticleContext.arc(endVector.x, endVector.y, 5, 0, 2 * Math.PI);
      } else {
        // Draw a horizontal line
        reticleContext.moveTo(endVector.x - 5, endVector.y);
        reticleContext.lineTo(endVector.x + 5, endVector.y);
        // And a vertical line
        reticleContext.moveTo(endVector.x, endVector.y - 5);
        reticleContext.lineTo(endVector.x, endVector.y + 5);
      }
      reticleContext.stroke();

      setReticlePosition(endVector);  
    }
  }, [deltaVector, drawing]);

  const checkCasted = (event: TouchEvent) => {
    console.log(event);
  };

  const cast = async (event: MouseEvent | TouchEvent) => {
    if (!tesseractWorker || !glyphCanvas.current) {
      return;
    }

    const { data: { text } } = await tesseractWorker.recognize(glyphCanvas.current);
    onCast(text);
  };
  return (
    <div
      id="glyph-container"
      onTouchStart={e => setDrawing(true)}
      onTouchMove={checkCasted}
      onTouchEnd={e => setDrawing(false)}
      onMouseEnter={e => setDrawing(true)}
      onMouseLeave={e => setDrawing(false)}
      onMouseDown={cast}
    >
      <canvas
        id="glyph"
        width={totalWidth}
        height={totalHeight}
        ref={glyphCanvas}
      >
        Your browser does not support HTML5
      </canvas>
      <canvas
        id="reticle"
        width={totalWidth}
        height={totalHeight}
        ref={reticleCanvas}
      />
    </div>
  );
};

export default GlyphContainer;
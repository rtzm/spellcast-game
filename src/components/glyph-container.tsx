import React, { MouseEvent, TouchEvent, useEffect, useRef, useState } from "react";
import { createWorker, Worker } from 'tesseract.js';
import { Vector } from "../types";

type GlyphContainerProps = {
  deltaVector: Vector;
  onCast: (text: string) => void;
}

const GlyphContainer = ({ deltaVector, onCast }: GlyphContainerProps) => {
  const X_SENSITIVITY = 1;
  const Y_SENSITIVITY = 1.15;

  const [reticlePosition, setReticlePosition] = useState<Vector>({ x: 0, y: 0 });
  const [totalWidth, setTotalWidth] = useState<number>(0);
  const [totalHeight, setTotalHeight] = useState<number>(0);
  const container = useRef<HTMLDivElement>(null);
  const glyphCanvas = useRef<HTMLCanvasElement>(null);
  const reticleCanvas = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [tesseractWorker, setTesseractWorker] = useState<Worker | null>()

  useEffect(() => {
    const worker = createWorker({
      // TODO: should we add local trained data? Should we use best quality? (see https://github.com/naptha/tessdata)
      // Maybe allow switching modes based on user input to calibrate
      langPath: "https://tessdata.projectnaptha.com/4.0.0_fast",
      // TODO: determine which is best strategy (refresh, readOnly, or none)
      cacheMethod: 'none',
    });
    (async () => {
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      await worker.setParameters({
        tessedit_char_whitelist: "OXZ28VC6UWMS5/+",
      });
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
  const getEndVector = (startVector: Vector, deltaVector: Vector): Vector => {
    const newVector = {
      x: startVector.x - deltaVector.x * X_SENSITIVITY,
      y: startVector.y - deltaVector.y * Y_SENSITIVITY
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

  // TODO: Make total width and height dynamic based on screen
  useEffect(() => {
    if (container && container.current) {
        const actualDimensions = container.current.getBoundingClientRect();
        setTotalWidth(actualDimensions.width);
        setTotalHeight(actualDimensions.height);
        setReticlePosition({
          x: Math.round(actualDimensions.width/2),
          y: Math.round(actualDimensions.height/2)
        });
    }
  }, [container]);

  useEffect(() => {
    const glyphContext = glyphCanvas.current?.getContext('2d', { alpha: true });
    const reticleContext = reticleCanvas.current?.getContext('2d', { alpha: true });

    if (glyphContext && reticleContext) {
      glyphContext.strokeStyle = "red";
      reticleContext.strokeStyle = "black";

      const endVector = getEndVector(reticlePosition, deltaVector);

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
    // TODO: make it so you have to slide your thumb up to cast the spell
    console.log(event);
  };

  const cast = async (event: MouseEvent | TouchEvent) => {
    if (!tesseractWorker || !glyphCanvas.current) {
      return;
    }

    const { data: { text } } = await tesseractWorker.recognize(glyphCanvas.current);
    onCast(text);

    // Reset the reticle position and glyph output
    const glyphContext = glyphCanvas.current?.getContext('2d', { alpha: true });
    glyphContext?.clearRect(0, 0, totalWidth, totalHeight);
    setReticlePosition({
      x: Math.round(totalWidth/2),
      y: Math.round(totalHeight/2)
    });
  };
  return (
    <div
      style={{
        // Prevent selecting this container (using touch interactions
        // and press hold for game controls)
        WebkitTouchCallout: 'none', /* Safari */
        WebkitUserSelect: 'none', /* Chrome */     
        MozUserSelect: 'none', /* Firefox */
        msUserSelect: 'none', /* Internet Explorer/Edge */
        userSelect: 'none',
        width: '100%'
      }}
      id="glyph-container"
      onTouchStart={e => setDrawing(true)}
      onTouchMove={checkCasted}
      onTouchEnd={e => { cast(e); setDrawing(false); } }
      onMouseEnter={e => setDrawing(true)}
      onMouseLeave={e => setDrawing(false)}
      onClick={cast}
      ref={container}
    >
      <canvas
        width={totalWidth}
        height={totalHeight}
        id="glyph"
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
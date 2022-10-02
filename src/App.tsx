import React, { useEffect, useState } from 'react';
import GlyphContainer from './components/glyph-container';
import Controls from './components/controls';
import IncomingVideo from './components/incoming-video';
import Processor from './components/processor';
import './App.css';
import { Vector } from './types';

function App() {
  const [errored, setErrored] = useState<boolean>(false);
  const [video, setVideo] = useState<HTMLVideoElement| null>(null);
  const [height, setHeight] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [currentVector, setCurrentVector] = useState<Vector>({x: 0, y: 0});

  // Create canvases and objects for processing, and attach event listeners
  const videoLoadCallback = (video: HTMLVideoElement | null, downsampledHeight: number, downsampledWidth: number) => {
    setVideo(video);
    setHeight(downsampledHeight);
    setWidth(downsampledWidth);

    // // Bind processor to video playback and begin playback
    // this.video.addEventListener('playing', processor.start.bind(processor), false);
    // this.video.addEventListener('ended', processor.stop.bind(processor), false);
    // this.video.addEventListener('pause', processor.stop.bind(processor), false);	
    // this.videoControl.addEventListener('click', this.toggleControl.bind(this), false);
  
    // // Bind touch or mouse events in glyph canvas to drawing 
    // this.reticle.addEventListener('touchstart', processor.toggleRecording.bind(processor), false);
    // this.reticle.addEventListener('touchend', processor.toggleRecording.bind(processor), false);
    // this.reticle.addEventListener('click', processor.toggleRecording.bind(processor), false);
    
    // // Bind transcription event when video pauses
    // this.video.addEventListener('pause', this.transcribeGlyph.bind(this), false);	
  
  };


  return (
    <div className="App">
      <header>
        <h1>Spellcast</h1>
      </header>
      { errored ? (
        <div>Unable to run with your browser/camera.</div>
      ) : (
        <>
          <GlyphContainer
            deltaVector={currentVector}
          />
          <IncomingVideo
              onLoad={videoLoadCallback}
              onError={() => setErrored(true)}
            />

          <Processor
            video={video}
            height={height}
            width={width}
            onProcessVector={vector => setCurrentVector(vector)} 
          />
        </>
      )}
      <div id="instructions">Press the <strong>Start</strong> button to start reading in camera data. Then either click your mouse or (if on touch device) touch within the box above to begin writing. Click again or lift your finger to stop writing and move the reticle. When you're done, click <strong>Stop</strong>, and your writing will attempt to be transcribed below.</div>
      <div id="text-output"></div>
    </div>
  );
}

export default App;

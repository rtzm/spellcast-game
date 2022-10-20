import React, { useState } from 'react';
import GlyphContainer from './components/glyph-container';
import IncomingVideo from './components/incoming-video';
import Processor from './components/processor';
import './App.css';
import { Vector } from './types';
import Controls from './components/controls';

function App() {
  const [errored, setErrored] = useState<boolean>(false);
  const [video, setVideo] = useState<HTMLVideoElement| null>(null);
  const [height, setHeight] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [currentVector, setCurrentVector] = useState<Vector>({x: 0, y: 0});
  const [playing, setPlaying] = useState<boolean>(true);
  const [lastCast, setLastCast] = useState<string>("");

  // Create canvases and objects for processing, and attach event listeners
  const videoLoadCallback = (video: HTMLVideoElement | null, downsampledHeight: number, downsampledWidth: number) => {
    setVideo(video);
    setHeight(downsampledHeight);
    setWidth(downsampledWidth);  
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
            onCast={(text) => setLastCast(text)}
          />
          <h1
            style={{textAlign: 'center'}}
          >
            {lastCast}
          </h1>
          <Controls
            playing={playing}
            onPlay={() => {
              setPlaying(true);
            }}
            onPause={() => {
              setPlaying(false);
            }} 
          />
          <IncomingVideo
            playing={playing}
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
      <h3>Rules</h3>
      <div id="rules">Press the <strong>Start</strong> button to start reading in camera data. Then either click your mouse or (if on touch device) touch within the box above to begin writing. Click again or lift your finger to stop writing and move the reticle. When you're done, click <strong>Stop</strong>, and your writing will attempt to be transcribed below.</div>
    </div>
  );
}

export default App;

import React from "react";

type ControlsProps = {
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
};

const Controls = ({ playing, onPlay, onPause }: ControlsProps) => {
  return (
    <div id="controls">
      <button id="pause"
        onClick={playing ? onPause : onPlay}
      >
        {playing ? "Pause" : "Play"}
      </button>
    </div>
  );
}

export default Controls;
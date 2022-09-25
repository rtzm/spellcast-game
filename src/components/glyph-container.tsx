import React from "react";

const GlyphContainer = () => {
  return (
    <div id="glyph-container">
      <canvas id="glyph" width="480" height="320">Your browser does not support HTML5</canvas>
      <canvas id="reticle" width="480" height="320"></canvas>
    </div>
  );
};

export default GlyphContainer;
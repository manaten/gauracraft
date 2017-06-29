import { GraphicPipeline } from "./graphic_pipeline.js";

function captureWebGL(canvas) {
  var gl;
  try
  {
    gl = canvas.getContext( "experimental-webgl" );
  } catch ( e ) {
    throw "WebGLにブラウザが対応していません";
  }

  gl.viewportWidth = canvas.clientWidth;
  gl.viewportHeight = canvas.clientHeight;

  return gl;
}

const canvas = document.getElementById("screen");
const gl = captureWebGL(canvas);
const pipeline = new GraphicPipeline(gl);

pipeline.render();

import { World } from './world.js';
import { GraphicPipeline } from './graphic_pipeline.js';

onload = function() {
  function captureWebGL(canvas) {
    var gl;
    try
    {
      gl = canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' );
    } catch ( e ) {
      throw 'WebGLにブラウザが対応していません';
    }

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    return gl;
  }

  const canvas = document.getElementById( 'screen' );
  const gl = captureWebGL(canvas);
  const world = new World();
  const pipeline = new GraphicPipeline(canvas, gl, world);

  setInterval( () => { 
    pipeline.render();
  }, 16);
}

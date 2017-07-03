import { World } from './world.js';
import { Player } from './player.js';
import { GraphicPipeline } from './graphic_pipeline.js';
import { EventRouter } from './event_router.js';

onload = function() {
  function captureWebGL(canvas) {
    var gl;
    try {
      gl = canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' );
    } catch ( e ) {
      throw 'WebGLにブラウザが対応していません';
    }

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    return gl;
  }

  const canvas = document.getElementById('screen');
  const gl = captureWebGL(canvas);
  const world = new World();
  const player = new Player( world );
  const pipeline = new GraphicPipeline(canvas, gl, world, player);
  const router = new EventRouter(document, canvas, player);

  let last = new Date().getTime();
  setInterval( () => { 
    const current = new Date().getTime();
    const delta = ( current - last ) / 1000;
    last = current;

    player.update(delta);
    pipeline.render();
  }, 16);
}

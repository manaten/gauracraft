import { mat4, vec3 } from 'gl-matrix';
import { World } from './world.js';

// 一連のGPUの制御をまとめたコードです
// このコードで構成されたパイプラインを使って描画を行います
export class GraphicPipeline {
  // コンストラクタ
  // @param gl WebGLのインスタンス
  constructor (canvas, gl, world, player) {
    this.canvas = canvas;
    this.gl = gl;
    this.world = world;
    this.player = player;

    this.fov = 90;
    this.min = 0.1;
    this.max = 100;

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    gl.enable( gl.DEPTH_TEST );
    gl.enable( gl.CULL_FACE );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

    const vertex_code = this.vertex_code();
    const fragment_code = this.fragment_code();
    this.program = this.create_shader_program(
      this.gl,
      vertex_code,
      fragment_code
    );

    this.gl.useProgram( this.program );

    this.create_buffers( this.program );
  }

  create_shader_program( gl, vertex_code, fragment_code ) {
    // シェーダプログラムを作る
    const program = gl.createProgram();

    // バーテックスシェーダを構築
    const vertex_shader = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource( vertex_shader, vertex_code );
    gl.compileShader( vertex_shader );
    gl.attachShader( program, vertex_shader );

    if ( !gl.getShaderParameter( vertex_shader, gl.COMPILE_STATUS ) ) {
      throw "頂点シェーダがコンパイルできませんでした\n" + gl.getShaderInfoLog( vertex_shader );
    }

    // フラグメントシェーダを構築
    const fragment_shader = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource( fragment_shader, fragment_code );
    gl.compileShader( fragment_shader );
    gl.attachShader( program, fragment_shader );

    if ( !gl.getShaderParameter( fragment_shader, gl.COMPILE_STATUS ) ) {
      throw "フラグメントシェーダがコンパイルできませんでした\n" + gl.getShaderInfoLog( fragment_shader );
    }

    // シェーダプログラムたちをリンクして
    // 1つのグラフィック描画パイプラインとして構成する
    gl.linkProgram( program );

    if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
      throw "シェーダプログラムをリンクできませんでした";
    }

    return program;
  }

  vertex_code() {
    return `
      uniform mat4 proj;
      uniform mat4 view;
      uniform mat4 model;
      attribute vec3 a_pos;
      attribute vec2 a_tex_coord;
      attribute vec4 a_color;
      varying vec4 v_color;
      varying vec2 v_tex_coord;
      void main() {
        gl_Position = proj * view * model * vec4( a_pos, 1.0 );
        v_color = a_color;
        v_tex_coord = a_tex_coord;
      }
    `;
  }

  fragment_code() {
    return `
      precision highp float;
      uniform sampler2D sampler;
      varying vec4 v_color;
      varying vec2 v_tex_coord;
      void main() {
        vec4 color = texture2D( sampler, vec2( v_tex_coord.s, v_tex_coord.t ) );
        if ( color.a < 0.1 ) discard;
        gl_FragColor = vec4( color.rgb * v_color.rgb, v_color.a );
      }
    `;
  }

  create_buffers(program) {
    const gl = this.gl;

    // シェーダプログラム中で使っている各変数を引き出して
    // JavaScript側からその変数を制御できるようにする
    this.proj = gl.getUniformLocation( program, "proj" );
    this.view = gl.getUniformLocation( program, "view" );
    this.model = gl.getUniformLocation( program, "model" );

    this.sampler = gl.getUniformLocation( program, "sampler" );

    this.a_pos = gl.getAttribLocation( program, "a_pos" );
    this.a_tex_coord = gl.getAttribLocation( program, "a_tex_coord" );
    this.a_color = gl.getAttribLocation( program, "a_color" );

    // 頂点
    this.blocks = gl.createBuffer();

    // テクスチャ
    this.texture = gl.createTexture();
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, this.texture );
    gl.uniform1i( this.sampler, 0 );

    // とりあえず芝っぽい感じにしておく。
    // TODO: テクスチャを画像から拾うようにする
    let image = [ ];
    for( let y = 0; y < 128; ++y ) {
      for( let x = 0; x < 128; ++x ) {
        const r = Math.random();
        if ( r > 0.5 ) image.push( 200*r, 255, 200*r, 255 );
        else if ( r > 0.4 ) image.push( 64, 140, 53, 255 );
        else if( r > 0.01 ) image.push( 52, 104, 52, 255 );
        else image.push( 50, 20, 5, 255 ); // 土っぽく
      }
    }

    var white = new Uint8Array( image );
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, 128, 128, 0, gl.RGBA, gl.UNSIGNED_BYTE, white );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
  }


  render() {
    this.follow_screen_settings();

    this.set_viewport_all();
    this.clear_viewport();

    // シェーダプログラムの利用を宣言
    this.gl.useProgram( this.program );

    // ブロックたちを描画して
    this.render_blocks();
    // プレイヤーたちを描画したら
    this.render_players();
    // インターフェイスを描画する
    this.render_interfaces();
  }

  // ブロックを描画する
  render_blocks() {
    const gl = this.gl;
    // Worldから現在位置のブロックの頂点情報を引っ張り出す
    const eye_pos = this.player.get_eye_pos();
    const chunk_pos = World.calc_chunk_pos( eye_pos[0], eye_pos[1], eye_pos[2] );

    if( !this.last_chunk_pos || this.last_chunk_pos[0] != chunk_pos[0] || this.last_chunk_pos[1] != chunk_pos[1] || this.last_chunk_pos[2] != chunk_pos[2] ) {
      const [ verticies, vertex_count ] = this.world.create_verticies(eye_pos[0], eye_pos[1], eye_pos[2]);

      // WebGLの頂点バッファに変換する
      gl.bindBuffer( gl.ARRAY_BUFFER, this.blocks );
      gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(verticies), gl.STATIC_DRAW );

      this.blocks.vertex_count = vertex_count;

      this.last_chunk_pos = chunk_pos;
    }

    // ブロックがないなら描画しない
    if ( this.blocks == null ) return;
    if ( this.blocks.vertex_count == null ) return;
    if ( this.blocks.vertex_count == 0 ) return;

    // バッファに流し込む
    this.draw_buffer( this.blocks );
  }

  // プレイヤーを描画する
  render_players() {
    // TODO: 作る
  }

  // インターフェイスを描画する
  render_interfaces() {
    // TODO: 作る
  }

  // 指定されたバッファをシェーダ側の変数に結びつけて描画する
  draw_buffer( buffer ) {
    const gl = this.gl;

    // 行列関連処理をアドホックだが一旦ここに置く
    var model = mat4.create();
    gl.uniformMatrix4fv(this.model, false, model);

    this.update_view();
    this.update_projection( this.fov, this.min, this.max );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, this.texture );
    gl.uniform1i( this.sampler, 0 );

    gl.bindBuffer( gl.ARRAY_BUFFER, buffer );

    gl.enableVertexAttribArray( this.a_pos );
    gl.vertexAttribPointer( this.a_pos,       3, this.gl.FLOAT, false, 9*4, 0*4 );
    gl.enableVertexAttribArray( this.a_color );
    gl.vertexAttribPointer( this.a_tex_coord, 2, this.gl.FLOAT, false, 9*4, 3*4 );
    gl.enableVertexAttribArray( this.a_tex_coord );
    gl.vertexAttribPointer( this.a_color,     4, this.gl.FLOAT, false, 9*4, 5*4 );

    gl.drawArrays(gl.TRIANGLES, 0, this.blocks.vertex_count);
    gl.flush();
  }

  // 画面(この場合canvas)の状態が変わったことを検出して
  // WebGL側もそれに追従するようにする
  follow_screen_settings() {
    if(
      this.canvas.clientWidth == this.gl.viewportWidth &&
      this.canvas.clientHeight == this.gl.viewportHeight
    ) {
      // 変わってないからそのまま
      return;
    }

    // 変わったので追従する

    this.gl.viewportWidth = this.canvas.clientWidth;
    this.gl.viewportHeight = this.canvas.clientHeight;

    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    this.update_projection( this.fov, this.min, this.max );
  }

  // 射影行列(projection matrix)を指定されたものに更新
  // (射影行列: 立体感を2次元の画面上で表現する変換を行うための行列)
  update_projection( fov, min, max ) {
    this.fov = fov;
    this.min = min;
    this.max = max;

    const aspect = this.gl.viewportWidth / this.gl.viewportHeight;
    let proj_mat = mat4.create();
    mat4.perspective( proj_mat, fov, aspect, min, max );
    this.gl.uniformMatrix4fv( this.proj, false, proj_mat );
  }

  // 視線・視野を表す行列(view matrix)(別名"カメラ"行列)を指定されたものに更新
  update_view( )
  {
    const gl = this.gl;
    const player = this.player;

    // プレイヤーのもっている視点を反映する
    const eye_pos = player.get_eye_pos();
    const yaw = player.get_yaw();
    const pitch = player.get_pitch();
    const roll = player.get_roll();

    const view_mat = mat4.create();
    mat4.rotate( view_mat, view_mat, -yaw,   [ 1, 0, 0 ] );
    mat4.rotate( view_mat, view_mat, +pitch, [ 0, 1, 0 ] );
    mat4.rotate( view_mat, view_mat, -roll,  [ 0, 0, 1 ] );
    mat4.translate( view_mat, view_mat, vec3.negate(vec3.create(), eye_pos) );

    gl.uniformMatrix4fv( this.view, false, view_mat );
  }

  // 描画範囲を領域全体に設定
  set_viewport_all() {
    this.gl.viewport( 0, 0, this.gl.viewportWidth, this.gl.viewportHeight );
  }

  // 描画範囲の内容をクリア
  clear_viewport() {
    // this.gl.clearColor( 0.58, 0.76, 0.86, 1.0 ); // 青空でクリアするならこんな感じ
    this.gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    this.gl.clear( this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT );
  }
}

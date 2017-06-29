// 一連のGPUの制御をまとめたコードです
// このコードで構成されたパイプラインを使って描画を行います
export class GraphicPipeline {
  // コンストラクタ
  // @param gl WebGLのインスタンス
  constructor (gl) {
    this.gl = gl;

    const vertex_code = this.vertex_code();
    const fragment_code = this.fragment_code();
    this.program = this.create_shader_program(
      this.gl,
      vertex_code,
      fragment_code
    );

    // シェーダプログラムを実際に使い始める
    this.gl.useProgram( this.program );

    // シェーダプログラム中で使っている各変数を引き出して
    // JavaScript側からその変数を制御できるようにする
    this.proj = this.gl.getUniformLocation( this.program, "proj" );
    this.view = this.gl.getUniformLocation( this.program, "view" );
    this.model = this.gl.getUniformLocation( this.program, "model" );
    this.sampler = this.gl.getUniformLocation( this.program, "sampler" );

    this.a_pos = this.gl.getAttribLocation( this.program, "a_pos" );
    this.a_color = this.gl.getAttribLocation( this.program, "a_color" );
    this.a_tex_coord = this.gl.getAttribLocation( this.program, "a_tex_coord" );

    // シェーダプログラムに流し込むバッファ群を設定する
    this.gl.enableVertexAttribArray( this.a_pos );
    this.gl.enableVertexAttribArray( this.a_color );
    this.gl.enableVertexAttribArray( this.a_tex_coord );
  }

  vertex_code() {
    return `
      uniform mat4 proj;
      uniform mat4 view;
      uniform mat4 model;
      attribute vec3 a_pos;
      attribute vec4 a_color;
      attribute vec2 a_tex_coord;
      varying vec4 v_color;
      varying vec2 v_tex_coord;
      void main() {
        gl_Position = proj * view * ( model * vec4( a_pos, 1.0 ) );
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

  push_block() {
    // TODO: ブロックの頂点を流し込む
  }

  render() {
    this.gl.useProgram( this.program );
    // TODO: 頂点列を描く
  }
}

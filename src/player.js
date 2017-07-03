// プレイヤーを表現するクラス

import { vec3, quat } from 'gl-matrix';

export class Player {
  constructor( world ) {
    this.world = world;
    this.keys = {
      JUMP:   false,
      FOWARD: false,
      BACK:   false,
      LEFT:   false,
      RIGHT:  false,
    };

    this.respawn();
  }

  respawn() {
    console.log("You respawned!");
    // TODO: セーブデータなどからスポーン位置を取り出せるようにする
    this.pos = vec3.fromValues( 10 / 2 + 0.5, 5, 10 / 2 + 0.5 );
    this.landing = true;  // 地面上にいるか？
    this.velocity = vec3.fromValues( 0, 0, 0 );
    this.yaw = 0.0;
    this.pitch = Math.PI/2;
  }

  // 視線の開始位置(カメラの位置として使う)
  get_eye_pos() {
    const player_height = vec3.fromValues( 0.0, 1.5, 0.0 );
    return vec3.add( vec3.create(), this.pos, player_height );
  }

  get_yaw() { return this.yaw; }
  get_pitch() { return this.pitch; }
  get_roll() { return 0.0; }

  // 視線の方角(正規化されていないかもしれません)
  get_eye_direction() {
    let dir = vec3.fromValues(0, 0, 1);
  }

  code_to_key( code ) {
    const table = {
      ' ': 'JUMP',
      'w': 'FOWARD',
      'a': 'LEFT',
      's': 'BACK',
      'd': 'RIGHT'
    };
    return table[ code ];
  }

  onkeydown( code ) {
    const key = this.code_to_key( code );
    if( key ) this.keys[ key ] = true;
  }

  onkeyup( code ) {
    const key = this.code_to_key( code );
    if( key ) this.keys[ key ] = false;
  }

  onmousedown( code ) {
  }
  onmouseup( code ) {
  }

  onmousemove( x, y, dragging, drag_start ) {
    // 適当な定数でマウス移動を弱くしてyaw, pitchを動かす
    this.pitch += x / 100.0;
    this.yaw -= y / 100.0;

    // 上下は首の回る範囲を-90度〜90度まで制限する
    this.yaw = Math.max( this.yaw, -Math.PI/2 );
    this.yaw = Math.min( this.yaw, +Math.PI/2 );
  }

  update(delta) {
    // 地面におらず落下している
    if ( !this.landing ) {
      this.velocity[1] -= 9.80665; //重力定数
    }

    // ジャンプしたので上向きの速度を得た
    if ( this.keys.JUMP && this.landing ) {
      this.velocity[1] = 9.80665 * 12; // ちょうど10Gの速度で飛び上がる
    }

    // 平面方向移動
    const deg90 = Math.PI/2;

    let walk_vel = vec3.fromValues( 0, 0, 0 );
    if ( this.keys.RIGHT ) {
      walk_vel[0] += Math.cos( this.pitch + deg90 * 0 );
      walk_vel[2] += Math.sin( this.pitch + deg90 * 0 );
    }
    if ( this.keys.LEFT ) {
      walk_vel[0] += Math.cos( this.pitch + deg90 * 2 );
      walk_vel[2] += Math.sin( this.pitch + deg90 * 2 );
    }
    if ( this.keys.FOWARD ) {
      walk_vel[0] += Math.cos( this.pitch + deg90 * 3 );
      walk_vel[2] += Math.sin( this.pitch + deg90 * 3 );
    }
    if ( this.keys.BACK ) {
      walk_vel[0] += Math.cos( this.pitch + deg90 * 1 );
      walk_vel[2] += Math.sin( this.pitch + deg90 * 1 );
    }
    vec3.normalize(walk_vel, walk_vel);

    // 摩擦・空気抵抗計算
    if ( vec3.length(walk_vel) > 0 ) {
      // 漫画的な世界観なので空中にいるときにも
      // 動きたい側に向けて加速度を生じさせる力を持っている
      // ...が、流石に地面にいるときよりも少し弱くする
      const speed = this.landing ? 3 : 2;
      this.velocity[0] = speed * walk_vel[0];
      this.velocity[2] = speed * walk_vel[2];
    } else {
      // 抵抗による減速
      this.velocity[0] /= this.landing ? 1.50 : 1.01;
      this.velocity[2] /= this.landing ? 1.50 : 1.01;
    }


    // 今回のデルタ時間あたりの移動量に一度変換する
    // velocityは1秒(=1000ミリ秒)あたりの移動量なのでこの値に調節をしている
    vec3.scale(this.velocity, this.velocity, delta);

    // 衝突解決して停止位置に現在位置を更新
    [ this.pos, this.velocity, this.landing ] = this.world.resolve_collision( this.pos, this.velocity, 0.25 );

    // 衝突解決はdeltaがかかっている状態で移動ベクトルを求めているので、1秒あたりの移動量に戻す
    vec3.scale(this.velocity, this.velocity, 1.0/delta);

    // 高さが-100を超えたら死んだと判定してリスポーンする
    if( this.pos[1] < -100 ) {
      this.respawn();
    }
  }
}

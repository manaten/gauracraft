import { vec3 } from 'gl-matrix';

function check_face_box_collide( face, box ) {
  const half_len = box.size/2;
  if ( face.axis == 2 ) {
    return box.z > face.p  - half_len &&
           box.z < face.p  + half_len &&
           box.x > face.s0 - half_len &&
           box.x < face.s1 + half_len ;
  } else {
    return box.x > face.p  - half_len &&
           box.x < face.p  + half_len &&
           box.z > face.s0 - half_len &&
           box.z < face.s1 + half_len ;
  }
}

function check_rect_rect_collide( r1, r2 )
{
  if ( r2.x1 > r1.x1 && r2.x1 < r1.x2 && r2.z1 > r1.z1 && r2.z1 < r1.z2 ) return true;
  if ( r2.x2 > r1.x1 && r2.x2 < r1.x2 && r2.z1 > r1.z1 && r2.z1 < r1.z2 ) return true;
  if ( r2.x2 > r1.x1 && r2.x2 < r1.x2 && r2.z2 > r1.z1 && r2.z2 < r1.z2 ) return true;
  if ( r2.x1 > r1.x1 && r2.x1 < r1.x2 && r2.z2 > r1.z1 && r2.z2 < r1.z2 ) return true;
  return false;
}

export class CollisionResolver {
  constructor( world, pos, vel, size ) {
    this.world = world;
    this.pos = pos;
    this.vel = vel;
    this.size = size;
  }

  // xz移動の範囲で衝突する可能性があるオブジェクトを返す
  iterate_xz_collision_candidates( pos, vel ) {
    const world = this.world;

    // 現在どのブロック座標にいるのか
    const block_pos = vec3.fromValues( Math.floor(pos[0]), Math.floor(pos[1]), Math.floor(pos[2]) );

    // 前後左右移動で衝突するオブジェクトを求める
    // TODO: 1マス分しか判定してないので高速移動で突き抜けてしまう問題を解決する。ブレゼンハムアルゴリズム？
    let candidates = [];
    for ( var x = block_pos[0] - 1; x <= block_pos[0] + 1; ++x ) {
      for ( var z = block_pos[2] - 1; z <= block_pos[2] + 1; ++z ) {
        for ( var y = block_pos[1]; y <= block_pos[1] + 1; ++y ) {
          if ( !world.get_block( x, y, z ).collidable ) continue;

          if ( world.get_block( x-1, y, z   ).collidable ) candidates.push( { axis: 0, p: x,   dir: -1, s0: z, s1: z+1 } );
          if ( world.get_block( x+1, y, z   ).collidable ) candidates.push( { axis: 0, p: x+1, dir: +1, s0: z, s1: z+1 } );
          if ( world.get_block( x,   y, z-1 ).collidable ) candidates.push( { axis: 2, p: z,   dir: -1, s0: x, s1: x+1 } );
          if ( world.get_block( x,   y, z+1 ).collidable ) candidates.push( { axis: 2, p: z+1, dir: +1, s0: x, s1: x+1 } );
        }
      }
    }

    return candidates;
  }

  // 左右方向への衝突を調べる
  resolve_xz_collision( pos, vel, landing, size ) {
    const candidates = this.iterate_xz_collision_candidates( pos, vel );

    // オブジェクトを立方体と近似して衝突判定する
    const box = {
      x: pos[0] + vel[0],
      y: pos[1] + vel[2],
      size: size
    };

    // 前後左右移動の衝突解決
    candidates
      .filter( (face) => vel[face.axis] * face.dir < 0 )
      .filter( (face) => check_face_box_collide( face, box ) )
      .forEach( (face) => {
        pos[face.axis] = face.p + box.size / 2 * ( vel[face.axis] > 0 ? -1 : 1 );
        vel[face.axis] = 0;
      } );

    return [ pos, vel, landing ];
  }

  // y移動の範囲で衝突する可能性があるオブジェクトを位置関係が近い順に返す
  iterate_y_collision_candidates( pos, vel ) {
    // 現在どのブロック座標にいるのか
    const block_pos = vec3.fromValues( Math.floor(pos[0]), Math.floor(pos[1]), Math.floor(pos[2]) );

    // 移動元の高さ・移動先の高さ
    const current_height = Math.floor(pos[1]);
    const moved_height = Math.floor(pos[1] + vel[1]);

    // この移動において一番低い位置と一番高い位置
    const max_height = Math.max(current_height, moved_height);
    const min_height = Math.min(current_height, moved_height);

    // 高さ方向の衝突候補
    let candidates = [];
    // 移動の一番低い位置から一番高い位置までの間にあるブロックたちが衝突の候補
    // TODO: 左右移動が激しく素早いときに衝突しないはずの地面に衝突する問題を解決する(そんなことはまず無いと思うが...)
    for ( let x = block_pos[0] - 1; x <= block_pos[0] + 1; ++x ) {
      for ( let z = block_pos[2] - 1; z <= block_pos[2] + 1; ++z ) {
        for ( let y = min_height; y <= max_height; ++y ) {
          if ( this.world.get_block( x, y, z ).collidable ) {
            candidates.push( { y: y, x1: x, z1: z, x2: x + 1, z2: z + 1 } );
          }
        }
      }
    }

    // 移動方向に応じて優先する候補を逆にする
    if( vel[1] < 0 ) candidates.reverse();

    return candidates;
  }

  resolve_y_collision( pos, vel, landing, size ) {
    const player_face = {
      x1: pos[0] + vel[0] - 0.125,
      z1: pos[2] + vel[2] - 0.125,
      x2: pos[0] + vel[0] + 0.125,
      z2: pos[2] + vel[2] + 0.125
    };

    // 高さ方向の衝突候補
    const candidates = this.iterate_y_collision_candidates( pos, vel, landing );

    // 高さ方向移動の衝突解決
    const found = candidates.find( (face) => check_rect_rect_collide( face, player_face ) );

    // 落下中に縦方向にぶつかったってことは、地面にぶつかったってこと。
    landing = found && vel[1] < 0;

    if( found ) {
      if ( vel[1] < 0 ) {
        // 地面にぶつかった
        pos[1] = found.y + 1;
        vel[1] = 0;
      } else {
        // 頭をぶつけた
        pos[1] = found.y;
        vel[1] = 0;
      }
    }

    return [ pos, vel, landing ];
  }

  resolve_collision( pos, vel, size ) {
    let landing = false;
    [ pos, vel, landing ] = this.resolve_xz_collision( pos, vel, landing, size );
    [ pos, vel, landing ] = this.resolve_y_collision( pos, vel, landing, size );
    return [ vec3.add( pos, pos, vel ), vel, landing ];
  }

  resolve( ) {
    return this.resolve_collision( this.pos, this.vel, this.size );
  }
};

import { vec3 } from 'gl-matrix';
import { Chunk } from './chunk.js';

// 指定された4点を結ぶ四角形ポリゴンを張る
// これら4点は同じ長さの配列になっている必要がある
function quad_of( p1, p2, p3, p4 ) {
  console.assert( p1.length == p2.length );
  console.assert( p1.length == p3.length );
  console.assert( p1.length == p4.length );

  return [p1, p2, p3, p3, p4, p1].reduce( (a, b) => a.concat(b) );
}

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

export class World {
  static calc_chunk_pos( x, y, z ) {
    const rx = Math.floor(x / Chunk.width);
    const ry = Math.floor(y / Chunk.height);
    const rz = Math.floor(z / Chunk.depth);
    return [rx, ry, rz];
  }

  static calc_block_pos( x, y, z ) {
    // 負の値に対応する余り算
    const mod = (n, m) => ((n % m) + m) % m;
    const cx = mod(Math.floor(x), Chunk.width);
    const cy = mod(Math.floor(y), Chunk.height);
    const cz = mod(Math.floor(z), Chunk.depth);
    return [cx, cy, cz];
  }

  constructor( ) {
    this.chunks = {};
    for( let z = -10; z < 10; ++z ) {
      for( let x = -10; x < 10; ++x ) {
        const key = [ x, 0, z ];
        this.chunks[ key ] = new Chunk( x, 0, z );
        this.chunks[ key ].create_flatmap();
      }
    }
  }

  // プレイヤーから遠すぎてしばらくはロードしないと思えるチャンクをアンロードする
  // TODO: どこで呼び出すか考える
  unload_far_chunks(x, y, z) {
    // ...というのは逆に言うと必要なチャンクだけを新しいオブジェクトに入れるってこと。
    let new_chunks = {};
    for( let cz = rz - 10; cz < rz + 10; ++cz ) {
      for( let cy = ry - 10; cy < ry + 10; ++cz ) {
        for( let cx = rx - 10; cx < rx + 10; ++cx ) {
          const key = [cz, cy, cx];
          if( this.chunks[ key ] ) {
            new_chunks[ key ] = this.chunks[ key ];
          }
        }
      }
    }
    this.chunks = new_chunks;
  }

  get_chunk( cx, cy, cz ) {
    const key = [cx, cy, cz];
    const chunk = this.chunks[ key ] || new Chunk( cx, cy, cz );
    this.chunks[ key ] = chunk;
    return chunk;
  }

  // x, y, zはブロック単位座標
  get_block( x, y, z ) {
    const [cx, cy, cz] = World.calc_chunk_pos(x, y, z);

    const chunk = this.get_chunk( cx, cy, cz );
    // チャンクがないなら何もないとする
    if( !chunk ) return Block.Air;

    // チャンクがあるならそこのブロックを返す
    const [bx, by, bz] = World.calc_block_pos(x, y, z);
    return chunk.get_block( bx, by, bz );
  }

  create_verticies( px, py, pz ) {
    let verticies = [];

    for ( let x = px - Chunk.width; x < px + Chunk.width; ++x ) {
      for ( let y = py - Chunk.height; y < py + Chunk.height; ++y ) {
        for ( let z = pz - Chunk.depth; z < pz + Chunk.depth; ++z ) {
          const current = this.get_block(x, y, z);
          // 描画する必要のないブロックはスキップする
          if( !current.render ) continue;

          // 描画領域の境界線である場合は
          // その隣のブロックが何であっても透明ブロック扱いする
          // (そうしないと描画されないので中身が見えてしまう)
          const left = (x == px - Chunk.width);
          const right = (x == px + Chunk.width - 1);

          const top = (y == py - Chunk.height);
          const bottom = (y == py + Chunk.height - 1);

          const front = (z == pz + Chunk.depth - 1);  // ここだけ注意
          const back = (z == pz - Chunk.depth);

          // 各面は、その面に別のブロックが接しているときには描画しない
          // (必ず遮られてしまうから、描くだけ無駄になっちゃうので。)

          // 左面
          if ( left || this.get_block(x-1, y, z).transparent ) {
            verticies = verticies.concat(quad_of(
              [ x,       y + 1.0, z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x,       y      , z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x,       y      , z + 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x,       y + 1.0, z + 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
            ));
          }

          // 右面
          if ( right || this.get_block(x+1, y, z).transparent ) {
            verticies = verticies.concat(quad_of(
              [ x + 1.0, y      , z + 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x + 1.0, y      , z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x + 1.0, y + 1.0, z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x + 1.0, y + 1.0, z + 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
            ));
          }

          // 天井
          if ( top || this.get_block(x, y+1, z).transparent ) {
            verticies = verticies.concat(quad_of(
              [ x,       y + 1.0, z + 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x + 1.0, y + 1.0, z + 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x + 1.0, y + 1.0, z      , 1.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x,       y + 1.0, z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
            ));
          }

          // 床
          if ( bottom || this.get_block(x, y-1, z).transparent ) {
            verticies = verticies.concat(quad_of(
              [ x,       y      , z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x + 1.0, y      , z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x + 1.0, y      , z + 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x,       y      , z + 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
            ));
          }

          // 正面
          if ( front || this.get_block(x, y, z+1).transparent ) {
            verticies = verticies.concat(quad_of(
              [ x + 1.0, y + 1.0, z + 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x,       y + 1.0, z + 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x,       y,       z + 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x + 1.0, y,       z + 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
            ));
          }

          // 背面
          if ( back || this.get_block(x, y, z-1).transparent ) {
            verticies = verticies.concat(quad_of(
              [ x,       y + 1.0, z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x + 1.0, y + 1.0, z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x + 1.0, y,       z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
              [ x,       y,       z      , 0.0, 0.0, 1.0, 1.0, 1.0, 1.0 ],
            ));
          }
        }
      }
    }
    // 9要素で1頂点分なので9で割ったものを返せばOK
    return [verticies, Math.floor(verticies.length / 9)];
  }

  // xz移動の範囲で衝突する可能性があるオブジェクトを返す
  iterate_xz_collision_candidates( pos, vel ) {
    // 現在どのブロック座標にいるのか
    const block_pos = vec3.fromValues( Math.floor(pos[0]), Math.floor(pos[1]), Math.floor(pos[2]) );

    // 前後左右移動で衝突するオブジェクトを求める
    // TODO: 1マス分しか判定してないので高速移動で突き抜けてしまう問題を解決する。ブレゼンハムアルゴリズム？
    let candidates = [];
    for ( var x = block_pos[0] - 1; x <= block_pos[0] + 1; ++x ) {
      for ( var z = block_pos[2] - 1; z <= block_pos[2] + 1; ++z ) {
        for ( var y = block_pos[1]; y <= block_pos[1] + 1; ++y ) {
          if ( !this.get_block( x, y, z ).collidable ) continue;

          if ( this.get_block( x-1, y, z   ).collidable ) candidates.push( { axis: 0, p: x,   dir: -1, s0: z, s1: z+1 } );
          if ( this.get_block( x+1, y, z   ).collidable ) candidates.push( { axis: 0, p: x+1, dir: +1, s0: z, s1: z+1 } );
          if ( this.get_block( x,   y, z-1 ).collidable ) candidates.push( { axis: 2, p: z,   dir: -1, s0: x, s1: x+1 } );
          if ( this.get_block( x,   y, z+1 ).collidable ) candidates.push( { axis: 2, p: z+1, dir: +1, s0: x, s1: x+1 } );
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
          if ( this.get_block( x, y, z ).collidable ) {
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
}

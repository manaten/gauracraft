import { Chunk } from './chunk.js';
import { CollisionResolver } from './collision_resolver.js';

// 指定された4点を結ぶ四角形ポリゴンを張る
// これら4点は同じ長さの配列になっている必要がある
function quad_of( p1, p2, p3, p4 ) {
  console.assert( p1.length == p2.length );
  console.assert( p1.length == p3.length );
  console.assert( p1.length == p4.length );

  return [p1, p2, p3, p3, p4, p1].reduce( (a, b) => a.concat(b) );
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

  resolve_collision( pos, vel, size ) {
    const resolver = new CollisionResolver(this, pos, vel, size);
    return resolver.resolve( );
  }
}

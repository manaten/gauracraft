import { Block } from './blocks.js';

export class Chunk {
  static get width() { return 16; }
  static get height() { return 16; }
  static get depth() { return 16; }
  static get block_count() { return Chunk.width * Chunk.height * Chunk.depth; }

  get width() { return Chunk.width; }
  get height() { return Chunk.height; }
  get depth() { return Chunk.depth; }
  get block_count() { return Chunk.block_count; }

  constructor( cx, cy, cz ) {
    this.cx = cx;
    this.cy = cy;
    this.cz = cz;

    this.blocks = new Array( Chunk.block_count );
    for( let i = 0; i < Chunk.block_count; ++i ) {
      this.blocks[ i ] = Block.Air;
    }
  }

  create_flatmap() {
    for( let z = 0; z < Chunk.depth; ++z ) {
      for( let x = 0; x < Chunk.width; ++x ) {
        this.set_block( x, 0, z, Block.Dirt );
      }
    }
  }

  calc_index( x, y, z ) {
    return z*(Chunk.height*Chunk.width) + y*(Chunk.width) + x;
  }

  get_block( x, y, z ) {
    const block = this.blocks[ this.calc_index(x, y, z) ];
    if( block ) return block;
    else return Block.Air;
  }

  set_block( x, y, z, block ) {
    this.blocks[ this.calc_index( x, y, z ) ] = block;
  }
}

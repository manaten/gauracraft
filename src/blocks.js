// 空気 = 何もない部分
class AirBlock {
  static get code() { return ' '; }
  get id() { return 0; }
  get code() { return AirBlock.code; }
  get render() { return false; }
  get transparent() { return true; }
}

// 土ブロック
class DirtBlock {
  static get code() { return 'd'; }
  get id() { return 1; }
  get code() { return DirtBlock.code; }
  get render() { return true; }
  get transparent() { return false; }
}

// ガラスブロック
class GlassBlock {
  static get code() { return 'g'; }
  get id() { return 2; }
  get code() { return GlassBlock.code; }
  get render() { return true; }
  get transparent() { return true; }
}

export const Block = {
  Air: new AirBlock(),
  Dirt: new DirtBlock(),
  Glass: new GlassBlock()
};

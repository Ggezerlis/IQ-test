export type Difficulty = 1 | 2 | 3 | 4 | 5
export type ItemType = 'matrix' | 'series' | 'spatial' | 'weights'

/**
 * A single cell figure in a matrix item. Every visual attribute lives here;
 * rules in the generator act on exactly one attribute each, which is what
 * lets distractors "break exactly one rule".
 */
export interface Figure {
  shape: ShapeId
  /** Number of glyph copies drawn in the cell, 1..5. */
  count: number
  /** Glyph size step: 1 small, 2 medium, 3 large. */
  size: 1 | 2 | 3
  /**
   * Fill is a (pattern, color) pair — never color alone — so items stay
   * colorblind-safe.
   */
  fill: FillId
  /** Rotation in degrees. Rendering + comparison treat it modulo the shape's symmetry. */
  rotation: number
  /** Bitmask over the 4 corner-dot positions, used by AND/OR/XOR/add/sub rules. */
  overlay: number
  /** Top-center marker used by the distribution-of-two rule. */
  decoration: DecorationId | null
}

/** 'diamond' deliberately excluded: it is a rotated square, which would break rotation comparisons. */
export type ShapeId = 'circle' | 'square' | 'triangle' | 'pentagon' | 'star' | 'arrow'
export type FillId = 'outline' | 'solid' | 'hatch' | 'dots' | 'cross'
export type DecorationId = 'ring' | 'bar'

export type SVGSpec =
  | { kind: 'figure'; figure: Figure; describe: string }
  | {
      kind: 'matrix'
      /** 9 cells row-major; index 8 is null — the "?" cell the taker must fill. */
      cells: (Figure | null)[]
      describe: string
    }
  | {
      /** Spatial items: a polyomino-style figure as unit squares on a grid. */
      kind: 'cells'
      cells: [number, number][]
      describe: string
    }
  | {
      /** Weights items: balanced example scales plus the target scale with an unknown right pan. */
      kind: 'scales'
      shapeKinds: ShapeId[]
      /** Per-scale shape counts, indexed like shapeKinds. */
      equations: { left: number[]; right: number[] }[]
      targetLeft: number[]
      describe: string
    }
  | {
      /** Weights answer option: a multiset of shapes shown in a row. */
      kind: 'shapeset'
      shapeKinds: ShapeId[]
      counts: number[]
      describe: string
    }

export interface Item {
  id: string
  type: ItemType
  difficulty: Difficulty
  prompt: SVGSpec | string
  /** Always exactly 6. */
  options: (SVGSpec | string)[]
  correctIndex: number
  /** Machine-readable rule tags, used by the explanation screen. */
  rulesUsed: string[]
}

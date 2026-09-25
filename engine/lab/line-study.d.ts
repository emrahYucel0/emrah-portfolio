export declare const LINE_STATES: number
export interface LineStudy {
  build(): void
  frame(p: number, dt: number): boolean
  impulse(x: number, y: number, vx: number, vy: number): void
  readonly spent: number
  readonly budget: number
  lens(): number[]
  invariant(): boolean
}
export declare function createLineStudy(S: {
  ctx: CanvasRenderingContext2D | null
  paper: HTMLCanvasElement
  W: number
  H: number
  DPR: number
  top: number
  reduced: boolean
}): LineStudy

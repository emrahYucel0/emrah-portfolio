// Types for the transplanted runtime's host-facing entry points only.
// The runtime itself stays JavaScript during M1: parity first, types later (see docs/M1-REPORT.md).
import type { C2MountOptions } from './types'

export declare function configure(options: C2MountOptions): void
export declare function routeChanged(): void
export declare function mountC2(): Promise<void>

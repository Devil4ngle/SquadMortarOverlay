import { SVGBuffer } from './common/svgBuffer'
import { S5_ACCELERATION, S5_ACCELERATION_TIME, UB32_DEVIATION, UB32_VELOCITY } from './world/constants'
import { FiringSolutionTable } from './world/rocketTables'

export const $tooltip = document.getElementById('dbg')
export const $map_name = document.getElementById('map-name')
export const $canvas = document.getElementById('canvas') as HTMLCanvasElement
export const $contourmap_canvas = document.getElementById('contourmap_canvas') as HTMLCanvasElement

export const $s5canvas = document.getElementById('s5canvas') as HTMLCanvasElement
export const $s5image = document.getElementById('s5image') as HTMLImageElement
export const $bm21canvas = document.getElementById('bm21canvas') as HTMLCanvasElement
export const $bm21image = document.getElementById('bm21image') as HTMLImageElement

export const $s5map = new FiringSolutionTable('s5_low.png', $s5image, $s5canvas, UB32_DEVIATION, UB32_VELOCITY, S5_ACCELERATION, S5_ACCELERATION_TIME)
// export const $bm21map = new FiringSolutionTable("bm21_low.png", $bm21image, $bm21canvas, BM21_DEVIATION, BM21_VELOCITY, BM21_ACCELERATION, BM21_ACCELERATION_TIME, 1200);
export const $contourmap = new SVGBuffer('', $contourmap_canvas)
export const $websocketRef: { ws: WebSocket | null } = { ws: null }

import { type vec3 } from 'gl-matrix'
import { getZoom } from '../camera/camera'
import { ZOOM_LEVEL_2, ZOOM_LEVEL_3 } from '../camera/constants'
import { type Camera } from '../camera/types'
import { type Minimap } from '../minimap/types'
import { applyTransform, newTranslation, standardFormatKeypad, world2keypad, world2keypadStrings } from '../world/transformations'
import { canvasScaleTransform, outlineText } from './canvas'
import { TEXT_BLACK } from './constants'

export const drawKeypadIndicator: (ctx: CanvasRenderingContext2D, minimap: Minimap, location: vec3, fillColor: string, camera: Camera) => void =
(ctx, minimap, location, fillColor, camera) => {
  if (location === null) {
    return
  }
  const keypad: number[] = world2keypad(minimap, location)
  // console.log("keypad", keypad)
  if (keypad[0] !== -1 && keypad[1] !== -1) {
    const outerX = keypad[0] * 30000
    const outerY = keypad[1] * 30000
    ctx.save()
    applyTransform(ctx, minimap.transform)
    // square
    ctx.beginPath()
    ctx.lineTo(outerX + 30000, outerY)
    ctx.lineTo(outerX + 30000, outerY + 30000)
    ctx.lineTo(outerX, outerY + 30000)
    ctx.lineTo(outerX, outerY)
    ctx.closePath()

    ctx.lineWidth = 3
    ctx.strokeStyle = fillColor
    ctx.resetTransform()
    ctx.stroke()
    ctx.restore()
    //
    ctx.save()
    applyTransform(ctx, minimap.transform)
    applyTransform(ctx, newTranslation(outerX, outerY, 0))
    applyTransform(ctx, canvasScaleTransform(camera))
    outlineText(ctx, `${String.fromCharCode(65 + keypad[0])}${1 + keypad[1]}`, 'bottom', fillColor, TEXT_BLACK, 24, true)
    ctx.restore()

    const zoom = getZoom(camera)
    const coord2index = (x: number, y: number) => 7 + x - 3 * y
    const hideHovered = false // tentative
    // large keypad
    if (zoom > ZOOM_LEVEL_2) {
      for (let i = 0; i <= 2; i++) {
        for (let j = 0; j <= 2; j++) {
          if (coord2index(i, j) !== keypad[2] && (hideHovered || zoom > ZOOM_LEVEL_2)) {
            ctx.save()
            applyTransform(ctx, minimap.transform)
            applyTransform(ctx, newTranslation(outerX + 5000 + i * 10000, outerY + 5000 + j * 10000, 0))
            applyTransform(ctx, canvasScaleTransform(camera))
            applyTransform(ctx, newTranslation(-5, 2, 0))
            outlineText(ctx, `${coord2index(i, j)}`, 'middle', fillColor, TEXT_BLACK, 22, true)
            ctx.restore()
          } else if (zoom > ZOOM_LEVEL_3) {
            // small keypad
            for (let i2 = 0; i2 <= 2; i2++) {
              for (let j2 = 0; j2 <= 2; j2++) {
                if (coord2index(i2, j2) !== keypad[3]) {
                  ctx.save()
                  applyTransform(ctx, minimap.transform)
                  applyTransform(ctx, newTranslation(outerX + i * 10000, outerY + j * 10000, 0))
                  applyTransform(ctx, newTranslation(10000 / 6 + i2 * 10000 / 3, 10000 / 6 + j2 * 10000 / 3, 0))
                  applyTransform(ctx, canvasScaleTransform(camera))
                  applyTransform(ctx, newTranslation(-3, 1, 0))
                  outlineText(ctx, `${coord2index(i2, j2)}`, 'middle', fillColor, TEXT_BLACK, 16, true)
                  ctx.restore()
                }
              }
            }
          }
        }
      }
    }
  }
}

export const drawKeypadLabel = (ctx: CanvasRenderingContext2D, minimap: Minimap, location: vec3, fillColor: string, camera: Camera, fontSize: number): void => {
  if (location === null) {
    return
  }
  const keypad: string[] = world2keypadStrings(minimap, location)
  ctx.save()
  applyTransform(ctx, newTranslation(location[0], location[1], location[2]))
  applyTransform(ctx, canvasScaleTransform(camera))
  applyTransform(ctx, newTranslation(-1.6 * fontSize, -1 * fontSize, 0))
  outlineText(ctx, standardFormatKeypad(keypad), 'bottom', fillColor, TEXT_BLACK, fontSize, true)
  ctx.restore()
}

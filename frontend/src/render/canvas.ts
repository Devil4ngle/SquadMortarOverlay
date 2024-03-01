import { $canvas, $contourmap } from '../elements'
import { type HasTransform, type Target, type Transform, type Weapon, type World } from '../world/types'
import { type Texture } from './types'
import { type Store0 } from '../store'
import { applyTransform } from '../world/transformations'

import { type Minimap } from '../minimap/types'
import { mat4, vec3 } from 'gl-matrix'
import { type Camera } from '../camera/types'
import { type UIState, type UserSettings } from '../ui/types'

import { type Heightmap } from '../heightmap/types'
import { drawWeapons } from './weapon'
import { drawTargets } from './target'
import { drawKeypadIndicator, drawKeypadLabel } from './common'
import { ZOOM_LEVEL_2, ZOOM_LEVEL_3 } from '../camera/constants'
import { getZoom } from '../camera/camera'
import { TEXT_GREEN, TEXT_RED } from './constants'
import { type Contourmap } from '../contourmap/types'
import { getComponent, getEntitiesByType } from '../world/world'
import { type EntityComponent } from '../world/components/entity'
// import { $contourmap } from "../main";

export const drawLine: (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => void =
  (ctx, x0, y0, x1, y1) => {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }

const drawLineScreenWidth: (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => void =
  (ctx, x0, y0, x1, y1) => {
    ctx.save()
    ctx.beginPath()
    // mild clarity optimization for pixel aligned lines
    ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5)
    ctx.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5)
    ctx.resetTransform()
    ctx.stroke()
    ctx.restore()
  }

export function drawSpreadEllipse (ctx: CanvasRenderingContext2D, weaponToTargetVec: vec3, horizontalRadius: number, closeRadius: number, farRadius: number) {
  const dx = weaponToTargetVec[0]
  const dy = weaponToTargetVec[1]
  const ellRot = Math.atan2(dy, dx) + Math.PI / 2

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, 0, horizontalRadius, farRadius, ellRot, Math.PI, 2 * Math.PI) // Math.PI, 2 * Math.PI is the top side
  ctx.ellipse(0, 0, horizontalRadius, closeRadius, ellRot, 0, Math.PI)
  // ctx.resetTransform();
  ctx.stroke()
  ctx.restore()
}

/*
function drawCircle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.stroke();
}

function drawText(ctx, str, x, y, baseline) {
  //console.log("drawText", str, x, y, baseline)
  ctx.textBaseline = baseline;
  ctx.lineWidth = 4;
  ctx.strokeText(str, x, y);
  ctx.fillText(str, x, y);
}
*/

export const drawTexture = (ctx: CanvasRenderingContext2D, transform: Transform, texture: Texture) => {
  if (texture.image.complete && texture.image.naturalWidth !== 0) {
    ctx.save()
    applyTransform(ctx, texture.transform)
    ctx.drawImage(texture.image, 0, 0)
    ctx.restore()
  }
}
function drawGrid (ctx: CanvasRenderingContext2D, zoom: number, mapSize: vec3) {
  const start_x = 0
  const start_y = 0
  const end_x = mapSize[0]
  const end_y = mapSize[1]

  // @ts-expect-error
  const halfGrid = (start, end, bound1, bound2, drawLine) => {
    for (let i = 1; start_x + i * 10000 / 3 < end; i++) {
      if (i % 9 == 0) {
        ctx.strokeStyle = 'black'
        ctx.lineWidth = zoom > ZOOM_LEVEL_2 ? 2 : 1
        drawLine(ctx, start + i * 10000 / 3, bound1, start + i * 10000 / 3, bound2)
      } else if (zoom > ZOOM_LEVEL_2 && i % 3 == 0) {
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 1
        drawLine(ctx, start + i * 10000 / 3, bound1, start + i * 10000 / 3, bound2)
      } else if (zoom > ZOOM_LEVEL_3) {
        ctx.strokeStyle = '#bbb'
        ctx.lineWidth = 1
        drawLine(ctx, start + i * 10000 / 3, bound1, start + i * 10000 / 3, bound2)
      }
    }
  }
  halfGrid(start_x, end_x, start_y, end_y, drawLineScreenWidth)
  // @ts-expect-error
  const drawLineScreenWidthSwapped = (ctx, y0, x0, y1, x1) => { drawLineScreenWidth(ctx, x0, y0, x1, y1) }
  halfGrid(start_y, end_y, start_x, end_x, drawLineScreenWidthSwapped)
}

const drawBackground: (ctx: CanvasRenderingContext2D) => void =
  ctx => {
    const canvas = ctx.canvas
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

const drawMinimap: (ctx: CanvasRenderingContext2D, minimap: Minimap, zoom: number, settings: UserSettings) => void =
  (ctx, minimap, zoom, settings) => {
    ctx.save()
    applyTransform(ctx, minimap.transform)
    drawTexture(ctx, minimap.transform, minimap.texture)
    if (settings.mapGrid) {
      drawGrid(ctx, zoom, minimap.size)
    }
    ctx.restore()
  }

const drawContourmap: (ctx: CanvasRenderingContext2D, contourmap: Contourmap, settings: UserSettings) => void =
  (ctx, contourmap, settings) => {
    if ($contourmap.is_ready()) {
      ctx.save()
      applyTransform(ctx, contourmap.transform)
      applyTransform(ctx, ($contourmap.transform))
      applyTransform(ctx, contourmap.texture.transform)
      ctx.drawImage($contourmap.get_canvas(), 0, 0)
      ctx.restore()
    }
  }

const drawHeightmap: (ctx: CanvasRenderingContext2D, heightmap: Heightmap, settings: UserSettings) => void =
  (ctx, heightmap, settings) => {
    ctx.save()
    applyTransform(ctx, heightmap.transform)
    drawTexture(ctx, heightmap.transform, heightmap.texture)
    ctx.restore()
  }

export const canvasScaleTransform: (camera: Camera) => Transform =
  camera => {
    // this allows drawing with fixed size on screen, e.g. for icons
    let scale = mat4.getScaling(vec3.create(), camera.transform)
    scale = vec3.inverse(scale, scale)
    return mat4.fromScaling(mat4.create(), scale)
  }
const drawPlacementHelpers = (ctx: CanvasRenderingContext2D, camera: Camera, userSettings: UserSettings, uiState: UIState, world: World, minimap: Minimap) => {
  if (uiState.mouseDown && uiState.dragEntityId !== -1 && uiState.dragEntityId !== null) {
    const entity = getComponent<EntityComponent>(world, uiState.dragEntityId, 'entity')
    if (entity?.entityType === 'Weapon' || entity?.entityType === 'Target') {
      const transformComponent = getComponent<HasTransform>(world, uiState.dragEntityId, 'transform')
      if (transformComponent) {
        const location = mat4.getTranslation(vec3.create(), transformComponent.transform)
        if (entity?.entityType === 'Weapon') {
          if (userSettings.weaponPlacementHelper) {
            drawKeypadIndicator(ctx, minimap, location, TEXT_GREEN, camera)
          }
          if (userSettings.weaponPlacementLabel) {
            drawKeypadLabel(ctx, minimap, location, TEXT_GREEN, camera, userSettings.fontSize)
          }
        } else if (entity?.entityType === 'Target') {
          if (userSettings.targetPlacementHelper) {
            drawKeypadIndicator(ctx, minimap, location, TEXT_RED, camera)
          }
          if (userSettings.targetPlacementLabel) {
            drawKeypadLabel(ctx, minimap, location, TEXT_RED, camera, userSettings.fontSize)
          }
        }
      }
    }
  }
}

export const drawAll = (store: Store0) => {
  const state = store.getState()
  if ($canvas && $canvas.getContext('2d')) {
    // const t0 = performance.now();
    const ctx = setupCanvas($canvas)
    const zoom = getZoom(state.camera)
    const targets = getEntitiesByType<Target>(state.world, 'Target')
    const weapons = getEntitiesByType<Weapon>(state.world, 'Weapon')
    ctx.save()
    drawBackground(ctx)
    applyTransform(ctx, state.camera.transform)
    drawMinimap(ctx, state.minimap, zoom, state.userSettings)
    drawContourmap(ctx, state.contourmap, state.userSettings)
    // drawHeightmap(ctx, state.heightmap, state.userSettings);
    drawWeapons(ctx, state.userSettings, state.camera, weapons)
    drawTargets(ctx, state.camera, state.userSettings, state.heightmap, weapons, targets)
    drawPlacementHelpers(ctx, state.camera, state.userSettings, state.uiState, state.world, state.minimap)
    /*
    if (state.userSettings.weaponPlacementHelper && state.uiState.mouseDown){ //  && state.uiState.dragEntityId.type === "Weapon"
      const activeWeaponTransform = getActiveWeapon(state.world, state.uiState)?.transform;
      if (activeWeaponTransform){
        const activeWeaponLoc = mat4.getTranslation(vec3.create(), activeWeaponTransform);
        drawKeypadIndicator(ctx, state.minimap, activeWeaponLoc, TEXT_GREEN, state.camera);
      }
    }
    if (state.uiState.dragEntityId && state.userSettings.targetPlacementHelper && state.uiState.mouseDown){ //  && state.uiState.dragEntityId.type === "Target"
      const draggedEntity = getEntity<HasTransform>(state.world, state.uiState.dragEntityId)?.transform;
      if (draggedEntity){
        const draggedEntityLoc = mat4.getTranslation(vec3.create(), draggedEntity);
        drawKeypadIndicator(ctx, state.minimap, draggedEntityLoc, TEXT_RED, state.camera);
      }
    }
    */
    ctx.restore()
    // const t1 = performance.now();
    // console.log(`drawAll took ${t1 - t0} ms.`);
  }
}

export const outlineText: (
  ctx: CanvasRenderingContext2D,
  text: string,
  baseline: 'middle' | 'bottom' | 'top',
  fillStyle: string,
  strokeStyle: string,
  fontSize: number,
  bold: boolean
) => void =
  (ctx, text, baseline, fillStyle, strokeStyle, fontSize, bold) => {
    ctx.save()
    ctx.font = `${bold ? 'bold' : ''} ${fontSize}px sans-serif`
    ctx.lineWidth = 3
    ctx.lineJoin = 'miter'
    ctx.miterLimit = 2
    ctx.fillStyle = fillStyle
    ctx.strokeStyle = strokeStyle

    ctx.textBaseline = baseline
    ctx.strokeText(text, 0, 0)
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }
export const text: (ctx: CanvasRenderingContext2D, text: string, baseline: 'middle' | 'bottom' | 'top', fillStyle: string, fontSize: number, bold: boolean) => void =
  (ctx, text, baseline, fillStyle, fontSize, bold) => {
    ctx.save()
    ctx.font = `${bold ? 'bold' : ''} ${fontSize}px sans-serif`
    ctx.lineWidth = 3
    ctx.lineJoin = 'miter'
    ctx.miterLimit = 2
    ctx.fillStyle = fillStyle
    ctx.textBaseline = baseline
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }
export const setOutlineTextStyles: (ctx: CanvasRenderingContext2D) => void =
  ctx => {
    ctx.lineWidth = 3
    ctx.lineJoin = 'miter'
    ctx.miterLimit = 2
    ctx.strokeStyle = 'rgb(255, 255, 255)'
  }

const fromTranslation: (x: number, y: number) => Transform =
  (x, y) => mat4.fromTranslation(mat4.create(), [x, y, 0])

const fromScaling: (xy: number) => Transform =
  (xy) => mat4.fromScaling(mat4.create(), [xy, xy, 1])

function setupCanvas (canvas: HTMLCanvasElement) {
  // Code mostly taken from SO, comments added.
  // Get the device pixel ratio, falling back to 1.
  const dpr = window.devicePixelRatio || 1
  const ctx = canvas.getContext('2d')!

  // Get the size of the canvas in CSS pixels.
  const rect = canvas.getBoundingClientRect()
  // console.log("rect", rect)
  // console.log("canvas setup", canvas.width, canvas.height, canvas.style.width, canvas.style.height)
  // order not important:
  // fix the logical size
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  // scale to keep transformations intact
  ctx.scale(dpr, dpr)
  // enforce display size via style
  canvas.style.width = '100%' // rect.width  + 'px'; original solution breaks on resize
  canvas.style.height = '100%' // rect.height + 'px';
  // console.log("canvas setup 2", canvas.width, canvas.height, canvas.style.width, canvas.style.height)
  return ctx
}

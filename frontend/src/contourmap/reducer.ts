import { type Contourmap } from './types'

import { maps } from '../common/mapData'

import { UserSettingsActionType as USAT } from '../ui/types'
import { mat4, vec3 } from 'gl-matrix'
/*

*/

const defaultContourmap = (): Contourmap => ({
  transform: mat4.create(),
  texture: {
    transform: mat4.create(),
    source: '1x1.jpg',
    size: vec3.fromValues(1, 1, 0),
    image: new Image()
  },
  size: [1, 1, 0]
})

const transition = (state: Contourmap, mapId: keyof (typeof maps)) => {
  const mapData = maps[mapId]
  // const scale = vec3.fromValues(
  //  mapData.landscape.scale_x,
  //  mapData.landscape.scale_y,
  //  mapData.landscape.scale_z,
  // )
  const scale = vec3.fromValues(
    50,
    50,
    0
  )
  // -107899.648438 - 508 * 50, "loc_y": -107900.0 - 1270 * 50,
  const location = vec3.fromValues(
    mapData.landscape.loc_x,
    mapData.landscape.loc_y,
    0
  )
  const textureOffset = vec3.fromValues(
    // @ts-expect-error
    mapData.landscape.slice_x || 0,
    // @ts-expect-error
    mapData.landscape.slice_y || 0,
    0
  )
  const rotZ = ((mapData.landscape as any).rot_z || 0) / 180 * Math.PI
  const baseTransform = mat4.create()
  // placing map anchor in world (coordinates already scaled)
  // mat4.scale(transform, transform, vec3.fromValues(1, 1, 1))
  // mat4.rotateZ(baseTransform, baseTransform, 0)
  mat4.translate(baseTransform, baseTransform, location)

  // rotating map object around anchor
  mat4.rotateZ(baseTransform, baseTransform, rotZ)

  // placing texture on map object
  const textureTransform = mat4.create()
  mat4.scale(textureTransform, textureTransform, scale)// vec3.fromValues(1, 1, 1));
  // mat4.rotate.... // texture itself is not rotated relative to map object
  mat4.translate(textureTransform, textureTransform, textureOffset) // this is necessary for skorpo heightmap

  const texture = { ...state.texture }
  texture.image.onload = () => {
    // state.canvas.width = mapData.landscape.resolution_x;
    // state.canvas.height = mapData.landscape.resolution_y;
    // console.log("drawing hm")
    // const ctx = state.canvas.getContext("2d");
    // ctx?.drawImage(texture.image, 0, 0);

    // $imagedataCache = ctx?.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height) as any;
    // console.log("caching imagedata for SlowFox", $imagedataCache)
  }
  texture.transform = textureTransform
  const newSize = vec3.fromValues(mapData.landscape.resolution_x, mapData.landscape.resolution_y, 0)
  return {
    transform: baseTransform,
    texture,
    size: newSize
    // canvas: state.canvas,
  }
}
export const contourmap = (state: any, action: any) => {
  if (state === undefined) {
    return defaultContourmap()
  }
  if (action.type !== USAT.write || action.payload.key !== 'mapId') {
    return state
  }
  // console.log("minimap change")
  return transition(state, action.payload.value)
}

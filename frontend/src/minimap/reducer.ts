import { type Minimap } from './types'
import { maps } from '../common/mapData'

import { UserSettingsActionType as USAT } from '../ui/types'
import { mat4, vec3 } from 'gl-matrix'
/*

*/

const defaultMinimap = (): Minimap => ({
  transform: mat4.create(),
  texture: {
    transform: mat4.create(),
    source: '1x1.jpg',
    size: vec3.fromValues(1, 1, 0),
    image: new Image()
  },
  size: [1, 1, 0]
})

const transition = (state: Minimap, payload: keyof (typeof maps)) => {
  const mapData = maps[payload]
  const topLeft = vec3.fromValues(
    Math.min(mapData.mapTextureCorner0.loc_x, mapData.mapTextureCorner1.loc_x),
    Math.min(mapData.mapTextureCorner0.loc_y, mapData.mapTextureCorner1.loc_y),
    0
  )
  const bottomRight = vec3.fromValues(
    Math.max(mapData.mapTextureCorner0.loc_x, mapData.mapTextureCorner1.loc_x),
    Math.max(mapData.mapTextureCorner0.loc_y, mapData.mapTextureCorner1.loc_y),
    0
  )
  const sizeDiv = vec3.fromValues(mapData.mapTexture.size_x, mapData.mapTexture.size_y, 1)
  const scale = vec3.clone(bottomRight) // bottomRight.clone().subtract(topLeft).zipWith((a, b) => b === 0 ? 0 : a/b, size)
  vec3.sub(scale, scale, topLeft)
  vec3.div(scale, scale, sizeDiv)
  vec3.scale(scale, scale, 1)
  /* const transform = {
    location: topLeft,
    rotation: vec3.fromValues(0, 0, 0),
    scale: scale,
  } */

  const baseTransform = mat4.create()
  // this is specific to placing the texture,
  // i.e. a shortcut for what could/should be a scene graph with multiple transformation matrices

  // placing map in world (coordinates already scaled)
  // mat4.scale(transform, transform, vec3.fromValues(1, 1, 1))
  mat4.rotate(baseTransform, baseTransform, 0.0, vec3.fromValues(0, 0, 1))
  mat4.translate(baseTransform, baseTransform, topLeft)

  // placing texture on map object
  const textureTransform = mat4.create()
  mat4.scale(textureTransform, textureTransform, scale)// vec3.fromValues(1, 1, 1));
  // mat4.rotate.... // texture itself is not rotated relative to map object
  // mat4.translate // this will be necessary for skorpo heightmap

  const texture = { ...state.texture }
  texture.source = mapData.minimap_image_src
  texture.image.src = mapData.minimap_image_src
  texture.transform = textureTransform

  return {
    transform: baseTransform,
    texture,
    size: vec3.subtract(vec3.create(), bottomRight, topLeft)
  }
}
export const minimap = (state: any, action: any) => {
  if (state === undefined) {
    return defaultMinimap()
  }
  if (action.type !== USAT.write || action.payload.key !== 'mapId') {
    return state
  }
  // console.log("minimap change")
  return transition(state, action.payload.value)
}
// (MMAT.set, newMinimap, transition)

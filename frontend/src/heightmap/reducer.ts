import { mat4, vec3 } from 'gl-matrix'
import { type Heightmap } from './types'
import { UserSettingsActionType as USAT } from '../ui/types'
import { maps } from '../common/mapData'
export let $imagedataCache = null
const defaultHeightmap = (): Heightmap => ({
  transform: mat4.create(),
  texture: {
    transform: mat4.create(),
    source: '1x1.jpg',
    size: vec3.fromValues(1, 1, 0),
    image: new Image()
  },
  canvas: document.getElementById('hmCanvas')! as HTMLCanvasElement,
  size: [1, 1, 0]
})
/*
"landscape": {
        "loc_x": -203206.40625 + 508 * 100, "loc_y": -203200.0 + 508 * 100,
        //"loc_x": -160000.0 * (3049/3200), "loc_y": -160000.0 * (3049/3200),
        "scale_x": 100.0, "scale_y": 100.0, "scale_z": 10.0,
        "resolution_x": 3049, "resolution_y": 3049
      },
  */

const transition = (state: Heightmap, mapId: keyof (typeof maps)) => {
  const mapData = maps[mapId]
  const scale = vec3.fromValues(
    mapData.landscape.scale_x,
    mapData.landscape.scale_y,
    mapData.landscape.scale_z
  )
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
  texture.source = mapData.heightmap_image_src
  texture.image.onload = () => {
    state.canvas.width = mapData.landscape.resolution_x
    state.canvas.height = mapData.landscape.resolution_y
    console.log('drawing hm: ', mapData.heightmap_image_src)
    const ctx = state.canvas.getContext('2d')
    ctx?.drawImage(texture.image, 0, 0)

    $imagedataCache = ctx?.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height) as any
    // console.log("caching imagedata for SlowFox", $imagedataCache)
  }
  texture.image.src = mapData.heightmap_image_src
  texture.transform = textureTransform
  const newSize = vec3.fromValues(mapData.landscape.resolution_x, mapData.landscape.resolution_y, 0)
  return {
    transform: baseTransform,
    texture,
    size: newSize,
    canvas: state.canvas
  }
}

export const heightmap = (state: any, action: any) => {
  if (state === undefined) {
    return defaultHeightmap()
  }
  if (action.type !== USAT.write || action.payload.key !== 'mapId') {
    return state
  }
  return transition(state, action.payload.value)
}

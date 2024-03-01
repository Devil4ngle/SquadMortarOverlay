import { mat4, vec3 } from 'gl-matrix'
import { type Camera } from './types'

export const getWorldLocation: (camera: Camera) => vec3 =
  camera => {
    const trans = mat4.getTranslation(vec3.create(), camera.transform)
    const scale = mat4.getScaling(vec3.create(), camera.transform)
    vec3.divide(trans, trans, scale)
    vec3.scale(trans, trans, -1)
    return trans
  }

export const moveWorldLocation: (camera: Camera, translation: vec3) => Camera =
  (camera, translation) => {
    const negTranslation = vec3.scale(vec3.create(), translation, -1)
    const newTransform = mat4.clone(camera.transform)
    mat4.translate(newTransform, newTransform, negTranslation)
    return {
      ...camera,
      transform: newTransform
    }
  }
export const moveToWorldLocation: (camera: Camera, translation: vec3) => Camera =
  (camera, location) => {
    const v = getWorldLocation(camera)
    vec3.subtract(v, location, v)
    return moveWorldLocation(camera, v)
  }
export const changeZoom: (camera: Camera, newZoom: number, canvasLoc: vec3) => Camera =
  (camera, newZoom, canvasLoc) => {
    const transform = mat4.clone(camera.transform)
    const scale = mat4.getScaling(vec3.create(), transform)
    const scaleFactor = newZoom / scale[0]

    const inversTransform = mat4.invert(mat4.create(), transform)
    const worldZoomLoc = vec3.transformMat4(vec3.create(), canvasLoc, inversTransform)
    mat4.translate(transform, transform, worldZoomLoc)
    mat4.scale(transform, transform, vec3.fromValues(scaleFactor, scaleFactor, 1))
    vec3.scale(worldZoomLoc, worldZoomLoc, -1)
    mat4.translate(transform, transform, worldZoomLoc)

    return {
      ...camera,
      transform
    }
  }

export const getZoom: (camera: Camera) => number =
  camera => mat4.getScaling(vec3.create(), camera.transform)[0]

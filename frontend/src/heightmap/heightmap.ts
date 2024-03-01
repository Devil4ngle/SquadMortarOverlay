import { mat4, vec3 } from 'gl-matrix'
import { world2heightmap } from '../world/transformations'
import { $imagedataCache } from './reducer'
import { type Heightmap } from './types'

export const getHeight = (heightmap: Heightmap, worldLoc: vec3) => {
  try {
    const heightmapPos = world2heightmap(heightmap, worldLoc).map(Math.floor)
    // console.log("heightmapPos", heightmapPos)
    const dataIndex = (heightmapPos[1] * heightmap.size[0] + heightmapPos[0]) * 4
    if ($imagedataCache) {
      const dataHigh = ($imagedataCache as any).data[dataIndex]
      const dataLow = ($imagedataCache as any).data[dataIndex + 1]
      const data = ((dataHigh << 8) + dataLow)
      const scale_z = mat4.getScaling(vec3.create(), heightmap.texture.transform)[2] / 100
      const magic_number = 0.7808988764 // discrepancy between in-editor heights and exported heightmaps...
      return scale_z * data * magic_number
    }
    // imgdata?.data[dataIndex] || -1;
    return 0
  } catch (error) {
    return 0
  }
}

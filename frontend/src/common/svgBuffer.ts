import { mat4, vec3 } from 'gl-matrix'
import { type HasTransform } from '../world/types'
export class SVGBuffer implements HasTransform {
  /*
  Drawing large vector graphics on every update is too slow.
  Instead we're drawing onto a hidden canvas at the desired resolution and
  copying slices onto main canvas to keep panning fast
  */
  canvas: any
  image: any
  context: any
  ready: boolean
  resolution_scale: number
  transform: mat4
  constructor (image_source: string, canvas: HTMLCanvasElement) {
    this.ready = false
    this.image = new Image()
    this.image.onload = () => { this.onload() }
    this.image.src = image_source
    this.canvas = canvas // not available in firefox: new OffscreenCanvas(0, 0);
    this.resolution_scale = 1
    this.transform = mat4.scale(mat4.create(), mat4.create(), vec3.fromValues(1 / this.resolution_scale, 1 / this.resolution_scale, 1 / this.resolution_scale))
    this.context = this.canvas.getContext('2d')
  }

  is_ready () {
    return this.ready
  }

  onload () {
    this.draw()
    this.ready = true
    // this.store.dispatch({"type": "noop"});
  }

  draw () {
    this.canvas.width = this.image.width * this.resolution_scale
    this.canvas.height = this.image.height * this.resolution_scale
    this.context.drawImage(this.image, 0, 0, this.image.width * this.resolution_scale, this.image.height * this.resolution_scale)
  }

  set_image_source (image_source: string) {
    // TODO: accept action callback to trigger redraw via redux state listener
    this.ready = false
    this.image.src = image_source
  }

  get_canvas () {
    return this.canvas
  }

  set_zoom (zoom: number) {
    // necessity TBD

    // console.log("old res", this.resolution_scale)
    // this.resolution_scale = zoom * 50;
    // console.log("new res", this.resolution_scale)
    // this.transform = mat4.scale(mat4.create(), mat4.create(), vec3.fromValues(1/this.resolution_scale, 1/this.resolution_scale, 1/this.resolution_scale));
    // this.draw()
  }
}

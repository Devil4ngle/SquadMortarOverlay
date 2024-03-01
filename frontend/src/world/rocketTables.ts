export class FiringSolutionTable {
  canvas: any
  image: any
  context: any
  ready: boolean
  scale_y: number
  scale_x: number
  scale_time: number
  scale_angle: number
  angle_offset: number
  image_y_offset: number
  deviation: number
  velocity: number
  acceleration: number
  acceleration_time: number
  constructor (
    image_src: string, image: any, canvas: HTMLCanvasElement,
    deviation: number, velocity: number, acceleration: number, acceleration_time: number,
    image_y_offset?: number
  ) {
    this.ready = false
    this.image = image
    this.image.onload = () => { this.onload() }
    this.image.src = image_src
    this.canvas = canvas
    this.scale_y = 300
    this.scale_x = 100
    this.scale_time = 20 / 255
    this.scale_angle = Math.PI / (256 * 256 - 1)
    this.angle_offset = Math.PI / 2

    this.image_y_offset = image_y_offset || 127

    this.deviation = deviation
    this.velocity = velocity
    this.acceleration = acceleration
    this.acceleration_time = acceleration_time
  }

  is_ready () {
    return this.ready
  }

  onload () {
    this.canvas.width = this.image.width
    this.canvas.height = this.image.height

    this.canvas.getContext('2d').drawImage(this.image, 0, 0)
    console.log('s5table ready', this.image.width, this.image.height)
    this.context = this.canvas.getContext('2d')
    this.ready = true
  }

  checkImageCoordinates (image_x: number, image_y: number) {
    return (image_x >= 0 && image_x <= this.canvas.width && image_y >= 0 && image_y <= this.canvas.height)
  }

  pixel2rad (p: any) {
    return this.values2rad(p[0], p[1])
  }

  values2rad (p0: any, p1: any) {
    return (p0 * 256 + p1) * this.scale_angle - this.angle_offset
  }

  value2time (p2: any) {
    return p2 * this.scale_time
  }

  getAngles (startHeightOffset: number) {
    const image_y = Math.floor(-startHeightOffset / this.scale_y) + this.image_y_offset
    if (this.checkImageCoordinates(0, image_y)) {
      const imageData = this.context.getImageData(0, image_y, this.image.width, 1).data
      const angles = []
      let i
      for (i = 0; i < Math.floor(imageData.length / 4); i++) {
        const index = i * 4
        angles.push(this.values2rad(imageData[index], imageData[index + 1]))
      }
      return angles
    }
    return []
  }

  getTimes (startHeightOffset: number) {
    const image_y = Math.floor(-startHeightOffset / this.scale_y) + this.image_y_offset
    if (this.checkImageCoordinates(0, image_y)) {
      const imageData = this.context.getImageData(0, image_y, this.image.width, 1).data
      const times = []
      let i
      for (i = 0; i < Math.floor(imageData.length / 4); i++) {
        const index = i * 4
        times.push(this.value2time(imageData[index] + 2))
      }
      return times
    }
    return NaN
  }

  getAngle (dist: number, startHeightOffset: number) {
    const image_x = Math.floor(dist / this.scale_x)
    const image_y = Math.floor(-startHeightOffset / this.scale_y) + this.image_y_offset
    if (this.checkImageCoordinates(image_x, image_y)) {
      const pixel = this.context.getImageData(image_x, image_y, 1, 1).data
      return this.pixel2rad(pixel)
    }
    return NaN
  }

  getTime (dist: number, startHeightOffset: number) {
    const image_x = Math.floor(dist / this.scale_x)
    const image_y = Math.floor(-startHeightOffset / this.scale_y) + this.image_y_offset
    if (this.checkImageCoordinates(image_x, image_y)) {
      const image_time = this.context.getImageData(image_x, image_y, 1, 1).data[2]
      return this.value2time(image_time)
    }
    return NaN
  }

  calcSpreadHorizontal (dist: number, startHeightOffset: number) {
    const flightTime = this.getTime(dist, startHeightOffset)
    const horizontalSpeed =
      Math.sin(this.deviation) *
      (this.velocity + 0.5 * Math.min(this.acceleration_time, (flightTime as any)) * (-this.acceleration))
    return horizontalSpeed * (flightTime as any)
  }

  calcSpreadVertical (dist: number, startHeightOffset: number) {
    const centerAngle = this.getAngle(dist, startHeightOffset)
    const angles = this.getAngles(startHeightOffset)
    if (centerAngle && angles) {
      const close = this.linearDistSearch(angles, centerAngle - this.deviation)
      const far = this.linearDistSearch(angles, centerAngle + this.deviation)
      return [Math.max(dist - close, 0), Math.max(far - dist, 0)]
    }
    return [NaN, NaN]
  }

  angle2groundDistance (angle: number, startHeightOffset: number, epsilon: number) {
    const image_y = Math.floor(-startHeightOffset / this.scale_y) + this.image_y_offset
    if (this.checkImageCoordinates(this.image.width - 1, startHeightOffset)) {
      const imageData = this.context.getImageData(0, image_y, this.image.width, 1).data
      const index = this.searchAngleIndex(imageData, angle, epsilon)
      return index === -1 ? 0 : index * this.scale_x
    }
    return 0
  }

  linearDistSearch (arr: any[], angle: number) {
    let closestIndex = 0
    let closestAngle = arr[0]

    let currentIndex
    for (currentIndex = 0; currentIndex < arr.length; currentIndex++) {
      const currentAngle = arr[currentIndex]
      if (Math.abs(closestAngle - angle) > Math.abs(currentAngle - closestAngle)) {
        closestAngle = currentAngle
        closestIndex = currentIndex
      }
    }
    return closestIndex * this.scale_x
  }

  searchAngleIndex (arr: any[], angle: number, epsilon: number) {
    let start = 0; let end = arr.length / 4 - 1
    while (start <= end) {
      const mid = Math.floor((start + end) / 2)
      const currentValue = this.values2rad(arr[mid * 4], arr[mid * 4 + 1])
      if (Math.abs(currentValue - angle) < epsilon) {
        return mid
      } else if (currentValue <= angle) { start = mid + 1 } else { end = mid - 1 }
    }
    return -1
  }

  searchClosestAngleIndex (arr: any[], angle: number, epsilon: number) {
    let start = 0; let end = arr.length / 4 - 1
    let currentBestAngle = 0
    let result = -1
    while (start <= end) {
      const mid = Math.floor((start + end) / 2)
      const currentAngle = this.values2rad(arr[mid * 4], arr[mid * 4 + 1])
      if (Math.abs(currentAngle - angle) < epsilon) {
        if (result == -1 && Math.abs(currentAngle - angle) < Math.abs(currentBestAngle - angle)) {
          currentBestAngle = currentAngle
          result = arr[currentAngle]
        }
      } else if (currentAngle <= angle) { start = mid + 1 } else { end = mid - 1 }
    }
    return result
  }
}

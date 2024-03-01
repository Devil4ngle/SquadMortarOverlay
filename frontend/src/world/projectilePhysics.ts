import { vec3 } from 'gl-matrix'
import { $s5map } from '../elements'
import { type FiringSolutionTable } from './rocketTables'
import { BM21_DEVIATION, BM21_GRAVITY, BM21_VELOCITY, GRAVITY, HELL_CANNON_DEVIATION, HELL_CANNON_VELOCITY, MORTAR_DEVIATION, MORTAR_VELOCITY, US_MIL } from './constants'

export function calcAngleHigh (x: number, startHeightOffset: number, v: number, g: number) {
  // https://en.wikipedia.org/wiki/Projectile_motion
  // -> Angle {\displaystyle \theta } \theta required to hit coordinate (x,y)
  const y = -startHeightOffset
  const d = Math.sqrt(v ** 4 - g * (g * x ** 2 + 2 * y * v ** 2))
  const rad = Math.atan((v ** 2 + d) / (g * x))
  return rad
}

function calcAngleLow (x: number, startHeightOffset: number, v: number, g: number) {
  // https://en.wikipedia.org/wiki/Projectile_motion
  // -> Angle {\displaystyle \theta } \theta required to hit coordinate (x,y)
  const y = -startHeightOffset
  const d = Math.sqrt(v ** 4 - g * (g * x ** 2 + 2 * y * v ** 2))
  const rad = Math.atan((v ** 2 - d) / (g * x))
  return rad
}

export function solveProjectileFlightHighArc (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, velocity: number, gravity: number): [number, number, number] {
  // console.log("calc log", x0, x0, z0, x1, y1, z1, velocity)
  const dx = x1 - x0
  const dy = y1 - y0
  const dist2d = Math.round(Math.hypot(dx, dy))
  const dir = Math.round((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360 * 100) / 100
  const angle = calcAngleHigh(dist2d, z0 - z1, velocity, gravity)
  return [angle, dir, dist2d]
}

export function solveProjectileFlightLowArc (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, velocity: number, gravity: number): [number, number, number] {
  // console.log("calc log", x0, x0, z0, x1, y1, z1, velocity)
  const dx = x1 - x0
  const dy = y1 - y0
  const dist2d = Math.round(Math.hypot(dx, dy))
  const dir = Math.round((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360 * 100) / 100
  const angle = calcAngleLow(dist2d, z0 - z1, velocity, gravity)
  return [angle, dir, dist2d]
}

export function distDir (vec1: vec3, vec2: vec3) {
  const dx = vec2[0] - vec1[0]
  const dy = vec2[1] - vec1[1]
  const dist2d = Math.round(Math.hypot(dx, dy))
  const dir = Math.round((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360 * 100) / 100
  return [dist2d, dir]
}

export function angle2groundDistance (angle: number, startHeightOffset: number, velocity: number, gravity: number): number {
  // distance over ground - for map drawing purposes
  const d = Math.sqrt(velocity ** 2 * Math.sin(angle) ** 2 + 2 * gravity * startHeightOffset)
  if (isNaN(d)) { // cannot reach this height
    return 0
  } else {
    return velocity * Math.cos(angle) * (velocity * Math.sin(angle) + d) / gravity
  }
}

// export function angle2groundDistance(angle: number, startHeightOffset: number, velocity: number, gravity: number): number {
//  // distance over ground - for map drawing purposes
//  const d = Math.sqrt(velocity ** 2 * Math.sin(angle) ** 2 + 2 * gravity * startHeightOffset);
//  if (isNaN(d)){ // cannot reach this height
//    return 0;
//  } else {
//    return velocity * Math.cos(angle) * (velocity * Math.sin(angle) + d)/gravity;
//  }
// }
export function flightTime (angle: number, startHeightOffset: number, velocity: number, gravity: number): number {
  // Math.atan((v ** 2 + d) / (g * x));
  const heightComponent =
    Math.sqrt(
      (velocity * Math.sin(angle)) ** 2 +
      2 * gravity * startHeightOffset
    )
  return (velocity * Math.sin(angle) + heightComponent) / gravity
}

export function calcSpreadHigh (dist: number, startHeightOffset: number, velocity: number, gravity: number, deviation: number): [number, number, number] {
  const centerAngle = calcAngleHigh(dist, startHeightOffset, velocity, gravity)
  const close = angle2groundDistance(centerAngle + deviation, startHeightOffset, velocity, gravity)
  const far = angle2groundDistance(centerAngle - deviation, startHeightOffset, velocity, gravity)
  // i'm too lazy for the true horizontal component so i'll approximate it via
  // time of (accurate) flight and max horizontal deviation speed - should be close enough for small deviation angles.
  // ^ essentially linear approximation of angle change
  const horizontalSpeed = Math.sin(deviation) * velocity
  return [horizontalSpeed * flightTime(centerAngle, startHeightOffset, velocity, gravity), Math.max(0, dist - close), Math.max(0, far - dist)]
}

export function calcSpreadLow (dist: number, startHeightOffset: number, velocity: number, gravity: number, deviation: number): [number, number, number] {
  const centerAngle = calcAngleLow(dist, startHeightOffset, velocity, gravity)
  const close = angle2groundDistance(centerAngle - deviation, startHeightOffset, velocity, gravity)
  const far = angle2groundDistance(centerAngle + deviation, startHeightOffset, velocity, gravity)
  // i'm too lazy for the true horizontal component so i'll approximate it via
  // time of (accurate) flight and max horizontal deviation speed - should be close enough for small deviation angles.
  // ^ essentially linear approximation of angle change
  const horizontalSpeed = Math.sin(deviation) * velocity
  return [horizontalSpeed * flightTime(centerAngle, startHeightOffset, velocity, gravity), Math.max(0, dist - close), Math.max(0, far - dist)]
}

export interface FiringSolution {
  weaponTranslation: vec3
  targetTranslation: vec3
  weaponToTargetVec: vec3
  angle: number
  dir: number
  dist: number
  startHeightOffset: number
  time: number
  horizontalSpread: number
  closeSpread: number
  farSpread: number
}

export const getUsMil = (angle: number): number => angle * US_MIL
export const getDist = (start: vec3, end: vec3): number => Math.hypot(end[0] - start[0], end[1] - start[1])
export const getStartHeightOffset = (start: vec3, end: vec3): number => end[2] - start[2]

export interface FiringSolutionPair {
  lowArc: FiringSolution
  highArc: FiringSolution
}

interface Solver {
  pathSolver: Function
  spreadSolver: Function
}

const lowArcSolver: Solver = Object.freeze({
  pathSolver: solveProjectileFlightLowArc,
  spreadSolver: calcSpreadLow
})

const highArcSolver: Solver = Object.freeze({
  pathSolver: solveProjectileFlightHighArc,
  spreadSolver: calcSpreadHigh
})

const getProjectileSolution = (weaponTranslation: vec3, targetTranslation: vec3, velocity: number, gravity: number, deviation: number, solver: Solver): FiringSolution => {
  const startHeightOffset = weaponTranslation[2] - targetTranslation[2]
  const weaponToTargetVec = vec3.subtract(vec3.create(), targetTranslation, weaponTranslation)
  const [angle, dir, dist] = solver.pathSolver(
    weaponTranslation[0], weaponTranslation[1], weaponTranslation[2],
    targetTranslation[0], targetTranslation[1], targetTranslation[2],
    velocity,
    gravity
  )
  const [horizontalSpread, closeSpread, farSpread] = solver.spreadSolver(dist, startHeightOffset, velocity, gravity, deviation)
  const time = flightTime(angle, startHeightOffset, velocity, gravity)
  return Object.freeze({
    weaponTranslation,
    targetTranslation,
    weaponToTargetVec,
    angle,
    dir,
    dist,
    startHeightOffset,
    time,
    horizontalSpread,
    closeSpread,
    farSpread
  })
}

const getProjectileSolutionPair = (weaponTranslation: vec3, targetTranslation: vec3, velocity: number, gravity: number, deviation: number): FiringSolutionPair => {
  return Object.freeze({
    lowArc: getProjectileSolution(weaponTranslation, targetTranslation, velocity, gravity, deviation, lowArcSolver),
    highArc: getProjectileSolution(weaponTranslation, targetTranslation, velocity, gravity, deviation, highArcSolver)
  })
}

export const getMortarFiringSolution = (weaponTranslation: vec3, targetTranslation: vec3): FiringSolutionPair =>
  getProjectileSolutionPair(weaponTranslation, targetTranslation, MORTAR_VELOCITY, GRAVITY, MORTAR_DEVIATION)

export const getHellCannonFiringSolution = (weaponTranslation: vec3, targetTranslation: vec3): FiringSolutionPair =>
  getProjectileSolutionPair(weaponTranslation, targetTranslation, HELL_CANNON_VELOCITY, GRAVITY, HELL_CANNON_DEVIATION)

export const getBM21FiringSolution = (weaponTranslation: vec3, targetTranslation: vec3): FiringSolutionPair =>
  getProjectileSolutionPair(weaponTranslation, targetTranslation, BM21_VELOCITY, BM21_GRAVITY, BM21_DEVIATION)

const getTableFiringSolution = (table: FiringSolutionTable, weaponTranslation: vec3, targetTranslation: vec3): FiringSolution => {
  const startHeightOffset = weaponTranslation[2] - targetTranslation[2]
  const [dist, dir] = distDir(weaponTranslation, targetTranslation)
  const weaponToTargetVec = vec3.subtract(vec3.create(), weaponTranslation, targetTranslation)
  const angle = table.getAngle(dist, startHeightOffset)
  const time = table.getTime(dist, startHeightOffset)
  const mil = angle * US_MIL
  const milCapped = mil < 800 ? 0 : mil
  const milRounded = Math.floor(milCapped * 10) / 10
  const horizontalSpread = table.calcSpreadHorizontal(dist, startHeightOffset)
  const spread = table.calcSpreadVertical(dist, startHeightOffset) // "temp" hack...
  let closeSpread = spread[0]
  const farSpread = spread[1]
  closeSpread = closeSpread != 0 ? closeSpread : dist
  return Object.freeze({
    weaponTranslation,
    targetTranslation,
    weaponToTargetVec,
    startHeightOffset,
    angle,
    angleLow: 0,
    dir,
    dist,
    time,
    timeLow: 0,
    mil,
    milCapped,
    milRounded,
    horizontalSpread,
    closeSpread,
    farSpread
  })
}
export const getS5FiringSolution = (weaponTranslation: vec3, targetTranslation: vec3): FiringSolution => getTableFiringSolution($s5map, weaponTranslation, targetTranslation)
// rip this work....
// export const getBM21FiringSolution = (weaponTranslation: vec3, targetTranslation: vec3): FiringSolution => getTableFiringSolution($bm21map, weaponTranslation, targetTranslation)

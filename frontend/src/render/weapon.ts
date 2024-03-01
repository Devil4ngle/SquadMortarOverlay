import { type Camera } from '../camera/types'
import { applyTransform, newTranslation } from '../world/transformations'
import { canvasScaleTransform, outlineText } from './canvas'
import { HELL_CANNON_MAX_RANGE, MORTAR_MAX_RANGE, MORTAR_MIN_RANGE } from '../world/constants'
import { mat4, vec3 } from 'gl-matrix'
import { type Weapon } from '../world/types'
import { TEXT_BLACK, TEXT_GREEN } from './constants'
import { type UserSettings } from '../ui/types'
import { canonicalEntitySort } from '../world/world'
import { type WeaponType } from '../world/components/weapon'

const drawMaxRangeCircle = (ctx: CanvasRenderingContext2D, weaponType: WeaponType, scale: number): void => {
  ctx.beginPath()
  ctx.lineWidth = 1 * scale
  ctx.strokeStyle = '#0f0'
  if (weaponType == 'hellCannon') {
    ctx.arc(0, 0, HELL_CANNON_MAX_RANGE, 0, 2 * Math.PI)
  } else if (weaponType == 'standardMortar' || weaponType == 'technicalMortar') {
    ctx.arc(0, 0, MORTAR_MAX_RANGE, 0, 2 * Math.PI)
  }
  ctx.stroke()
}

export const drawWeapons = (ctx: CanvasRenderingContext2D, userSettings: UserSettings, camera: Camera, weapons: Weapon[]): void => {
  const activeWeapons = weapons.filter((w: Weapon) => w.isActive)
  canonicalEntitySort(weapons)
  const drawWeapon = (ctx: any, weapon: Weapon, weaponIndex: number) => {
    ctx.save()
    const canvasTransform = canvasScaleTransform(camera)
    const scale = mat4.getScaling(vec3.create(), canvasTransform)[0]
    applyTransform(ctx, weapon.transform)
    if (weapon.isActive) {
      ctx.beginPath()
      ctx.lineWidth = 1 * scale
      ctx.strokeStyle = '#0f0'
      ctx.arc(0, 0, MORTAR_MIN_RANGE, 0, 2 * Math.PI)
      ctx.stroke()
      drawMaxRangeCircle(ctx, userSettings.weaponType, scale)
      if (activeWeapons.length > 1) {
        ctx.save()
        applyTransform(ctx, canvasScaleTransform(camera))
        applyTransform(ctx, newTranslation(10, 0.5, 0))
        outlineText(ctx, (weaponIndex + 1).toString(), 'middle', TEXT_GREEN, TEXT_BLACK, userSettings.fontSize, true)
        ctx.restore()
      }
    }

    applyTransform(ctx, canvasTransform)
    ctx.beginPath()
    ctx.lineWidth = 3
    ctx.strokeStyle = 'black'
    ctx.arc(0, 0, 5, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.lineWidth = 1
    ctx.strokeStyle = weapon.isActive ? '#0f0' : 'grey'
    ctx.arc(0, 0, 5, 0, 2 * Math.PI)
    ctx.stroke()

    ctx.restore()
  }
  weapons.forEach((v: Weapon, index: number) => { drawWeapon(ctx, v, index) })
}

import { newStore } from './store'
import { setupEventsAndInit } from './events'
import * as M from 'gl-matrix'
import { changeMap, settingsToActions } from './ui/actions'
import { drawAll } from './render/canvas'
import * as ReactDOM from 'react-dom'
import { makeLeftPanel, mapOptions } from './ui/leftPanel'
import { loadUserSettings } from './ui/persistence'
import { enableMapSet } from 'immer'
import { addWeapon } from './world/actions'
import { getEntitiesByType } from './world/world'
import { getHeight } from './heightmap/heightmap'
import { US_MIL } from './world/constants'
import { getBM21FiringSolution, getHellCannonFiringSolution, getMortarFiringSolution, getS5FiringSolution } from './world/projectilePhysics'
import { getTranslation } from './world/transformations'
import { type Target, type Weapon } from './world/types'

M.glMatrix.setMatrixArrayType(Array)
enableMapSet()

const store = newStore()
const perfRef = { t0: performance.now() }
const printState = (st: typeof store) => () => {
  const t1 = performance.now()
  // console.log(st.getState())
  console.log(`Update took ${t1 - perfRef.t0} ms.`)
}

// Initializing world state
store.dispatch(addWeapon([0, 0, 0], 'standardMortar'))
settingsToActions(loadUserSettings()).map(store.dispatch)
store.dispatch(changeMap('kokan'))

// Setting up render and controls
setupEventsAndInit(store, perfRef)
// store.subscribe(printState(store))
store.subscribe(() => {
  drawAll(store)
})

const fragment = new DocumentFragment()
mapOptions.forEach((o) => {
  const imageLoc = o[2]
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.as = 'image'
  link.href = imageLoc
  fragment.appendChild(link)
})
document.getElementById('preloadContainer')?.append(fragment)

const $leftPanel = document.getElementById('leftPanel')!

ReactDOM.render(makeLeftPanel(store), $leftPanel)

const socketMap = new WebSocket('ws://127.0.0.1:12345')

socketMap.addEventListener('open', () => {
  console.log('Connection Opened Map')
})

const socketCoordinates = new WebSocket('ws://127.0.0.1:12346')

socketMap.addEventListener('open', () => {
  console.log('Connection Opened Coordinates')
})

socketMap.addEventListener('message', (event) => {
  if (event.data === 'Map') {
    if (socketMap.readyState === WebSocket.OPEN) {
      socketMap.send(store.getState().minimap.texture.source)
    }
  } else if ((event.data).startsWith('merged/')) {
    store.getState().minimap.texture.image.src = event.data
  }
})

let prevCoorArray = ''

function checkCoordinates (): void {
  const stateSync = store.getState()
  const targets = getEntitiesByType<Target>(stateSync.world, 'Target')
  const weapons = getEntitiesByType<Weapon>(stateSync.world, 'Weapon')
  const heightmap = stateSync.heightmap
  let coorArray: string = ''
  targets.forEach((target: Target) => {
    let dataToSave = ''
    const activeWeapons = weapons.filter((w: Weapon) => w.isActive)
    activeWeapons.forEach((weapon: Weapon, activeWeaponIndex: number) => {
      const weaponTranslation = getTranslation(weapon.transform)
      const weaponHeight = getHeight(heightmap, weaponTranslation)
      weaponTranslation[2] = weaponHeight + weapon.heightOverGround
      const targetTranslation = getTranslation(target.transform)
      const targetHeight = getHeight(heightmap, targetTranslation)
      targetTranslation[2] = targetHeight
      if (stateSync.userSettings.weaponType === 'standardMortar' || stateSync.userSettings.weaponType === 'technicalMortar') {
        const solution = getMortarFiringSolution(
          weaponTranslation,
          targetTranslation
        ).highArc
        const angle = solution.dir.toFixed(1)
        const rangeV = solution.angle * US_MIL
        const range = `${rangeV.toFixed(1)}`
        dataToSave = `${range}, ${angle}°`
      } else if (stateSync.userSettings.weaponType === 'ub32') {
        const solution = getS5FiringSolution(weaponTranslation, targetTranslation)
        const angle = solution.dir.toFixed(1)
        const degrees = solution.angle * 180 / Math.PI
        const mil = degrees.toFixed(1)
        dataToSave = `${mil}, ${angle}°`
      } else if (stateSync.userSettings.weaponType === 'hellCannon') {
        const { highArc, lowArc } = getHellCannonFiringSolution(weaponTranslation, targetTranslation)
        const angleValue = highArc.angle / Math.PI * 180
        const angleLowValue = lowArc.angle / Math.PI * 180
        dataToSave = `${angleValue.toFixed(1)}|${angleLowValue.toFixed(1)}, ${highArc.dir.toFixed(1)}°`
      } else if (stateSync.userSettings.weaponType === 'bm21') {
        const { highArc, lowArc } = getBM21FiringSolution(weaponTranslation, targetTranslation)
        const angleValue = highArc.angle / Math.PI * 180
        const angleLowValue = lowArc.angle / Math.PI * 180
        dataToSave = `${angleValue.toFixed(1)} | ${angleLowValue.toFixed(1)}, ${highArc.dir.toFixed(1)}°`
      }

      if (coorArray !== '') {
        coorArray = coorArray + '\n'
      }
      coorArray = coorArray + dataToSave
    })
  })
  if (coorArray !== prevCoorArray) {
    prevCoorArray = coorArray
    socketCoordinates.send(coorArray)
  }
}
setInterval(checkCoordinates, 1000)

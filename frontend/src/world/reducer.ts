// import { EntityActionType, EntityRegistry } from './types';
// import { setEntity, removeEntity, updateEntity } from './world';
import produce from 'immer'
import { type Reducer } from 'redux'
import { type StoreAction } from '../store'
import { componentsReducer, getFilteredEntityIds, insertComponentsBulkMut, maxEntityId, newComponents, removeComponents, removeComponentsMut, setComponentsFromActionMut } from './components/components'
import { type EntityComponent } from './components/entity'
import { type SetAction } from './components/types'
import { EntityActionType, type EntityId, type Target, type Weapon, type World } from './types'
import { getEntitiesByType } from './world'
import { getHeight } from '../heightmap/heightmap'
import { getMortarFiringSolution } from './projectilePhysics'
import { getTranslation } from './transformations'
import { US_MIL } from './constants'
import { loadUserSettings } from '../ui/persistence'

const newWorld = (): World => ({
  nextId: 0,
  components: newComponents()
})

export const world: Reducer<World, StoreAction> = (state, action) => {
  /*
    this reducer intercepts entity actions which require modification of across components,
    passing on the rest to a bundle of component-specific reducers
  */
  if (state === undefined) {
    return newWorld()
  }
  switch (action.type) {
    case EntityActionType.add:
      return produce(state, (proxy: World) => {
        const newId = proxy.nextId
        proxy.nextId = proxy.nextId + 1
        const setAction: SetAction = produce(action, (action: any) => {
          action.type = EntityActionType.set
          action.payload.entityId = newId
        }) as any
        proxy.components = setComponentsFromActionMut(proxy.components, newId, setAction)
      })
    case EntityActionType.set:
      return produce(state, (proxy: World) => {
        proxy.nextId = Math.max(action.payload.entityId + 1, proxy.nextId)
        proxy.components = setComponentsFromActionMut(proxy.components, action.payload.entityId, action)
      })

    case EntityActionType.setAll:
      return produce(state, (proxy: World) => {
        proxy.nextId = maxEntityId(action.payload.components) + 1
        proxy.components = insertComponentsBulkMut(newComponents(), action.payload.components)
      })
    case EntityActionType.remove:
      return produce(state, (proxy: World) => {
        proxy.components = removeComponents(proxy.components, action.payload.entityId)
      })
    // for more cases, should generalize selection via entityId to some (serializable) filter function
    case EntityActionType.removeAllTargets:
      const targetIds = getFilteredEntityIds(state.components, (e: EntityComponent) => e.entityType === 'Target')
      return produce(state, (proxy: World) => {
        targetIds.forEach((v: EntityId) => {
          removeComponentsMut(proxy.components, v)
        })
      })

    case EntityActionType.syncMap:
      return produce(state, (proxy: World) => {
        const state = action.payload.state
        const tryFetchImage = (cacheBuster: any, performanceStart: any) => {
          fetch(`merged/merged_${cacheBuster}.jpg`, {
            method: 'GET',
            mode: 'no-cors'
          })
            .then((response) => {
              if (response.ok) {
                state.minimap.texture.image.src = `merged/merged_${cacheBuster}.jpg`, 5000
                const endTime = performance.now()
                const elapsedTime = endTime - performanceStart
                console.log(`Elapsed time: ${elapsedTime} milliseconds`)
                const userSettings = loadUserSettings()
                const alwaysSyncMapValue = userSettings.alwaysSyncMap
                if (action.payload.isToggle) {
                  if (alwaysSyncMapValue) {
                    const cacheBuster = new Date().getTime()
                    const performanceStart = performance.now()
                    fetch('http://localhost:3000/refreshmap/', {
                      method: 'POST',
                      mode: 'no-cors',
                      headers: {
                        'Content-Type': 'text/plain'
                      },
                      body: state.minimap.texture.source + ';merged_' + cacheBuster + '.jpg' + ';' + (action.payload.active ? 1 : 0)
                    }).then((response) => {
                      tryFetchImage(cacheBuster, performanceStart)
                    })
                  }
                }
              } else {
                state.minimap.texture.image.src = state.minimap.texture.source
              }
            })
        }
        const cacheBuster = new Date().getTime()
        const performanceStart = performance.now()
        document.body.style.cursor = 'default'

        fetch('http://localhost:3000/refreshmap/', {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: action.payload.state.minimap.texture.source + ';merged_' + cacheBuster + '.jpg' + ';' + (action.payload.active ? 1 : 0)
        }).then((response) => {
          document.body.style.cursor = 'default'

          tryFetchImage(cacheBuster, performanceStart)
        })
      })

    case EntityActionType.syncTargets:
      return produce(state, (proxy: World) => {
        const stateSync = action.payload.state
        if (stateSync.userSettings.weaponType === 'standardMortar') {
          const targets = getEntitiesByType<Target>(stateSync.world, 'Target')
          const weapons = getEntitiesByType<Weapon>(stateSync.world, 'Weapon')
          const heightmap = stateSync.heightmap
          let coorArray: string = ''
          targets.forEach((target: Target) => {
            const activeWeapons = weapons.filter((w: Weapon) => w.isActive)
            activeWeapons.forEach((weapon: Weapon, activeWeaponIndex: number) => {
              const weaponTranslation = getTranslation(weapon.transform)
              const weaponHeight = getHeight(heightmap, weaponTranslation)
              weaponTranslation[2] = weaponHeight + weapon.heightOverGround
              const targetTranslation = getTranslation(target.transform)
              const targetHeight = getHeight(heightmap, targetTranslation)
              targetTranslation[2] = targetHeight
              const solution = getMortarFiringSolution(weaponTranslation, targetTranslation).highArc
              const angle = solution.dir.toFixed(1)
              const rangeV = solution.angle * US_MIL
              const range = solution.angle ? `${(rangeV.toFixed(1))}` : '-----'
              const dataToSave = `${range},${angle}`
              if (coorArray !== '') {
                coorArray = coorArray + ';'
              }
              coorArray = coorArray + dataToSave
            })
          })
          fetch('http://localhost:3000/coordinates', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'text/plain'
            },
            body: coorArray
          })
        }
      })
    default:
      return produce(state, (proxy: World) => {
        proxy.components = componentsReducer(proxy.components, action)
      })
  }
}

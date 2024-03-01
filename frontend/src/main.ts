import { newStore } from './store'
import { setupEventsAndInit } from './events'
import * as M from 'gl-matrix'
import { changeMap, settingsToActions } from './ui/actions'
import { drawAll } from './render/canvas'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { makeLeftPanel, mapOptions } from './ui/leftPanel'
import { loadUserSettings } from './ui/persistence'
import { enableMapSet } from 'immer'
import { addWeapon } from './world/actions'

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
store.subscribe(() => { drawAll(store) })

const fragment = new DocumentFragment()
mapOptions.forEach(o => {
  const imageLoc = o[2]
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.as = 'image'
  link.href = imageLoc
  fragment.appendChild(link)
})
document.getElementById('preloadContainer')?.append(fragment)
/*
to be optimized:
- mouse movement triggers rerender
    use middleware to trigger canvas updates similar to replication?
-
*/
const $leftPanel = document.getElementById('leftPanel')!
const h = React.createElement

ReactDOM.render(makeLeftPanel(store), $leftPanel)

const socket = new WebSocket('ws://127.0.0.1:12345')

socket.addEventListener('open', (event) => {
  console.log('Connection opened')
})

// Listen for messages
socket.addEventListener('message', (event) => {
  console.log('Message from server ', event.data)
})

socket.addEventListener('error', (event) => {
  console.log('Message from server ')
})
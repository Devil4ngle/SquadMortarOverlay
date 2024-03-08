import * as React from 'react'
import { Provider, connect } from 'react-redux'
import { changeMap, newUIStateWriteAction as writeUIState, newUserSettingsWriteAction as writeUserSettings } from './actions'
import { toggleButton, unstyledToggleButton } from '../common/toggleButton'
import { Dropdown } from '../common/dropdown'
import { type UIState, type UserSettings } from './types'
import { pickActiveWeapon, removeAllTargets, setWeaponActive, setWeaponHeightOverGround as setWeaponHeightOverGroundMeters } from '../world/actions'
import { type EntityId, type Weapon, type World } from '../world/types'
import { canonicalEntitySort, getEntitiesByType } from '../world/world'
import { type WeaponType } from '../world/components/weapon'
import { type Minimap } from '../minimap/types'
import { standardFormatKeypad, world2keypadStrings } from '../world/transformations'
import { mat4, vec3 } from 'gl-matrix'
import { type StoreState } from '../store'

const h = React.createElement
const div = <P, C>(props: P, children?: C) => h('div', props as any, children)

export const mapOptions = [
  ['albasrah', 'Al Basrah', 'options/albasrah_option.png'],
  ['anvil', 'Anvil', 'options/anvil_option.png'],
  ['belaya', 'Belaya', 'options/belaya_option.png'],
  ['blackcoast', 'Black Coast', 'options/blackcoast_option.png'],
  ['chora', 'Chora', 'options/chora_option.png'],
  ['fallujah', 'Fallujah City', 'options/fallujah_option.png'],
  ['foolsroad', "Fool's Road", 'options/foolsroad_option.png'],
  ['goosebay', 'Goosebay', 'options/goosebay_option.png'],
  ['gorodok', 'Gorodok', 'options/gorodok_option.png'],
  ['harju', 'Harju', 'options/harju_option.png'],
  ['jensensrange', "Jensen's Range", 'options/jensensrange_option.png'],
  ['kamdesh', 'Kamdesh', 'options/kamdesh_option.png'],
  ['kohat', 'Kohat Toi', 'options/kohat_option.png'],
  ['kokan', 'Kokan', 'options/kokan_option.png'],
  ['logar', 'Logar Valley', 'options/logar_option.png'],
  ['lashkar', 'Lashkar Valley', 'options/lashkar_option.png'],
  // ["manic", "Manic-5", "options/manic_option.png"],
  ['manicouagan', 'Manicouagan', 'options/manic_option.png'],
  ['mestia', 'Mestia', 'options/mestia_option.png'],
  ['mutaha', 'Mutaha', 'options/mutaha_option.png'],
  ['narva', 'Narva', 'options/narva_option.png'],
  ['skorpo', 'Skorpo (Town)', 'options/skorpo_option.png'],
  ['skorpoFull', 'Skorpo', 'options/skorpo_option.png'],
  ['sumari', 'Sumari', 'options/sumari_option.png'],
  ['tallil', 'Tallil Outskirts', 'options/tallil_option.png'],
  ['yehorivka', 'Yehorivka', 'options/yehorivka_option.png'],
  ['yehorivka_skirmish_v1', 'Yehorivka (Sk_v1)', 'options/yehorivka_option.png'],
  ['sanxianislands', 'Sanxian Islands', 'options/sanxianislands_option.png']
]
const weaponOptions = [
  ['standardMortar', 'Standard mortar', 'options/mortarRound10.png'],
  ['technicalMortar', 'Technical mortar', 'options/mortarRound10.png'],
  ['ub32', 'UB32/S5 rockets', 'options/s5rocket2.png'],
  ['hellCannon', 'Hell Cannon', 'options/mortarRound10.png'],
  ['bm21', 'BM-21 Grad', 'options/s5rocket2.png']
]

const mapOption: (label: string, imagePath: string) => any =
  (label, imagePath) => div({ className: 'flexRow mapOption' }, [
    div({ className: 'mapOptionImage', style: { backgroundImage: `url(${imagePath})` } }),
    div({ className: 'mapOptionLabel' }, label)
  ])

const weaponOption: (label: string, imagePath: string) => any =
  (label, imagePath) => div({ className: 'flexRow mapOption', key: label }, [
    div({ className: 'weaponOptionImage', style: { backgroundImage: `url(${imagePath})` } }),
    div({ className: 'weaponOptionLabel' }, label)
  ])

const leftPanel: (props: { userSettings: UserSettings } & any) => any =
  props => {
    return h('div', { className: 'leftPanel flexItem' }, [
      props.userSettings.leftPanelCollapsed
        ? div({ className: 'flexColumn', style: { padding: '2px' } }, [
          div({ className: 'flexRow' }, [
            h(Dropdown, {
              className: 'flexItem fill',
              value: props.userSettings.mapId,
              onChange: props.onChangeMap,
              options: mapOptions.map(valueLabel => ({ value: valueLabel[0], elem: mapOption(valueLabel[1], valueLabel[2]) }))
            })
          ]),
          props.userSettings.extraButtonsAlwaysShown
            ? h(React.Fragment, {}, [
              div({ className: 'v2' }, []),
              ...extraButtons(props)
            ])
            : null
        ])
        : div({ style: { padding: '2px' } }, collapsibleleftPanelSettings(props)),

      unstyledToggleButton({
        value: props.userSettings.leftPanelCollapsed,
        onChange: props.setCollapsed,
        label: '',
        className: 'collapseButton',
        style: {}
      })
    ])
  }

const collapsibleleftPanelSettings: (props: { userSettings: UserSettings } & any) => any =
  props => {
    return [
      div({ className: 'flexColumn' }, [
        div({ className: 'flexRow' }, [
          h(Dropdown, {
            className: 'flexItem fill',
            value: props.userSettings.mapId,
            onChange: props.onChangeMap,
            options: mapOptions.map(valueLabel => ({ value: valueLabel[0], elem: mapOption(valueLabel[1], valueLabel[2]) }))
          })
        ]),
        div({ className: 'v2' }, []),
        div({ className: 'flexRow' }, [
          toggleButton({
            value: props.userSettings.mapGrid,
            onChange: props.onChangeMapGrid,
            label: '#',
            classNameTrue: 'toggleButton black',
            classNameFalse: 'toggleButton',
            styleFalse: { color: 'grey' },
            tooltip: 'Show map grid'
          }
          )
          // div({className:"h2"}),
          // toggleButton({
          //  value: props.userSettings.contourmap,
          //  onChange: props.onChangeContourmap,
          //  label: "//",
          //  classNameTrue: "toggleButton red",
          //  classNameFalse: "toggleButton",
          //  styleFalse: {color: "grey"},
          //  tooltip: "Show contour map layer",
          // }),
        ]),
        div({ className: 'flexRow' }, [
          div({ className: 'separator' })
        ]),
        ...weaponSettings(props),
        div({ className: 'flexRow' }, [
          div({ className: 'separator' })
        ]),

        ...targetSettings(props),
        div({ className: 'v2' }, []),

        div({ className: 'flexRow' }, [
          div({ className: 'separator' })
        ]),
        ...extraButtons(props),
        div({ className: 'flexRow' }, [
          div({ className: 'separator' })
        ])
        // sessionComponent(props),
        // div({className: "flexRow"}, [
        //  div({className: "separator"})
        // ]),
        // div({className: "v2"}, [])

      ])
    ]
  }

const weaponSettings = (props: { userSettings: UserSettings } & any) => [
  div({ className: 'flexRow' }, [
    h(Dropdown, {
      className: 'flexItemFill',
      value: props.userSettings.weaponType,
      onChange: props.onChangeWeapon,
      options: weaponOptions.map(valueLabel => ({ value: valueLabel[0], elem: weaponOption(valueLabel[1], valueLabel[2]) }))
    })
  ]),
  div({ className: 'v2' }, []),
  div({ className: 'flexRow' }, [
    toggleButton({
      value: props.userSettings.weaponPlacementHelper,
      onChange: props.onChangeWeaponPlacementHelper,
      tooltip: 'Show keypads while moving weapon',
      label: '#?',
      className: '',
      classNameTrue: ' green',
      styleFalse: { color: 'grey' }
    }),
    div({ className: 'h2' }, []),
    toggleButton({
      value: props.userSettings.weaponPlacementLabel,
      onChange: props.onChangeWeaponPlacementLabel,
      tooltip: 'Show keypad label while moving weapon',
      label: 'A1',
      className: '',
      classNameTrue: ' green',
      styleFalse: { color: 'grey' }
    })
  ]),
  weaponTable(props)
]

const weaponTable = (props: { world: World, minimap: Minimap } & any) => {
  const weapons = getEntitiesByType<Weapon>(props.world, 'Weapon')
  canonicalEntitySort(weapons)
  return div({ className: 'flexRow' }, [
    h('table', { className: 'weaponTable' }, [
      h('colgroup', {}, [
        h('col', { className: 'indexCol' }),
        h('col', { className: 'locationCol' }),
        h('col', { className: '' }),
        h('col', { className: '' }),
        h('col', { className: '' })
      ]),
      h('thead', {}, [
        h('tr', {}, [
          h('th', {}, ['']),
          h('th', {}, ['']),
          h('th', {}, ['']),
          h('th', {}, ['']),
          h('th', {}, [''])
        ])
      ]),
      h('tbody', {}, [
        ...weapons.map((weapon: Weapon, index: number) =>
          h('tr', { key: index }, [
            h('td', { className: 'indexCell' }, [(index + 1).toString()]),
            h('td', {}, [standardFormatKeypad(world2keypadStrings(props.minimap, mat4.getTranslation(vec3.create(), weapon.transform)))]),
            h('td', {}, [
              h('input', {
                type: 'number',
                className: 'textInput numberInput',
                value: Math.floor(weapon.heightOverGround / 100),
                onChange: props.onChangeWeaponHeightOverGround(weapon.entityId),
                title: 'weapon height over ground (tall buildings, bridges, ...)'
              })
            ]),
            h('td', {}, [
              div({
                className: 'divButton ',
                title: 'activate only this weapon',
                onClick: () => props.pickActiveWeapon(weapon.entityId)
              }, '^')
            ]),
            h('td', {}, [
              toggleButton({
                value: weapon.isActive,
                onChange: () => props.setWeaponActive(weapon.entityId, !weapon.isActive),
                tooltip: 'activate/deactivate this weapon',
                label: 'o',
                className: '',
                classNameTrue: ' green',
                styleFalse: { color: 'grey' }
              })
            ])
          ])
        )
      ])
    ])
  ])
}

const targetSettings = (props: { userSettings: UserSettings } & any) => [
  div({ className: 'flexRow' }, [
    toggleButton({
      value: props.userSettings.targetGrid,
      onChange: props.onChangeTargetGrid,
      tooltip: 'Targeting grid: 5mil elevation arcs, 1° bearing lines',
      label: '#',
      className: '',
      classNameTrue: ' green',
      styleFalse: { color: 'grey' }
    }),
    div({ className: 'h2' }),
    toggleButton({
      value: props.userSettings.targetSpread,
      onChange: props.onChangeTargetSpread,
      tooltip: 'Projectile spread',
      label: 'O',
      className: '',
      classNameTrue: ' blue',
      styleFalse: { color: 'grey' }

    }),
    div({ className: 'h2' }),
    toggleButton({
      value: props.userSettings.targetSplash,
      onChange: props.onChangeTargetSplash,
      tooltip: 'Splash radius for 100 and 25 damage',
      label: '(O)',
      className: '',
      classNameTrue: ' red',
      styleFalse: { color: 'grey' }
    }),
    div({ className: 'h2' }),
    toggleButton({
      value: props.userSettings.targetDistance,
      onChange: props.onChangeTargetDistance,
      tooltip: 'Weapon-target distance',
      label: 'm',
      className: '',
      classNameTrue: ' black',
      styleFalse: { color: 'grey' }
    })
  ]),
  div({ className: 'v2' }, []),
  div({ className: 'flexRow' }, [
    toggleButton({
      value: props.userSettings.targetCompactMode,
      onChange: props.onChangeTargetCompactMode,
      tooltip: 'Compact target text: last three elevation digits',
      label: 'c',
      className: '',
      classNameTrue: 'pink',
      styleFalse: { color: 'grey' }

    }),
    div({ className: 'h2' }),
    toggleButton({
      value: props.userSettings.targetPlacementHelper,
      onChange: props.onChangeTargetPlacementHelper,
      tooltip: 'Show keypads while moving target',
      label: '#?',
      className: '',
      classNameTrue: 'red',
      styleFalse: { color: 'grey' }
    }),
    div({ className: 'h2' }),
    toggleButton({
      value: props.userSettings.targetPlacementLabel,
      onChange: props.onChangeTargetPlacementLabel,
      tooltip: 'Show keypad label while moving target',
      label: 'A1',
      className: '',
      classNameTrue: 'red',
      styleFalse: { color: 'grey' }

    }),
    div({ className: 'h2' }),
    h('input', {
      type: 'number',
      className: 'textInput numberInput',
      value: props.userSettings.fontSize,
      onChange: props.onChangeFontSize,
      title: 'font size'
    })
  ])
]

const extraButtons = (props: { userSettings: UserSettings, uiState: UIState } & any) => [
  div({ className: 'flexRow' }, [
    toggleButton({
      value: props.userSettings.extraButtonsAlwaysShown,
      onChange: props.onChangeExtraButtons,
      tooltip: 'Show extra buttons in collapsed mode',
      label: 'm.',
      className: '',
      classNameTrue: 'yellow',
      styleFalse: { color: 'grey' }
    }),
    div({ className: 'h2' }, []),
    /* toggleButton({
       value: props.userSettings.deleteMode,
       onChange: props.onChangeDeleteMode,
       tooltip: "Delete items with single click/touch",
       label: "-I",
       className: "",
       classNameTrue: "red",
       styleFalse: { color: "grey" },
     }),
     div({ className: "h2" }),
     toggleButton({
       value: props.uiState.weaponCreationMode,
       onChange: props.onChangeWeaponCreationMode,
       tooltip: "Place target or weapon markers by default (shift + double click always places weapons)",
       label: [
         h("span", { className: props.uiState.weaponCreationMode ? "grey" : "red" }, ["T "]),
         h("span", { className: props.uiState.weaponCreationMode ? "green" : "grey" }, ["W"])
       ],
     }),
    div({ className: "h2" }),
    */
    div({ className: 'v1' }, []),
    div({
      style: { 'font-size': '13px', width: '100%' },
      className: 'divButton ',
      title: 'Remove all targets',
      onClick: props.onClickRemoveAllTargets
    }, 'Remove all targets')
  ])
]

const mapDispatchToProps = (dispatch: any) => ({
  onChangeMap: (v: string) => dispatch(changeMap(v as any)),
  onChangeContourmap: (e: any) => dispatch(writeUserSettings('contourmap', e.target.value)),
  onChangeWeapon: (v: WeaponType) => dispatch(writeUserSettings('weaponType', v)),
  onChangeWeaponPlacementHelper: (e: any) => dispatch(writeUserSettings('weaponPlacementHelper', e.target.value)),
  onChangeWeaponPlacementLabel: (e: any) => dispatch(writeUserSettings('weaponPlacementLabel', e.target.value)),

  onChangeMapGrid: (e: any) => { dispatch(writeUserSettings('mapGrid', e.target.value)) },
  onChangeTargetSpread: (e: any) => dispatch(writeUserSettings('targetSpread', e.target.value)),
  onChangeTargetSplash: (e: any) => dispatch(writeUserSettings('targetSplash', e.target.value)),
  onChangeTargetDistance: (e: any) => dispatch(writeUserSettings('targetDistance', e.target.value)),
  onChangeTargetGrid: (e: any) => dispatch(writeUserSettings('targetGrid', e.target.value)),
  onChangeTargetCompactMode: (e: any) => dispatch(writeUserSettings('targetCompactMode', e.target.value)),
  onChangeTargetPlacementHelper: (e: any) => dispatch(writeUserSettings('targetPlacementHelper', e.target.value)),
  onChangeTargetPlacementLabel: (e: any) => dispatch(writeUserSettings('targetPlacementLabel', e.target.value)),

  onChangeFontSize: (e: any) => dispatch(writeUserSettings('fontSize', parseInt(e.target.value))),
  onChangeWeaponHeightOverGround: (entityId: EntityId) => (e: any) => dispatch(setWeaponHeightOverGroundMeters(entityId, parseInt(e.target.value))), // dispatch(writeUserSettings("extraWeaponHeight", parseInt(e.target.value))),
  onClickRemoveAllTargets: (e: any) => dispatch(removeAllTargets()),
  onChangeDeleteMode: (e: any) => dispatch(writeUserSettings('deleteMode', e.target.value)),
  onChangeExtraButtons: (e: any) => dispatch(writeUserSettings('extraButtonsAlwaysShown', e.target.value)),
  onChangeWeaponCreationMode: (e: any) => dispatch(writeUIState('weaponCreationMode', e.target.value)),
  setWeaponActive: (entityId: EntityId, newState: boolean) => dispatch(setWeaponActive(entityId, newState)),
  pickActiveWeapon: (entityId: EntityId, newState: boolean) => dispatch(pickActiveWeapon(entityId)),
  setCollapsed: (e: any) => dispatch(writeUserSettings('leftPanelCollapsed', e.target.value))
})
const mapStateToProps = (state: StoreState /*, ownProps */) => {
  return {
    userSettings: state.userSettings,
    uiState: state.uiState,
    world: state.world,
    minimap: state.minimap,
    state
  }
}

const connectedLeftPanel = connect(
  mapStateToProps,
  mapDispatchToProps
)(leftPanel)

export const makeLeftPanel: (store: any) => any =
  store => h(Provider, { store },
    h(connectedLeftPanel)
  )

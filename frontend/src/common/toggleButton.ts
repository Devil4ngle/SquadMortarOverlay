import * as React from 'react'

const h = React.createElement
const div = <P, C>(props: any, children: C) => h('div', props, children)
const undefOr = (a: any, b: any) => a !== undefined ? a : b

export const toggleButton: (props: {
  value: boolean
  onChange: Function
  tooltip?: string

  className?: string
  label?: string | React.ReactNode
  style?: any

  classNameTrue?: string
  labelTrue?: any
  styleTrue?: any

  classNameFalse?: string
  labelFalse?: any
  styleFalse?: any
}) => React.ReactElement =
  (props) => props.value
    ? h('button', {
      title: undefOr(props.tooltip, ''),
      className: 'toggleButton ' + undefOr(props.classNameTrue, props.className),
      style: props.styleTrue,
      onClick: () => props.onChange({ target: { value: !props.value } })

    }, undefOr(props.label, props.labelFalse))
    : h('button', {
      title: undefOr(props.tooltip, ''),
      className: 'toggleButton ' + undefOr(props.classNameFalse, props.className),
      style: props.styleFalse,
      onClick: () => props.onChange({ target: { value: !props.value } })
    }, undefOr(props.label, props.labelFalse))

export const unstyledToggleButton: (props: {
  value: boolean
  onChange: Function

  className?: string
  label?: string
  style?: any

  classNameTrue?: string
  labelTrue?: any
  styleTrue?: any

  classNameFalse?: string
  labelFalse?: any
  styleFalse?: any
}) => React.ReactElement =
  (props) => props.value
    ? div({
      className: '' + undefOr(props.classNameTrue, props.className),
      style: undefOr(props.styleTrue, props.style),
      onClick: () => props.onChange({ target: { value: !props.value } })
    }, undefOr(props.label, props.labelFalse))
    : div({
      className: '' + undefOr(props.classNameFalse, props.className),
      style: undefOr(props.styleFalse, props.style),
      onClick: () => props.onChange({ target: { value: !props.value } })
    }, undefOr(props.label, props.labelFalse))

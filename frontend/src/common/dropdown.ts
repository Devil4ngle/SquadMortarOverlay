import * as React from 'react'

const h = React.createElement
const div = <P, C>(props: any, children: C) => h('div', props, children)
const undefOr = (a: any, b: any) => a !== undefined ? a : b

interface Props {
  className?: string
  options: Array<{ value: any, elem: HTMLElement | string }>
  value: any
  onChange: Function
}

export class Dropdown extends React.Component<any, { isOpen: boolean }> {
  constructor (props: any) {
    super(props)
    this.state = { isOpen: false }
  }

  setOpen (open: boolean) {
    this.setState({ isOpen: open })
  }

  render () {
    const childContainer = (c: any, value: any, index: number) => div({
      key: index,
      className: 'dropdownChild ' + undefOr(this.props.className, ''),
      onClick: () => {
        this.setOpen(!this.state.isOpen)
        this.props.onChange(value)
      }
    }, c
    )
    const childrenContainer = div({ className: 'dropdownChildren' },
      this.props.options.map((o: any, index: number) => childContainer(o.elem, o.value, index))
    )
    const selectedContainer = div({
      key: -1,
      className: 'dropdownSelected',
      onClick: () => { this.setOpen(!this.state.isOpen) }
    },
    this.props.options.find((o: any) => o.value === this.props.value)?.elem
    )
    return h('div', {
      className: 'dropdown',
      onBlur: () => { this.setOpen(false) },
      tabIndex: 0
    }, [
      selectedContainer,
      this.state.isOpen ? childrenContainer : undefined
    ])
  }
}

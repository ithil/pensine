import { Node } from 'tiptap'
import { chainCommands, exitCode } from 'tiptap-commands'

export default class JumpMark extends Node {

  get name() {
    return 'jump_mark'
  }

  get schema() {
    return {
      attrs: {
        name: {
          default: null,
        },
      },
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [
        {
          tag: 'span.jumpMark',
          getAttrs: dom => ({
            name: dom.getAttribute('data-name'),
          }),
        },
      ],
      toDOM: (node) => {
        const {name} = node.attrs
        return ['span', {'class': 'jumpMark', 'data-name': name}]
      },
    }
  }

  keys({ type }) {
    // const command = chainCommands(exitCode, (state, dispatch) => {
    //   dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView())
    //   return true
    // })
    // return {
    //   'Mod-Enter': command,
    //   'Shift-Enter': command,
    // }
  }

}

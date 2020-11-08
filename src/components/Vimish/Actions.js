import Helpers from '@/components/Vimish/Helpers.js'
import * as prosemirrorModel from 'prosemirror-model'
import {
  liftListItem,
  sinkListItem,
  splitListItem,
  wrapInList,
} from "prosemirror-schema-list"

export default ($this, $window) => {
  const helpers = Helpers($this, $window)
  return {
    changeAction(pos) { // Actions
      if (pos && pos.left && pos.right) {
        helpers.putCaretInPos(pos.left)
        var slice = $this.editor.state.doc.slice(pos.left, pos.right)
        $this.textRegister.set($this.keybufferRegister || '0', slice)
        var tr = $this.editor.state.tr.delete(pos.left, pos.right)
        $this.editor.dispatchTransaction(tr)
        $this.editable = true
        helpers.toInsertMode()
      }
    },
    deleteAction(pos) { // Actions
      if (pos && pos.left > -1 && pos.right > -1) {
        helpers.putCaretInPos(pos.left)
        var slice = $this.editor.state.doc.slice(pos.left, pos.right)
        $this.textRegister.set($this.keybufferRegister || '0', slice)
        var tr = $this.editor.state.tr.delete(pos.left, pos.right)
        $this.editor.dispatchTransaction(tr)
      }
      helpers.putCaretInPos($this.editor.selection.from)
      // Maybe put another putCaretInPos here, because obviously the cursor is turned into a |
      // Is that still true?
    },
    delChar() { // Actions
      var selection = $this.editor.selection
      var state = $this.editor.state
      var transaction = state.tr.deleteSelection()
      $this.editor.view.dispatch(transaction)
    },
    paste(before) { // Actions
      var {from, to} = $this.editor.selection
      var resolvedPos = $this.editor.state.doc.resolve(from)
      var pos = before ? resolvedPos.before() : resolvedPos.after()
      var slice = $this.textRegister.get($this.keybufferRegister || '0')
      if (slice) {
        var tr = $this.editor.state.tr.insert(pos, slice.content)
        $this.editor.dispatchTransaction(tr)
      }
    },
    yankAction(pos) { // Actions
      if (pos && pos.left > -1 && pos.right > -1) {
        var slice = $this.editor.state.doc.slice(pos.left, pos.right)
        $this.textRegister.set($this.keybufferRegister || '0', slice)
      }
    },
    newLine(before) { // Actions
      var schema = $this.editor.schema
      var F = prosemirrorModel.Fragment
      var {from, to} = $this.editor.selection
      var resolvedPos = $this.editor.state.doc.resolve(from)
      var depth = resolvedPos.depth
      var newNode = resolvedPos.node(Math.max(1, depth-1)).copy(F.empty.append(F.from(
        schema.text(' ')
      )))
      if (newNode.type.name == 'list_item') {
        // newNode = schema.node('list_item', {}, schema.node('paragraph', {}, F.empty.append(F.from(schema.text(' ')))))
        if (before) {
          var pos = resolvedPos.start()
          $this.editor.setSelection(pos, pos)
        }
        else {
          var pos = resolvedPos.end()
          $this.editor.setSelection(pos, pos)
          pos += 1
        }
        splitListItem(schema.nodes.list_item)(
          $this.editor.state,
          $this.editor.dispatchTransaction.bind($this.editor)
        )
      }
      else {
        var pos = before ? resolvedPos.before(depth) : resolvedPos.after(depth)
        var tr = $this.editor.state.tr.insert(pos, newNode)
        $this.editor.dispatchTransaction(tr)
      }
      helpers.putCaretInPos(pos+1)
      // helpers.findValidCaretPos(0, before ? -1 : 1)
      $this.editable = true
      helpers.toInsertMode()
    },
    newJumpMark(name) { // Actions
      var schema = $this.editor.schema
      var {from, to} = $this.editor.selection
      var {size} = $this.editor.view.state.doc.content
      var tr
      $this.editor.state.doc.nodesBetween(0, size, (node, pos, parent, index) => {
          if (node.type.name == 'jump_mark') {
            if (node.attrs.name == name) {
              tr = $this.editor.state.tr.delete(pos, pos+node.nodeSize)
              return false
            }
          }
      })
      var resolvedPos = $this.editor.state.doc.resolve(from)
      var newJM = schema.node('jump_mark', {name: name})
      if (tr) {
        tr.insert(from, newJM)
      }
      else {
        tr = $this.editor.state.tr.insert(from, newJM)
      }
      $this.editor.dispatchTransaction(tr)
    },
  }
}

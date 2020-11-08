export default ($this, $window) => {
  return {
    logEditorObj() {
      console.log($this.editor)
    },
    getSelectionPosition() { // Helpers
      var selection = $window.getSelection();
      if (selection.type == "Caret" && !$this.editable) {
        $this.vimMode = "Normal"
        var range = selection.getRangeAt(0)
        try {
          range.setStart(selection.focusNode, selection.focusOffset)
          range.setEnd(selection.focusNode, selection.focusOffset+1)
        }
        catch (e) {
          if (e.name != "IndexSizeError") {
            throw e
          }
        }
        selection.removeAllRanges()
        selection.addRange(range)
      }
      else if (selection.type == "Range" && !$this.editable) {
        $this.vimMode = "Visual"
      }
    },
    putCaretInPos(pos) { // Helpers
      if (!$this.editor.focused) {
        $this.editor.focus()
      }
      $this.editor.setSelection(pos, pos+1)
      this.scrollCursorIntoView()
    },
    toInsertMode() { // Helpers
      var {from, to} = $this.editor.selection
      if (!$this.editor.focused) {
        $this.editor.focus()
      }
      $this.editor.setSelection(from, from)
    },
    toInsertModeAppend() { // Helpers
      var {from, to} = $this.editor.selection
      if (!$this.editor.focused) {
        $this.editor.focus()
      }
      $this.editor.setSelection(to, to)
    },
    toNormalMode() { // Helpers
      var {from, to} = $this.editor.selection
      this.findValidCaretPos(1, from-1)
    },
    resetKeybuffer() { // Helpers / Or Keybinds ?
      $this.fullKeybuffer = ''
      $this.keybuffer = ''
      $this.keybufferCount = null
      $this.keybufferRegister = null
    },
    putVisualCaretInPos(pos) { // Helpers
      var {from, to} = $this.editor.selection
      var anchor = $this.anchor
      if (pos < anchor) {
        $this.editor.setSelection(pos, anchor+1)
      }
      else if (pos > anchor) {
        $this.editor.setSelection(anchor, pos)
      }
      else if (pos == anchor) {
        if (from == anchor) {
          $this.editor.setSelection(pos-1, anchor+1)
        }
        else {
          $this.editor.setSelection(pos, pos+1)
        }
      }
      this.scrollCursorIntoView()
    },
    getSelectionHead() { // Helpers
      var {from, to} = $this.editor.selection
      var anchor = $this.anchor
      if ($this.vimMode == 'Visual') {
        if (from == anchor) {
          return to
        }
        else if (to == anchor+1) {
          return from
        }
      }
      else {
        return to
      }
    },
    setSelectionRange(pos) { // Helpers
      if (pos && pos.left && pos.right) {
        $this.editor.setSelection(pos.left, pos.right)
        $this.vimMode = "Visual"
        $this.anchor = pos.left
      }
    },
    createSelectionRange(left, right) {
      return {
        left: left,
        right: right,
      }
    },
    scrollCursorIntoView() { // Helpers
      $this.editor.dispatchTransaction($this.editor.state.tr.scrollIntoView())
    },
    scrollCursorToTop() { // Helpers ??
      var {from, to} = $this.editor.selection
      var {top, left} = $this.editor.view.coordsAtPos(from)
      $window.scrollTo(left, top)
    },
    findValidCaretPos(dir, startPos, cb) { // Helpers
      dir = dir || 1
      var {from, to} = $this.editor.selection
      var {size} = $this.editor.view.state.doc.content
      var $succeeded = false
      var pos = (typeof(startPos) == 'number' ? startPos : from) + dir
      while (!$succeeded && (dir < 0 ? pos > -1 : pos < size - 2)) {
        let resolvedPos = $this.editor.state.doc.resolve(pos)
        let index = resolvedPos.index()
        let node = resolvedPos.node().nodeAt(index)
        let start = resolvedPos.start()
        let end = resolvedPos.end()
        let depth = resolvedPos.depth
        if (node && depth && ['text', 'image'].includes(node.type.name) && pos >= start && pos <= end-1) {
          if (cb) {
            cb(pos)
          }
          else {
            this.putCaretInPos(pos)
          }
          $succeeded = true
        }
        pos += dir
      }
    },
    getPosOfJumpMark(name, cb) { // Helpers
      var $succeeded = false
      var {from, to} = $this.editor.selection
      var {size} = $this.editor.view.state.doc.content
      $this.editor.state.doc.nodesBetween(0, size, (node, pos, parent, index) => {
          if (node.type.name == 'jump_mark') {
            if (node.attrs.name == name) {
              cb(pos)
              return false
            }
          }
      })
    },
    positionOfNextNodeOfType(from, to, type, cb) { // Helpers
      var $succeeded = false
      $this.editor.state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
        if (!$succeeded) {
          if (pos > from && node.type.name == type) {
            cb(pos)
            $succeeded = true
            return false
          }
        }
      })
    },
    positionOfPrevNodeOfType(from, to, type, cb) { // Helpers
      var foundPos = undefined
      $this.editor.state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
          if (pos < to && pos + node.nodeSize < to && node.type.name == type) {
            foundPos = pos
          }
      })
      cb(foundPos)
    },
  }
}

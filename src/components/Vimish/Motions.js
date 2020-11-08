import Helpers from '@/components/Vimish/Helpers.js'

export default ($this, $window) => {
  const helpers = Helpers($this, $window)
  return {
    moveCursorLeft() { // Motions
      helpers.findValidCaretPos(-1, undefined, (pos) => {
        helpers.putCaretInPos(pos)
      })
    },
    moveCursorRight() { // Motions
      helpers.findValidCaretPos(1, undefined, (pos) => {
        helpers.putCaretInPos(pos)
      })
    },
    moveToStart(cb) { // Motions
      helpers.findValidCaretPos(1, 0, (pos) => {
        if (cb) {
          cb(pos)
        }
        else {
          helpers.putCaretInPos(pos)
        }
      })
    },
    moveToEnd(cb) { // Motions
      var {size} = $this.editor.view.state.doc.content
      helpers.findValidCaretPos(-1, size, (pos) => {
        if (cb) {
          cb(pos)
        }
        else {
          helpers.putCaretInPos(pos)
        }
      })
    },
    startOfBlock(cb) { // Motions
      var {size} = $this.editor.view.state.doc.content
      var {from, to} = $this.editor.selection
      var resolvedPos = $this.editor.state.doc.resolve(from)
      if (cb) {
        cb(resolvedPos.start())
      }
      else {
        helpers.putCaretInPos(resolvedPos.start())
      }
    },
    endOfBlock(cb) { // Motions
      var {size} = $this.editor.view.state.doc.content
      var {from, to} = $this.editor.selection
      var resolvedPos = $this.editor.state.doc.resolve(from)
      if (cb) {
        cb(resolvedPos.end())
      }
      else {
        helpers.putCaretInPos(resolvedPos.end()-1)
      }
    },
    moveLineDown() { // Motions
      // TODO: add callback
      var $editor = $this.editor
      var {size} = $editor.view.state.doc.content
      var {from, to} = $this.editor.selection
      var $succeeded = false
      $editor.state.doc.nodesBetween(to, size, (node, pos, parent, index) => {
        if (!$succeeded) {
          if (pos > to && ['paragraph', 'hard_break', 'heading'].includes(node.type.name)) {
            helpers.putCaretInPos(pos+1)
            $succeeded = true
            return false
          }
        }
      })
    },
    moveLineUp() { // Motions
      // TODO: add callback
      var $editor = $this.editor
      var {size} = $editor.view.state.doc.content
      var {from, to} = $this.editor.selection
      var myPos = null
      var $succeeded = false
      $editor.state.doc.nodesBetween(0, from, (node, pos, parent, index) => {
          if (pos+1 != from && ['paragraph', 'hard_break', 'heading'].includes(node.type.name)) {
            myPos = pos + 1
            if (node.type.name == 'paragraph') {
              node.descendants((node, c_pos, parent) => {
                if (c_pos+pos+2 < from && ['paragraph', 'hard_break', 'heading'].includes(node.type.name)) {
                  myPos = c_pos + pos + 2
                }
              })
            }
            $succeeded = true
            return false
          }
      })
      if (myPos) {
        helpers.putCaretInPos(myPos)
      }
    },
    findNextLineBreak(cb, includeCursorPosition) { // Obsolete ?
      var {size} = $this.editor.view.state.doc.content
      var {from, to} = $this.editor.selection
      var $succeeded = false
      if (includeCursorPosition) {
        to -= 1
      }
      $this.editor.state.doc.nodesBetween(to, size, (node, pos, parent, index) => {
        if (!$succeeded) {
          if (pos > to && ['paragraph', 'hard_break', 'heading'].includes(node.type.name)) {
            cb(pos)
            $succeeded = true
            return false
          }
        }
      })
    },
    findPrevLineBreak(cb, includeCursorPosition) { // Obsolete ?
      var {size} = $this.editor.view.state.doc.content
      var {from, to} = $this.editor.selection
      var myPos = null
      var $succeeded = false
      if (includeCursorPosition) {
        from += 1
      }
      $this.editor.state.doc.nodesBetween(0, from, (node, pos, parent, index) => {
          if (pos+1 != from && ['paragraph', 'hard_break', 'heading'].includes(node.type.name)) {
            myPos = pos + 1
            if (node.type.name == 'paragraph') {
              node.descendants((node, c_pos, parent) => {
                if (c_pos+pos+2 < from && ['paragraph', 'hard_break', 'heading'].includes(node.type.name)) {
                  myPos = c_pos + pos + 2
                }
              })
            }
            $succeeded = true
            return false
          }
      })
      if (myPos) {
        cb(myPos)
      }
    },
    getPosOfCharRightOfCursor(char, cb) { // Motions
      var $editor = $this.editor
      var {size} = $editor.view.state.doc.content
      var {from, to} = $this.editor.selection
      var $succeeded = false
      $editor.state.doc.nodesBetween(to, size, (node, pos, parent, index) => {
        if (!$succeeded) {
          var text = node.text
          if (text) {
            var myIndex = text.indexOf(char, to-pos)
          }
          if (myIndex > -1) {
            if (cb) {
              cb(pos+myIndex)
            }
            else {
              helpers.putCaretInPos(pos+myIndex)
            }
            $succeeded = true
            return false
          }
        }
      })
    },
    getPosOfCharLeftOfCursor(char, cb) { // Motions
      var $editor = $this.editor
      var {size} = $editor.view.state.doc.content
      var {from, to} = $this.editor.selection
      var myPos = null
      var $succeeded = false
      $editor.state.doc.nodesBetween(0, from, (node, pos, parent, index) => {
        var text = node.text
        if (text) {
          var myIndex = text.slice(0, from-pos).lastIndexOf(char)
        }
        if (myIndex > -1) {
          myPos = pos+myIndex
        }
      })
      if (myPos) {
        if (cb) {
          cb(myPos)
        }
        else {
          helpers.putCaretInPos(myPos)
        }
      }
    },
    getPosOfPatternRightOfCursor(pattern, mn, cb, includeCursorPosition) { // Motions
      function indexOfGroup(match, n) {
        var ix = match.index
        for (var i = 1; i < n; i++) {
          ix += match[i].length
        }
        return ix
      }
      var $editor = $this.editor
      var {size} = $editor.view.state.doc.content
      var to = helpers.getSelectionHead()
      if (includeCursorPosition) {
        to -= 1
      }
      var $succeeded = false
      $editor.state.doc.nodesBetween(to, size, (node, pos, parent, index) => {
        pattern.lastIndex = 0
        if (!$succeeded) {
          var text = node.text
          if (text) {
            var matches = [...text.matchAll(pattern)]
            if(to-pos > -1 && matches.length > 0) {
              matches = matches.filter(m => (includeCursorPosition ? (m.index >= to-pos) : m.index > to-pos ))
            }
            if (matches.length > 0) {
              var myIndex = indexOfGroup(matches[0], mn)
            }
          }
          if (myIndex > -1) {
            cb(pos+myIndex)
            $succeeded = true
            return false
          }
        }
      })
    },
    getPosOfPatternLeftOfCursor(pattern, mn, cb, includeCursorPosition) { // Motions
      function indexOfGroup(match, n) {
        var ix = match.index
        for (var i = 1; i < n; i++) {
          ix += match[i].length
        }
        return ix
      }
      var $editor = $this.editor
      var {size} = $editor.view.state.doc.content
      var from = helpers.getSelectionHead() - 1
      var myPos = null
      if (includeCursorPosition) {
        from += 1
      }
      $editor.state.doc.nodesBetween(0, from, (node, pos, parent, index) => {
        pattern.lastIndex = 0
          var text = node.text
          if (text) {
            var matches = [...text.matchAll(pattern)]
            if(from-pos+1 > -1 && matches.length > 0) {
              matches = matches.filter(m => m.index < from-pos)
            }
            if (matches.length > 0) {
              var myIndex = indexOfGroup(matches[matches.length-1], mn)
            }
          }
          if (myIndex > -1) {
            myPos = pos + myIndex
          }
      })
      if (myPos) {
        cb(myPos)
      }
    },
    moveCursorRightToPattern(pattern, mn) { // Obsolete ?
      this.getPosOfPatternRightOfCursor(pattern, mn, (pos) => {
        if (pos) {
          helpers.putCaretInPos(pos)
        }
      })
    },
    moveCursorLeftToPattern(pattern, mn) { // Obsolete ?
      this.getPosOfPatternLeftOfCursor(pattern, mn, (pos) => {
        if (pos) {
          helpers.putCaretInPos(pos)
        }
      })
    },
  }
}

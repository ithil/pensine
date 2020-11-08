import Helpers from '@/components/Vimish/Helpers.js'
import Actions from '@/components/Vimish/Actions.js'
import Motions from '@/components/Vimish/Motions.js'
import TextObjects from '@/components/Vimish/TextObjects.js'
import {
  liftListItem,
  sinkListItem,
  splitListItem,
  wrapInList,
} from "prosemirror-schema-list"

export default ($this, $window) => {
  const helpers = Helpers($this, $window)
  const actions = Actions($this, $window)
  const motions = Motions($this, $window)
  const textObjects = TextObjects($this, $window)
  return {
    keymonitor(event) {
      if (event.key === "Escape") {
        helpers.toNormalMode()
        $this.vimMode = "Normal"
        $this.editable = false
        helpers.resetKeybuffer()
      }
      if (event.metaKey && event.key == 's') {
        $this.saveNote()
      }
      if (!$this.editable) {
        if (event.key.length == 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
          $this.fullKeybuffer += event.key
          var match = $this.fullKeybuffer.match(/(\d+)?("([a-zA-Z0-9+]))?(.+)/)
          $this.keybufferCount = match[1]
          $this.keybufferRegister = match[3]
          $this.keybuffer = match[4]
        }
        if ($this.vimMode == "Normal") {
          if($this.keybuffer == "i")
          {
            $this.editable = true
            event.preventDefault()
            event.stopPropagation()
            helpers.toInsertMode()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "I")
          {
            $this.editable = true
            event.preventDefault()
            event.stopPropagation()
            motions.startOfBlock()
            helpers.toInsertMode()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "a")
          {
            $this.editable = true
            event.preventDefault()
            event.stopPropagation()
            helpers.toInsertModeAppend()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "A")
          {
            $this.editable = true
            event.preventDefault()
            event.stopPropagation()
            motions.endOfBlock()
            helpers.toInsertModeAppend()
            helpers.resetKeybuffer()
          }
          else if (event.key == 'Tab' && event.shiftKey) {
            var schema = $this.editor.schema
            liftListItem(schema.nodes.list_item)($this.editor.state, $this.editor.dispatchTransaction.bind($this.editor))
            event.preventDefault()
            event.stopPropagation()
          }
          else if (event.key == 'Tab') {
            var {from, to} = $this.editor.selection
            var resolvedPos = $this.editor.state.doc.resolve(from)
            var nodeType = resolvedPos.node(-1).type.name
            var schema = $this.editor.schema
            if (nodeType == 'list_item') {
              sinkListItem(schema.nodes.list_item)($this.editor.state, $this.editor.dispatchTransaction.bind($this.editor))
            }
            else {
              wrapInList(schema.nodes.list_item)($this.editor.state, $this.editor.dispatchTransaction.bind($this.editor))
            }
            event.preventDefault()
            event.stopPropagation()
          }
          else if($this.keybuffer == "h")
          {
            motions.moveCursorLeft()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "l")
          {
            motions.moveCursorRight()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "j")
          {
            motions.moveLineDown()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "k")
          {
            motions.moveLineUp()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "G")
          {
            var {size} = $this.editor.view.state.doc.content
            // motions.moveToEnd()
            helpers.findValidCaretPos(-1, size)
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "gg")
          {
            motions.moveToStart()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "o")
          {
            actions.newLine()
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "O")
          {
            actions.newLine(true)
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "zt")
          {
            helpers.scrollCursorToTop()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "t")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            helpers.positionOfNextNodeOfType(to, size, 'text', (pos) => {
              helpers.putCaretInPos(pos)
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "T")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            helpers.positionOfPrevNodeOfType(0, from, 'text', (pos) => {
              if (pos) {
                helpers.putCaretInPos(pos)
              }
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == ")")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            helpers.positionOfNextNodeOfType(to, size, 'heading', (pos) => {
              if (pos > -1) {
                helpers.putCaretInPos(pos+1)
              }
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "(")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            helpers.positionOfPrevNodeOfType(0, from, 'heading', (pos) => {
              if (pos > -1) {
                helpers.putCaretInPos(pos+1)
              }
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "x")
          {
            actions.delChar()
            helpers.getSelectionPosition()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "r")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                var tr = $this.editor.state.tr.insertText($this.keybuffer)
                $this.editor.dispatchTransaction(tr)
                helpers.resetKeybuffer()
                $this.vimMode = "Normal"
                helpers.toNormalMode()
                helpers.putCaretInPos(from)
              }
              if (event.key == 'Enter') {
                var tr = $this.editor.state.tr.insertText('\n')
                $this.editor.dispatchTransaction(tr)
                helpers.resetKeybuffer()
                $this.vimMode = "Normal"
                helpers.toNormalMode()
                helpers.putCaretInPos(from)
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "'")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                helpers.getPosOfJumpMark($this.keybuffer, (pos) => {
                  helpers.putCaretInPos(pos+1)
                })
                helpers.resetKeybuffer()
                $this.vimMode = "Normal"
                helpers.toNormalMode()
              }
            }
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "m")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                actions.newJumpMark($this.keybuffer)
                helpers.resetKeybuffer()
                $this.vimMode = "Normal"
                helpers.toNormalMode()
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == ",r")
          {
            var {from, to} = $this.editor.selection
            var resolvedPos = $this.editor.state.doc.resolve(from)
            console.log(resolvedPos)
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == ",l")
          {
            helpers.logEditorObj()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "u")
          {
            $this.editable = true
            $this.editor.setOptions({
              editable: $this.editable,
            })
            var result = $this.editor.commands.undo()
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
            $this.editable = false
            $this.editor.setOptions({
              editable: $this.editable,
            })
            helpers.putCaretInPos($this.editor.selection.from)
          }
          else if($this.keybuffer == ",b")
          {
            $this.editable = true
            $this.editor.setOptions({
              editable: $this.editable,
            })
            var result = $this.editor.commands.bold()
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
            $this.editable = false
            $this.editor.setOptions({
              editable: $this.editable,
            })
          }
          else if($this.keybuffer == "w")
          {
            motions.getPosOfPatternRightOfCursor(/(?<![\w'])(\w+)/g, 1, (pos) => {
              if (pos) {
                helpers.putCaretInPos(pos)
              }
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "b")
          {
            motions.moveCursorLeftToPattern(/(?<![\w'])(\w+)/g, 1)
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "e")
          {
            motions.getPosOfPatternRightOfCursor(/(\w)(?![\w'])/g, 1, (pos) => {
              if (pos) {
                helpers.putCaretInPos(pos)
              }
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "s")
          {
            motions.getPosOfPatternRightOfCursor(/(?<=(^|[.?!]\s+))([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (pos) => {
              if (pos) {
                helpers.putCaretInPos(pos)
              }
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "S")
          {
            motions.getPosOfPatternLeftOfCursor(/(?<=(^|[.?!]\s+))([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (pos) => {
              if (pos) {
                helpers.putCaretInPos(pos)
              }
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "dd")
          {
            actions.deleteAction(textObjects.anItem())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "dip")
          {
            actions.deleteAction(textObjects.innerParagraph())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "dap")
          {
            actions.deleteAction(textObjects.aParagraph())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "dil")
          {
            actions.deleteAction(textObjects.innerLine())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "das")
          {
            actions.deleteAction(textObjects.aSentence())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "df")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharRightOfCursor($this.keybuffer, (pos) => {
                  actions.deleteAction({left: from, right: pos+1})
                })
                helpers.resetKeybuffer()
                $this.vimMode = "Normal"
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "dF")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharLeftOfCursor($this.keybuffer, (pos) => {
                  actions.deleteAction({left: pos, right: from})
                })
                helpers.resetKeybuffer()
                $this.vimMode = "Normal"
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "dt")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharRightOfCursor($this.keybuffer, (pos) => {
                  actions.deleteAction({left: from, right: pos})
                })
                helpers.resetKeybuffer()
                $this.vimMode = "Normal"
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "dT")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharLeftOfCursor($this.keybuffer, (pos) => {
                  actions.deleteAction({left: pos+1, right: from})
                })
                helpers.resetKeybuffer()
                $this.vimMode = "Normal"
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "p")
          {
            actions.paste()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "P")
          {
            actions.paste(true)
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "yy")
          {
            actions.yankAction(textObjects.anItem())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == ",f")
          {
            var {from, to} = $this.editor.selection
            console.log(`from: ${from}`)
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == ",t")
          {
            var {from, to} = $this.editor.selection
            console.log(`to: ${to}`)
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == ",q")
          {
            textObjects.innerAnyQuote()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "v")
          {
            var {from, to} = $this.editor.selection
            $this.anchor = from
            $this.vimMode = "Visual"
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "cc")
          {
            actions.changeAction(textObjects.innerItem())
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "cw")
          {
            var {from, to} = $this.editor.selection
            motions.getPosOfPatternRightOfCursor(/([^\w'])/g, 1, (rightPos) => {
              if (rightPos) {
                actions.changeAction({
                  left: from,
                  right: rightPos,
                })
              }
            })
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "ciw")
          {
            actions.changeAction(textObjects.innerWord())
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "cil")
          {
            actions.changeAction(textObjects.innerLine())
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "cis")
          {
            actions.changeAction(textObjects.innerSentence())
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "cas")
          {
            actions.changeAction(textObjects.aSentence())
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "cf")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharRightOfCursor($this.keybuffer, (pos) => {
                  actions.changeAction({left: from, right: pos+1})
                })
                helpers.resetKeybuffer()
                event.preventDefault()
                event.stopPropagation()
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "cF")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharLeftOfCursor($this.keybuffer, (pos) => {
                  actions.changeAction({left: pos, right: from})
                })
                helpers.resetKeybuffer()
                event.preventDefault()
                event.stopPropagation()
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "ct")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharRightOfCursor($this.keybuffer, (pos) => {
                  actions.changeAction({left: from, right: pos})
                })
                helpers.resetKeybuffer()
                event.preventDefault()
                event.stopPropagation()
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "cT")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharLeftOfCursor($this.keybuffer, (pos) => {
                  actions.changeAction({left: pos+1, right: from})
                })
                helpers.resetKeybuffer()
                event.preventDefault()
                event.stopPropagation()
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "0")
          {
            if ($this.keybufferCount == null) {
              motions.startOfBlock()
              helpers.resetKeybuffer()
            }
          }
          else if($this.keybuffer == "$")
          {
            motions.endOfBlock()
            helpers.resetKeybuffer()
          }
        }
        else if ($this.vimMode == "Visual") {
          if($this.keybuffer == "l")
          {
            var {from, to} = $this.editor.selection
            helpers.putVisualCaretInPos(helpers.getSelectionHead()+1)
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "h")
          {
            var {from, to} = $this.editor.selection
            helpers.putVisualCaretInPos(helpers.getSelectionHead()-1)
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "G")
          {
            motions.moveToEnd((pos) => {
              helpers.putVisualCaretInPos(pos)
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "gg")
          {
            motions.moveToStart((pos) => {
              helpers.putVisualCaretInPos(pos)
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "o")
          {
            var {from, to} = $this.editor.selection
            var anchor = $this.anchor
            if (anchor == from) {
              $this.anchor = to-1
            }
            else if (anchor == to-1) {
              $this.anchor = from
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "iw")
          {
            helpers.setSelectionRange(textObjects.innerWord())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "il")
          {
            helpers.setSelectionRange(textObjects.innerLine())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "al")
          {
            helpers.setSelectionRange(textObjects.aLine())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == ",q")
          {
            helpers.setSelectionRange(textObjects.innerAnyQuote())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "as")
          {
            helpers.setSelectionRange(textObjects.aSentence())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "is")
          {
            helpers.setSelectionRange(textObjects.innerSentence())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "iq")
          {
            helpers.setSelectionRange(textObjects.innerAnyQuote())
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "w")
          {
            var count = $this.keybufferCount || 1
            for (var i = 1; i <= count; i++) {
              motions.getPosOfPatternRightOfCursor(/(?<![\w'])(\w+)/g, 1, (pos) => {
                if (pos) {
                  helpers.putVisualCaretInPos(pos)
                }
              })
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "b")
          {
            var count = $this.keybufferCount || 1
            for (var i = 1; i <= count; i++) {
              motions.getPosOfPatternLeftOfCursor(/(?<![\w'])(\w+)/g, 1, (pos) => {
                if (pos) {
                  helpers.putVisualCaretInPos(pos)
                }
              })
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "e")
          {
            motions.getPosOfPatternRightOfCursor(/(\w)(?![\w'])/g, 1, (pos) => {
              if (pos) {
                helpers.putVisualCaretInPos(pos+1)
              }
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "0")
          {
            if ($this.keybufferCount == null) {
              motions.startOfBlock((pos) => {
                helpers.putVisualCaretInPos(pos)
              })
              helpers.resetKeybuffer()
            }
          }
          else if($this.keybuffer == "$")
          {
            motions.endOfBlock((pos) => {
              helpers.putVisualCaretInPos(pos)
            })
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "c")
          {
            var {from, to} = $this.editor.selection
            actions.changeAction({
              left: from,
              right: to,
            })
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "d")
          {
            var {from, to} = $this.editor.selection
            actions.deleteAction({
              left: from,
              right: to,
            })
            helpers.resetKeybuffer()
            $this.vimMode = 'Normal'
          }
          else if($this.keybuffer == "y")
          {
            var {from, to} = $this.editor.selection
            actions.yankAction({
              left: from,
              right: to,
            })
            helpers.resetKeybuffer()
            helpers.toNormalMode()
            $this.vimMode = 'Normal'
          }
          else if($this.keybuffer == "x")
          {
            var {from, to} = $this.editor.selection
            actions.deleteAction({
              left: from,
              right: to,
            })
            helpers.resetKeybuffer()
            $this.vimMode = 'Normal'
          }
          else if($this.keybuffer == ",b")
          {
            $this.editable = true
            $this.editor.setOptions({
              editable: $this.editable,
            })
            var result = $this.editor.commands.bold()
            console.log(result)
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
            $this.editable = false
            $this.editor.setOptions({
              editable: $this.editable,
            })
          }
          else if($this.keybuffer == "f")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharRightOfCursor($this.keybuffer, (pos) => {
                  helpers.putVisualCaretInPos(pos+1)
                })
                helpers.resetKeybuffer()
                $this.vimMode = "Visual"
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "F")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharLeftOfCursor($this.keybuffer, (pos) => {
                  helpers.putVisualCaretInPos(pos)
                })
                helpers.resetKeybuffer()
                $this.vimMode = "Visual"
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "t")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharRightOfCursor($this.keybuffer, (pos) => {
                  helpers.putVisualCaretInPos(pos)
                })
                $this.vimMode = "Visual"
                helpers.resetKeybuffer()
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "T")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                motions.getPosOfCharLeftOfCursor($this.keybuffer, (pos) => {
                  helpers.putVisualCaretInPos(pos+1)
                })
                $this.vimMode = "Visual"
                helpers.resetKeybuffer()
              }
            }
            helpers.resetKeybuffer()
          }
          else if($this.keybuffer == "'")
          {
            var {from, to} = $this.editor.selection
            var {size} = $this.editor.view.state.doc.content
            $this.vimMode = 'Operator Pending'
            $this.handleOperatorPending = (event) => {
              if ($this.keybuffer) {
                helpers.getPosOfJumpMark($this.keybuffer, (pos) => {
                  helpers.putVisualCaretInPos(pos+1)
                })
                helpers.resetKeybuffer()
                $this.vimMode = "Visual"
              }
            }
            event.preventDefault()
            event.stopPropagation()
            helpers.resetKeybuffer()
          }
        }
        else if ($this.vimMode == "Operator Pending") {
          if ($this.handleOperatorPending) {
            $this.handleOperatorPending(event)
          }
          else {
            helpers.resetKeybuffer()
            $this.vimMode = "Normal"
            helpers.toNormalMode()
          }
        }
      }
    },
  }
}

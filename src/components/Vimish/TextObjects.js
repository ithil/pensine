import Helpers from '@/components/Vimish/Helpers.js'
import Motions from '@/components/Vimish/Motions.js'

export default ($this, $window) => {
  const helpers = Helpers($this, $window)
  const motions = Motions($this, $window)
  return {
    aParagraph() { // Text Object
      var pos = {left: undefined, right: undefined}
      var {from, to} = $this.editor.selection
      var resolvedPos = $this.editor.state.doc.resolve(from)
      pos.left = resolvedPos.before()
      pos.right = resolvedPos.after()
      return pos
    },
    innerParagraph() { // Text Object
      var pos = {left: undefined, right: undefined}
      var {from, to} = $this.editor.selection
      var resolvedPos = $this.editor.state.doc.resolve(from)
      pos.left = resolvedPos.start()
      pos.right = resolvedPos.end()
      return pos
    },
    aLine() { // Text Object
      var pos = {left: undefined, right: undefined}
      motions.findPrevLineBreak((leftPos) => {
        if (leftPos) {
          motions.findNextLineBreak((rightPos) => {
            pos.left = Math.max(1, leftPos - 1)
            pos.right = rightPos
          }, true)
        }
      }, true)
      return pos
    },
    innerLine() { // Text Object
      var pos = {left: undefined, right: undefined}
      motions.findPrevLineBreak((leftPos) => {
        if (leftPos) {
          motions.findNextLineBreak((rightPos) => {
            pos.left = leftPos
            pos.right = rightPos
          }, true)
        }
      }, true)
      return pos
    },
    aSentence() { // Text Object
      var pos = {left: undefined, right: undefined}
      motions.getPosOfPatternLeftOfCursor(/(?<=(^|[.?!]\s+))([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (leftPos) => {
        if (leftPos) {
          motions.getPosOfPatternRightOfCursor(/(?<=(^|[.?!]\s+))([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (rightPos) => {
            if (rightPos) {
              pos.left = leftPos
              pos.right = rightPos
            }
          }, false)
        }
      }, true)
      return pos
    },
    innerSentence() { // Text Object
      var pos = {left: undefined, right: undefined}
      motions.getPosOfPatternLeftOfCursor(/(?<=(^|[.?!]\s+))([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (leftPos) => {
        if (leftPos) {
          motions.getPosOfPatternRightOfCursor(/(^|[.?!]\s+)([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (rightPos) => {
            if (rightPos) {
              pos.left = leftPos
              pos.right = rightPos
            }
          }, false)
        }
      }, true)
      return pos
    },
    innerWord() { // Text Object
      var pos = {left: undefined, right: undefined}
      motions.getPosOfPatternLeftOfCursor(/([^\w]|^)(\w)/g, 2, (leftPos) => {
        if (leftPos) {
          motions.getPosOfPatternRightOfCursor(/(\w)([^\w]|$)/g, 2, (rightPos) => {
            if (rightPos) {
              pos.left = leftPos
              pos.right = rightPos
            }
          }, true)
        }
      }, true)
      return pos
    },
    innerDoubleQuote() { // Text Object
      motions.getPosOfCharLeftOfCursor('"', (leftPos) => {
        if (leftPos) {
          motions.getPosOfCharRightOfCursor('"', (rightPos) => {
            if (rightPos) {
              return helpers.createSelectionRange(
                leftPos+1,
                rightPos
              )
            }
          })
        }
      })
    },
    innerAnyQuote() { // Text Object
      var quoteStarts = ['"', "'", "„", "“", "«"]
      var quoteEnds   = ['"', "'", "“", "”", "»"]
      var pairs = []
      var {from, to} = $this.editor.selection
      for (var i in quoteStarts) {
        var pos = []
        motions.getPosOfCharLeftOfCursor(quoteStarts[i], (leftPos) => {
            motions.getPosOfCharRightOfCursor(quoteEnds[i], (rightPos) => {
                pos.push(leftPos+1)
                pos.push(rightPos)
            })
        })
        pairs.push(pos)
      }
      var bestDiff = 100000000
      var index = undefined
      for (var i in pairs) {
        if (Math.abs(pairs[i][0]-pairs[i][1]) < bestDiff) {
          index = i
          bestDiff = Math.abs(pairs[i][0]-pairs[i][1])
        }
      }
      return helpers.createSelectionRange(
        pairs[index][0],
        pairs[index][1]
      )
    },
    anItem() { // Text Object
      var pos = {left: undefined, right: undefined}
      var {from, to} = $this.editor.selection
      var resolvedPos = $this.editor.state.doc.resolve(from)
      var depth = resolvedPos.depth
      console.log(`Depth: ${depth}`)
      var parentBeforePos = resolvedPos.before(Math.max(1, depth-1))
      var parentParentBeforePos = resolvedPos.before(Math.max(1, depth-2))
      var parentAfterPos = resolvedPos.after(Math.max(1, depth-1))
      var parentParentAfterPos = resolvedPos.after(Math.max(1, depth-2))
      if ((parentBeforePos - 1 == parentParentBeforePos) && (parentAfterPos + 1 == parentParentAfterPos)) {
        pos = {
          left: parentParentBeforePos,
          right: parentParentAfterPos,
        }
      }
      else {
        pos = {
          left: parentBeforePos,
          right: parentAfterPos,
        }
      }
      return pos
    },
    innerItem() { // Text Object
      var pos = {left: undefined, right: undefined}
      var {from, to} = $this.editor.selection
      var resolvedPos = $this.editor.state.doc.resolve(from)
      var depth = resolvedPos.depth
      pos = {
        left: resolvedPos.start(Math.max(1, depth)),
        right: resolvedPos.end(Math.max(1, depth))
      }
      return pos
    },
  }
}

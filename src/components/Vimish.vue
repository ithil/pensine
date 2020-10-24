<template>
  <div>
    <editor-menu-bar :editor="editor" v-slot="{ commands, isActive }" id="vimishStatusBar">
      <div>
        <span class="statusBarVimMode" :class="'statusBarVimMode-'+vimMode.replace(/ /g, '_')">{{vimMode}}</span>
        <span class="checkbox">
          <input type="checkbox" id="editable" v-model="editable" />
          <label for="editable" style="color:white;">editable</label>
        </span>
        <span id="keybuffer">{{fullKeybuffer}}</span>
      </div>
    </editor-menu-bar>
    <div @click="getSelectionPosition()" @keydown="keymonitor" ref="editorContainer" :class="'mode-'+vimMode" tabindex="5">
      <editor-content :editor="editor" class="editor editor__content"/>
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent, EditorMenuBar } from 'tiptap'
import {
  Blockquote,
  CodeBlock,
  HardBreak,
  Heading,
  OrderedList,
  BulletList,
  ListItem,
  TodoItem,
  TodoList,
  Bold,
  Code,
  Italic,
  Link,
  Strike,
  Underline,
  History,
  Table,
  TableHeader,
  TableCell,
  TableRow,
  TrailingNode,
  Image,
  HorizontalRule,
} from 'tiptap-extensions'
import * as prosemirrorModel from 'prosemirror-model'
import {
  liftListItem,
  sinkListItem,
  splitListItem,
  wrapInList,
} from "prosemirror-schema-list"
import {InputRule} from 'prosemirror-inputrules'
import {TextSelection} from 'prosemirror-state'
import JumpMark from './VimishExtensions/JumpMark.js'
import fs from 'fs'
import cheerio from 'cheerio'
import MarkdownIt from 'markdown-it'
import TurndownService from 'turndown'
import { bus } from '../main'

var turndownPluginGfm = require('joplin-turndown-plugin-gfm')
var mdTodoLists = require('./markdown-it-extensions/todo-lists.js')

export default {
  name: 'Vimish',
  components: {
    EditorMenuBar,
    EditorContent,
  },
  data() {
    var $this = this
    return {
      editorOptions: {
        editable: false,
        extensions: [
          new Blockquote(),
          new CodeBlock(),
          new HardBreak(),
          new Heading({ levels: [1, 2, 3] }),
          new BulletList(),
          new OrderedList(),
          new ListItem(),
          new TodoItem(),
          new TodoList({nested: true}),
          new Bold(),
          new Code(),
          new Italic(),
          new Link(),
          new Strike(),
          new Underline(),
          new History(),
          new Table({
            resizable: true,
          }),
          new TableHeader(),
          new TableCell(),
          new TableRow(),
          new TrailingNode({
            node: 'paragraph',
            notAfter: ['paragraph'],
          }),
          new Image(),
          new HorizontalRule(),
          new JumpMark(),
        ],
        content: ' ',
      onInit({view, state}) {
        this.inputRules.push(new InputRule(/[^:]\($/, (state, match, start, end) => {
          var tr = state.tr.insertText('()', end, end)
          var newPos = tr.doc.resolve(end+1)
          tr = tr.setSelection(new TextSelection(newPos))
          return tr
        }))
        this.inputRules.push(new InputRule(/"$/, (state, match, start, end) => {
          var tr = state.tr.insertText('""', end, end)
          var newPos = tr.doc.resolve(end+1)
          tr = tr.setSelection(new TextSelection(newPos))
          return tr
        }))
      },
      },
      // editor: new Editor(this.editorOptions),
      editor: null,
      editable: false,
      onUpdate(e) {
        if (!$this.editor.editable) {
          $this.getSelectionPosition()
        }
      },
      fullKeybuffer: '',
      keybuffer: '',
      keybufferCount: null,
      keybufferRegister: null,
      vimMode: 'Normal',
      anchor: null,
      handleOperatorPending: null,
      textRegister: {
        set(register, content) {
          register = register || '0'
          if (register == '0') {
            this.registers['0'] = content
          }
          else {
            this.registers[register] = content
          }
        },
        get(register) {
          register = register || '0'
          return this.registers[register]
        },
        registers: {}
      },
      turndownService: new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        codeBlockStyle: 'fenced',
      }),
    }
  },
  methods: {
    saveNote() {
      var currentNote = this.$store.state.currentNote
      var html = this.editor.getHTML()
      var markdown = this.turndownService.turndown(html)
      console.log(markdown)
      currentNote.setContent(markdown)
    },
    getSelectionPosition() {
      var selection = window.getSelection();
      if (selection.type == "Caret" && !this.editable) {
        this.vimMode = "Normal"
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
      else if (selection.type == "Range" && !this.editable) {
        this.vimMode = "Visual"
      }
    },
    putCaretInPos(pos) {
      this.editor.setSelection(pos, pos+1)
      if (!this.editor.focused) {
        this.editor.focus()
      }
      this.scrollCursorIntoView()
    },
    toInsertMode() {
      var {from, to} = this.editor.selection
      if (!this.editor.focused) {
        this.editor.focus()
      }
      this.editor.setSelection(from, from)
    },
    toInsertModeAppend() {
      var {from, to} = this.editor.selection
      if (!this.editor.focused) {
        this.editor.focus()
      }
      this.editor.setSelection(to, to)
    },
    toNormalMode() {
      var {from, to} = this.editor.selection
      this.findValidCaretPos()
    },
    resetKeybuffer() {
      this.fullKeybuffer = ''
      this.keybuffer = ''
      this.keybufferCount = null
      this.keybufferRegister = null
    },
    putVisualCaretInPos(pos) {
      var {from, to} = this.editor.selection
      var anchor = this.anchor
      if (pos < anchor) {
        this.editor.setSelection(pos, anchor+1)
      }
      else if (pos > anchor) {
        this.editor.setSelection(anchor, pos)
      }
      else if (pos == anchor) {
        if (from == anchor) {
          this.editor.setSelection(pos-1, anchor+1)
        }
        else {
          this.editor.setSelection(pos, pos+1)
        }
      }
      this.scrollCursorIntoView()
    },
    getSelectionHead() {
      var {from, to} = this.editor.selection
      var anchor = this.anchor
      if (this.vimMode == 'Visual') {
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
    setSelectionRange(pos) {
      if (pos && pos.left && pos.right) {
        this.editor.setSelection(pos.left, pos.right)
        this.vimMode = "Visual"
        this.anchor = pos.left
      }
    },
    scrollCursorIntoView() {
      this.editor.dispatchTransaction(this.editor.state.tr.scrollIntoView())
    },
    scrollCursorToTop() {
      var {from, to} = this.editor.selection
      var {top, left} = this.editor.view.coordsAtPos(from)
      window.scrollTo(left, top)
      console.log(top)
    },
    findValidCaretPos(offset, dir, cb) {
      dir = dir || 1
      offset = offset || 0
      var from = this.editor.selection.from
      var to = this.editor.selection.to
      var {size} = this.editor.view.state.doc.content
      var $succeeded = false
      var pos = from + offset
      while (!$succeeded && (dir < 0 ? pos > -1 : pos < size - 2)) {
        let resolvedPos = this.editor.state.doc.resolve(pos)
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
    moveCursorLeft() {
      var from = this.editor.selection.from
      var to = this.editor.selection.to
      var $succeeded = false
      var pos = from - 1
      while (!$succeeded && pos > -1) {
        let resolvedPos = this.editor.state.doc.resolve(pos)
        let index = resolvedPos.index()
        let node = resolvedPos.node().nodeAt(index)
        let start = resolvedPos.start()
        let end = resolvedPos.end()
        let depth = resolvedPos.depth
        if (node && depth && ['text', 'image'].includes(node.type.name) && pos >= start && pos <= end-1) {
          this.putCaretInPos(pos)
          $succeeded = true
        }
        pos -= 1
      }
    },
    moveCursorRight() {
      var from = this.editor.selection.from
      var to = this.editor.selection.to
      var {size} = this.editor.view.state.doc.content
      var $succeeded = false
      var pos = from + 1
      while (!$succeeded && pos < size) {
        let resolvedPos = this.editor.state.doc.resolve(pos)
        let index = resolvedPos.index()
        let node = resolvedPos.node().nodeAt(index)
        let start = resolvedPos.start()
        let end = resolvedPos.end()
        let depth = resolvedPos.depth
        if (node && depth && ['text', 'image'].includes(node.type.name) && pos >= start && pos <= end-1) {
          this.putCaretInPos(pos)
          $succeeded = true
        }
        pos += 1
      }
    },
    changeAction(pos) {
      if (pos && pos.left && pos.right) {
        this.putCaretInPos(pos.left)
        var slice = this.editor.state.doc.slice(pos.left, pos.right)
        this.textRegister.set(this.keybufferRegister || '0', slice)
        var tr = this.editor.state.tr.delete(pos.left, pos.right)
        this.editor.dispatchTransaction(tr)
        this.editable = true
        this.toInsertMode()
      }
    },
    deleteAction(pos) {
      if (pos && pos.left > -1 && pos.right > -1) {
        this.putCaretInPos(pos.left)
        var slice = this.editor.state.doc.slice(pos.left, pos.right)
        this.textRegister.set(this.keybufferRegister || '0', slice)
        var tr = this.editor.state.tr.delete(pos.left, pos.right)
        this.editor.dispatchTransaction(tr)
      }
      this.putCaretInPos(this.editor.selection.from)
      // Maybe put another putCaretInPos here, because obviously the cursor is turned into a |
    },
    paste(before) {
      var {from, to} = this.editor.selection
      var resolvedPos = this.editor.state.doc.resolve(from)
      var pos = before ? resolvedPos.before() : resolvedPos.after()
      var slice = this.textRegister.get(this.keybufferRegister || '0')
      if (slice) {
        var tr = this.editor.state.tr.insert(pos, slice.content)
        this.editor.dispatchTransaction(tr)
      }
    },
    yankAction(pos) {
      if (pos && pos.left > -1 && pos.right > -1) {
        var slice = this.editor.state.doc.slice(pos.left, pos.right)
        this.textRegister.set(this.keybufferRegister || '0', slice)
      }
    },
    moveToTop(cb) {
      if (cb) {
        cb(1)
      }
      else {
        this.putCaretInPos(1)
      }
    },
    moveToEnd(cb) {
      var {size} = this.editor.view.state.doc.content
      if (cb) {
        cb(size-2)
      }
      else {
        this.putCaretInPos(size-2)
      }
    },
    getPosOfCharRightOfCursor(char, cb) {
      var $editor = this.editor
      var {size} = $editor.view.state.doc.content
      var from = $editor.selection.from
      var to = $editor.selection.to
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
              this.putCaretInPos(pos+myIndex)
            }
            $succeeded = true
            return false
          }
        }
      })
    },
    getPosOfCharLeftOfCursor(char, cb) {
      var $editor = this.editor
      var {size} = $editor.view.state.doc.content
      var from = $editor.selection.from
      var to = $editor.selection.to
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
          this.putCaretInPos(myPos)
        }
      }
    },
    innerDoubleQuote() {
      var pos = {left: undefined, right: undefined}
      this.getPosOfCharLeftOfCursor('"', (leftPos) => {
        if (leftPos) {
          this.getPosOfCharRightOfCursor('"', (rightPos) => {
            if (rightPos) {
              pos.left = leftPos+1
              pos.right = rightPos
            }
          })
        }
      })
      return pos
    },
    innerAnyQuote() {
      var quoteStarts = ['"', "'", "„", "“", "«"]
      var quoteEnds   = ['"', "'", "“", "”", "»"]
      var pairs = []
      var {from, to} = this.editor.selection
      for (var i in quoteStarts) {
        var pos = []
        this.getPosOfCharLeftOfCursor(quoteStarts[i], (leftPos) => {
            this.getPosOfCharRightOfCursor(quoteEnds[i], (rightPos) => {
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
          console.log('Yah!')
          index = i
          bestDiff = Math.abs(pairs[i][0]-pairs[i][1])
        }
      }
      return {
        left: pairs[index][0],
        right: pairs[index][1],
      }
      // console.log(from)
      // console.log(pairs)
      // console.log(pairs[index])
    },
    moveLineDown() {
      var $editor = this.editor
      var {size} = $editor.view.state.doc.content
      var from = $editor.selection.from
      var to = $editor.selection.to
      var $succeeded = false
      $editor.state.doc.nodesBetween(to, size, (node, pos, parent, index) => {
        if (!$succeeded) {
          if (pos > to && ['paragraph', 'hard_break', 'heading'].includes(node.type.name)) {
            this.putCaretInPos(pos+1)
            $succeeded = true
            return false
          }
        }
      })
    },
    moveLineUp() {
      var $editor = this.editor
      var {size} = $editor.view.state.doc.content
      var from = $editor.selection.from
      var to = $editor.selection.to
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
        this.putCaretInPos(myPos)
      }
    },
    findNextLineBreak(cb, includeCursorPosition) {
      var {size} = this.editor.view.state.doc.content
      var {from, to} = this.editor.selection
      var $succeeded = false
      if (includeCursorPosition) {
        to -= 1
      }
      this.editor.state.doc.nodesBetween(to, size, (node, pos, parent, index) => {
        if (!$succeeded) {
          if (pos > to && ['paragraph', 'hard_break', 'heading'].includes(node.type.name)) {
            cb(pos)
            $succeeded = true
            return false
          }
        }
      })
    },
    findPrevLineBreak(cb, includeCursorPosition) {
      var {size} = this.editor.view.state.doc.content
      var {from, to} = this.editor.selection
      var myPos = null
      var $succeeded = false
      if (includeCursorPosition) {
        from += 1
      }
      this.editor.state.doc.nodesBetween(0, from, (node, pos, parent, index) => {
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
    innerLine() {
      var pos = {left: undefined, right: undefined}
      this.findPrevLineBreak((leftPos) => {
        if (leftPos) {
          this.findNextLineBreak((rightPos) => {
            pos.left = leftPos
            pos.right = rightPos
          }, true)
        }
      }, true)
      return pos
    },
    aLine() {
      var pos = {left: undefined, right: undefined}
      this.findPrevLineBreak((leftPos) => {
        if (leftPos) {
          this.findNextLineBreak((rightPos) => {
            pos.left = Math.max(1, leftPos - 1)
            pos.right = rightPos
          }, true)
        }
      }, true)
      return pos
    },
    getPosOfPatternRightOfCursor(pattern, mn, cb, includeCursorPosition) {
      function indexOfGroup(match, n) {
        var ix = match.index
        for (var i = 1; i < n; i++) {
          ix += match[i].length
        }
        return ix
      }
      var $editor = this.editor
      var {size} = $editor.view.state.doc.content
      var to = this.getSelectionHead()
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
    getPosOfPatternLeftOfCursor(pattern, mn, cb, includeCursorPosition) {
      function indexOfGroup(match, n) {
        var ix = match.index
        for (var i = 1; i < n; i++) {
          ix += match[i].length
        }
        return ix
      }
      var $editor = this.editor
      var {size} = $editor.view.state.doc.content
      var from = this.getSelectionHead() - 1
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
    moveCursorRightToPattern(pattern, mn) {
      this.getPosOfPatternRightOfCursor(pattern, mn, (pos) => {
        if (pos) {
          this.putCaretInPos(pos)
        }
      })
    },
    moveCursorLeftToPattern(pattern, mn) {
      this.getPosOfPatternLeftOfCursor(pattern, mn, (pos) => {
        if (pos) {
          this.putCaretInPos(pos)
        }
      })
    },
    newLine(before) {
      var schema = this.editor.schema
      var F = prosemirrorModel.Fragment
      console.log(F.empty)
      var {from, to} = this.editor.selection
      var resolvedPos = this.editor.state.doc.resolve(from)
      var depth = resolvedPos.depth
      var newNode = resolvedPos.node(Math.max(1, depth-1)).copy(F.empty.append(F.from(
        schema.text(' ')
      )))
      console.log(newNode.type.name)
      if (newNode.type.name == 'list_item') {
        // newNode = schema.node('list_item', {}, schema.node('paragraph', {}, F.empty.append(F.from(schema.text(' ')))))
        if (before) {
          var pos = resolvedPos.start()
          this.editor.setSelection(pos, pos)
        }
        else {
          var pos = resolvedPos.end()
          this.editor.setSelection(pos, pos)
          pos += 1
        }
        splitListItem(schema.nodes.list_item)(this.editor.state, this.editor.dispatchTransaction.bind(this.editor))
      }
      else {
        var pos = before ? resolvedPos.before(depth) : resolvedPos.after(depth)
        var tr = this.editor.state.tr.insert(pos, newNode)
        console.log(tr)
        this.editor.dispatchTransaction(tr)
      }
      this.putCaretInPos(pos+1)
      // this.findValidCaretPos(0, before ? -1 : 1)
      this.editable = true
      this.toInsertMode()
    },
    newJumpMark(name) {
      var schema = this.editor.schema
      var {from, to} = this.editor.selection
      var {size} = this.editor.view.state.doc.content
      var tr
      this.editor.state.doc.nodesBetween(0, size, (node, pos, parent, index) => {
          if (node.type.name == 'jump_mark') {
            if (node.attrs.name == name) {
              tr = this.editor.state.tr.delete(pos, pos+node.nodeSize)
              return false
            }
          }
      })
      var resolvedPos = this.editor.state.doc.resolve(from)
      var newJM = schema.node('jump_mark', {name: name})
      if (tr) {
        tr.insert(from, newJM)
      }
      else {
        tr = this.editor.state.tr.insert(from, newJM)
      }
      this.editor.dispatchTransaction(tr)
    },
    aSentence() {
      var pos = {left: undefined, right: undefined}
      this.getPosOfPatternLeftOfCursor(/(?<=(^|[.?!]\s+))([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (leftPos) => {
        if (leftPos) {
          this.getPosOfPatternRightOfCursor(/(?<=(^|[.?!]\s+))([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (rightPos) => {
            if (rightPos) {
              pos.left = leftPos
              pos.right = rightPos
            }
          }, false)
        }
      }, true)
      return pos
    },
    innerSentence() {
      var pos = {left: undefined, right: undefined}
      this.getPosOfPatternLeftOfCursor(/(?<=(^|[.?!]\s+))([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (leftPos) => {
        if (leftPos) {
          this.getPosOfPatternRightOfCursor(/(^|[.?!]\s+)([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (rightPos) => {
            if (rightPos) {
              pos.left = leftPos
              pos.right = rightPos
            }
          }, false)
        }
      }, true)
      return pos
    },
    innerWord() {
      var pos = {left: undefined, right: undefined}
      this.getPosOfPatternLeftOfCursor(/([^\w]|^)(\w)/g, 2, (leftPos) => {
        if (leftPos) {
          this.getPosOfPatternRightOfCursor(/(\w)([^\w]|$)/g, 2, (rightPos) => {
            if (rightPos) {
              pos.left = leftPos
              pos.right = rightPos
            }
          }, true)
        }
      }, true)
      return pos
    },
    positionOfNextNodeOfType(from, to, type, cb) {
      var $editor = this.editor
      var $succeeded = false
      $editor.state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
        if (!$succeeded) {
          if (pos > from && node.type.name == type) {
            cb(pos)
            $succeeded = true
            return false
          }
        }
      })
    },
    positionOfPrevNodeOfType(from, to, type, cb) {
      var $editor = this.editor
      var foundPos = undefined
      $editor.state.doc.nodesBetween(from, to, (node, pos, parent, index) => {
        console.log(pos+node.nodeSize)
        console.log(to)
        console.log(node.type.name)
          if (pos < to && pos + node.nodeSize < to && node.type.name == type) {
            foundPos = pos
          }
      })
      cb(foundPos)
    },
    getPosOfJumpMark(name, cb) {
      var $succeeded = false
      var {from, to} = this.editor.selection
      var {size} = this.editor.view.state.doc.content
      this.editor.state.doc.nodesBetween(0, size, (node, pos, parent, index) => {
          if (node.type.name == 'jump_mark') {
            if (node.attrs.name == name) {
              cb(pos)
              return false
            }
          }
      })
    },
    startOfBlock(cb) {
      var {size} = this.editor.view.state.doc.content
      var {from, to} = this.editor.selection
      var resolvedPos = this.editor.state.doc.resolve(from)
      if (cb) {
        cb(resolvedPos.start())
      }
      else {
        this.putCaretInPos(resolvedPos.start())
      }
    },
    endOfBlock(cb) {
      var {size} = this.editor.view.state.doc.content
      var {from, to} = this.editor.selection
      var resolvedPos = this.editor.state.doc.resolve(from)
      if (cb) {
        cb(resolvedPos.end())
      }
      else {
        this.putCaretInPos(resolvedPos.end()-1)
      }
    },
    innerParagraph() {
      var pos = {left: undefined, right: undefined}
      var {from, to} = this.editor.selection
      var resolvedPos = this.editor.state.doc.resolve(from)
      pos.left = resolvedPos.start()
      pos.right = resolvedPos.end()
      return pos
    },
    aParagraph() {
      var pos = {left: undefined, right: undefined}
      var {from, to} = this.editor.selection
      var resolvedPos = this.editor.state.doc.resolve(from)
      pos.left = resolvedPos.before()
      pos.right = resolvedPos.after()
      return pos
    },
    delChar() {
      var selection = this.editor.selection
      var state = this.editor.state
      var transaction = state.tr.deleteSelection()
      this.editor.view.dispatch(transaction)
    },
    anItem() {
      var pos = {left: undefined, right: undefined}
      var {from, to} = this.editor.selection
      var resolvedPos = this.editor.state.doc.resolve(from)
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
    innerItem() {
      var pos = {left: undefined, right: undefined}
      var {from, to} = this.editor.selection
      var resolvedPos = this.editor.state.doc.resolve(from)
      var depth = resolvedPos.depth
      pos = {
        left: resolvedPos.start(Math.max(1, depth)),
        right: resolvedPos.end(Math.max(1, depth))
      }
      return pos
    },
    logEditorObj() {
      console.log(this.editor)
      // console.log(this.editor.state)
      // console.log(this.editor.state.selection.$from)
      // console.log(this.editor.state.selection.$to)
    },
    keymonitor(event) {
      if (event.key === "Escape") {
        this.toNormalMode()
        this.vimMode = "Normal"
        this.editable = false
        this.resetKeybuffer()
      }
      if (event.metaKey && event.key == 's') {
        this.saveNote()
      }
      if (!this.editable) {
        if (event.key.length == 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
          this.fullKeybuffer += event.key
          var match = this.fullKeybuffer.match(/(\d+)?("([a-zA-Z0-9+]))?(.+)/)
          this.keybufferCount = match[1]
          this.keybufferRegister = match[3]
          this.keybuffer = match[4]
        }
        if (this.vimMode == "Normal") {
          if(this.keybuffer == "i")
          {
            this.editable = true
            event.preventDefault()
            event.stopPropagation()
            this.toInsertMode()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "I")
          {
            this.editable = true
            event.preventDefault()
            event.stopPropagation()
            this.startOfBlock()
            this.toInsertMode()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "a")
          {
            this.editable = true
            event.preventDefault()
            event.stopPropagation()
            this.toInsertModeAppend()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "A")
          {
            this.editable = true
            event.preventDefault()
            event.stopPropagation()
            this.endOfBlock()
            this.toInsertModeAppend()
            this.resetKeybuffer()
          }
          else if (event.key == 'Tab' && event.shiftKey) {
            var schema = this.editor.schema
            liftListItem(schema.nodes.list_item)(this.editor.state, this.editor.dispatchTransaction.bind(this.editor))
            event.preventDefault()
            event.stopPropagation()
          }
          else if (event.key == 'Tab') {
            var {from, to} = this.editor.selection
            var resolvedPos = this.editor.state.doc.resolve(from)
            var nodeType = resolvedPos.node(-1).type.name
            var schema = this.editor.schema
            if (nodeType == 'list_item') {
              sinkListItem(schema.nodes.list_item)(this.editor.state, this.editor.dispatchTransaction.bind(this.editor))
            }
            else {
              wrapInList(schema.nodes.list_item)(this.editor.state, this.editor.dispatchTransaction.bind(this.editor))
            }
            event.preventDefault()
            event.stopPropagation()
          }
          else if(this.keybuffer == "h")
          {
            this.moveCursorLeft()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "l")
          {
            this.moveCursorRight()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "j")
          {
            this.moveLineDown()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "k")
          {
            this.moveLineUp()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "G")
          {
            this.moveToEnd()
            // this.findValidCaretPos(0, -1)
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "gg")
          {
            this.moveToTop()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "o")
          {
            this.newLine()
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "O")
          {
            this.newLine(true)
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "zt")
          {
            this.scrollCursorToTop()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "t")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.positionOfNextNodeOfType(to, size, 'text', (pos) => {
              this.putCaretInPos(pos)
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "T")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.positionOfPrevNodeOfType(0, from, 'text', (pos) => {
              if (pos) {
                this.putCaretInPos(pos)
              }
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == ")")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.positionOfNextNodeOfType(to, size, 'heading', (pos) => {
              if (pos > -1) {
                this.putCaretInPos(pos+1)
              }
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "(")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.positionOfPrevNodeOfType(0, from, 'heading', (pos) => {
              if (pos > -1) {
                this.putCaretInPos(pos+1)
              }
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "x")
          {
            this.delChar()
            this.getSelectionPosition()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "r")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                var tr = this.editor.state.tr.insertText(this.keybuffer)
                this.editor.dispatchTransaction(tr)
                this.resetKeybuffer()
                this.vimMode = "Normal"
                this.toNormalMode()
                this.putCaretInPos(from)
              }
              if (event.key == 'Enter') {
                var tr = this.editor.state.tr.insertText('\n')
                this.editor.dispatchTransaction(tr)
                this.resetKeybuffer()
                this.vimMode = "Normal"
                this.toNormalMode()
                this.putCaretInPos(from)
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "'")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfJumpMark(this.keybuffer, (pos) => {
                  this.putCaretInPos(pos+1)
                })
                this.resetKeybuffer()
                this.vimMode = "Normal"
                this.toNormalMode()
              }
            }
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "m")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.newJumpMark(this.keybuffer)
                this.resetKeybuffer()
                this.vimMode = "Normal"
                this.toNormalMode()
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == ",r")
          {
            var {from, to} = this.editor.selection
            var resolvedPos = this.editor.state.doc.resolve(from)
            console.log(resolvedPos)
            this.resetKeybuffer()
          }
          else if(this.keybuffer == ",l")
          {
            this.logEditorObj()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "u")
          {
            this.editable = true
            this.editor.setOptions({
              editable: this.editable,
            })
            var result = this.editor.commands.undo()
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
            this.editable = false
            this.editor.setOptions({
              editable: this.editable,
            })
            this.putCaretInPos(this.editor.selection.from)
          }
          else if(this.keybuffer == ",b")
          {
            this.editable = true
            this.editor.setOptions({
              editable: this.editable,
            })
            var result = this.editor.commands.bold()
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
            this.editable = false
            this.editor.setOptions({
              editable: this.editable,
            })
          }
          else if(this.keybuffer == "w")
          {
            this.getPosOfPatternRightOfCursor(/(?<![\w'])(\w+)/g, 1, (pos) => {
              if (pos) {
                this.putCaretInPos(pos)
              }
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "b")
          {
            this.moveCursorLeftToPattern(/(?<![\w'])(\w+)/g, 1)
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "e")
          {
            this.getPosOfPatternRightOfCursor(/(\w)(?![\w'])/g, 1, (pos) => {
              if (pos) {
                this.putCaretInPos(pos)
              }
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "s")
          {
            this.getPosOfPatternRightOfCursor(/(?<=(^|[.?!]\s+))([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (pos) => {
              if (pos) {
                this.putCaretInPos(pos)
              }
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "S")
          {
            this.getPosOfPatternLeftOfCursor(/(?<=(^|[.?!]\s+))([A-ZÄÖÜÅÉÈÇŒØÆ])([A-ZÄÖÜÅÉÈÇŒØÆa-zäöüßåéèçœøæ,;:\d ])*/g, 1, (pos) => {
              if (pos) {
                this.putCaretInPos(pos)
              }
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "dd")
          {
            this.deleteAction(this.anItem())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "dip")
          {
            this.deleteAction(this.innerParagraph())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "dap")
          {
            this.deleteAction(this.aParagraph())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "dil")
          {
            this.deleteAction(this.innerLine())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "das")
          {
            this.deleteAction(this.aSentence())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "df")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharRightOfCursor(this.keybuffer, (pos) => {
                  this.deleteAction({left: from, right: pos+1})
                })
                this.resetKeybuffer()
                this.vimMode = "Normal"
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "dF")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharLeftOfCursor(this.keybuffer, (pos) => {
                  this.deleteAction({left: pos, right: from})
                })
                this.resetKeybuffer()
                this.vimMode = "Normal"
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "dt")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharRightOfCursor(this.keybuffer, (pos) => {
                  this.deleteAction({left: from, right: pos})
                })
                this.resetKeybuffer()
                this.vimMode = "Normal"
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "dT")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharLeftOfCursor(this.keybuffer, (pos) => {
                  this.deleteAction({left: pos+1, right: from})
                })
                this.resetKeybuffer()
                this.vimMode = "Normal"
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "p")
          {
            this.paste()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "P")
          {
            this.paste(true)
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "yy")
          {
            this.yankAction(this.anItem())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == ",f")
          {
            var {from, to} = this.editor.selection
            console.log(`from: ${from}`)
            this.resetKeybuffer()
          }
          else if(this.keybuffer == ",t")
          {
            var {from, to} = this.editor.selection
            console.log(`to: ${to}`)
            this.resetKeybuffer()
          }
          else if(this.keybuffer == ",q")
          {
            this.innerAnyQuote()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "v")
          {
            var {from, to} = this.editor.selection
            this.anchor = from
            this.vimMode = "Visual"
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "cc")
          {
            this.changeAction(this.innerItem())
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "cw")
          {
            var {from, to} = this.editor.selection
            this.getPosOfPatternRightOfCursor(/([^\w'])/g, 1, (rightPos) => {
              if (rightPos) {
                this.changeAction({
                  left: from,
                  right: rightPos,
                })
              }
            })
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "ciw")
          {
            this.changeAction(this.innerWord())
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "cil")
          {
            this.changeAction(this.innerLine())
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "cis")
          {
            this.changeAction(this.innerSentence())
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "cas")
          {
            this.changeAction(this.aSentence())
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "cf")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharRightOfCursor(this.keybuffer, (pos) => {
                  this.changeAction({left: from, right: pos+1})
                })
                this.resetKeybuffer()
                event.preventDefault()
                event.stopPropagation()
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "cF")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharLeftOfCursor(this.keybuffer, (pos) => {
                  this.changeAction({left: pos, right: from})
                })
                this.resetKeybuffer()
                event.preventDefault()
                event.stopPropagation()
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "ct")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharRightOfCursor(this.keybuffer, (pos) => {
                  this.changeAction({left: from, right: pos})
                })
                this.resetKeybuffer()
                event.preventDefault()
                event.stopPropagation()
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "cT")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharLeftOfCursor(this.keybuffer, (pos) => {
                  this.changeAction({left: pos+1, right: from})
                })
                this.resetKeybuffer()
                event.preventDefault()
                event.stopPropagation()
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "0")
          {
            if (this.keybufferCount == null) {
              this.startOfBlock()
              this.resetKeybuffer()
            }
          }
          else if(this.keybuffer == "$")
          {
            this.endOfBlock()
            this.resetKeybuffer()
          }
        }
        else if (this.vimMode == "Visual") {
          if(this.keybuffer == "l")
          {
            var {from, to} = this.editor.selection
            this.putVisualCaretInPos(this.getSelectionHead()+1)
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "h")
          {
            var {from, to} = this.editor.selection
            this.putVisualCaretInPos(this.getSelectionHead()-1)
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "G")
          {
            this.moveToEnd((pos) => {
              this.putVisualCaretInPos(pos)
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "gg")
          {
            this.moveToTop((pos) => {
              this.putVisualCaretInPos(pos)
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "o")
          {
            var {from, to} = this.editor.selection
            var anchor = this.anchor
            if (anchor == from) {
              this.anchor = to-1
            }
            else if (anchor == to-1) {
              this.anchor = from
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "iw")
          {
            this.setSelectionRange(this.innerWord())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "il")
          {
            this.setSelectionRange(this.innerLine())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "al")
          {
            this.setSelectionRange(this.aLine())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == ",q")
          {
            this.setSelectionRange(this.innerAnyQuote())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "as")
          {
            this.setSelectionRange(this.aSentence())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "is")
          {
            this.setSelectionRange(this.innerSentence())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "iq")
          {
            this.setSelectionRange(this.innerAnyQuote())
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "w")
          {
            var count = this.keybufferCount || 1
            for (var i = 1; i <= count; i++) {
              this.getPosOfPatternRightOfCursor(/(?<![\w'])(\w+)/g, 1, (pos) => {
                if (pos) {
                  this.putVisualCaretInPos(pos)
                }
              })
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "b")
          {
            var count = this.keybufferCount || 1
            for (var i = 1; i <= count; i++) {
              this.getPosOfPatternLeftOfCursor(/(?<![\w'])(\w+)/g, 1, (pos) => {
                if (pos) {
                  this.putVisualCaretInPos(pos)
                }
              })
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "e")
          {
            this.getPosOfPatternRightOfCursor(/(\w)(?![\w'])/g, 1, (pos) => {
              if (pos) {
                this.putVisualCaretInPos(pos+1)
              }
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "0")
          {
            if (this.keybufferCount == null) {
              this.startOfBlock((pos) => {
                this.putVisualCaretInPos(pos)
              })
              this.resetKeybuffer()
            }
          }
          else if(this.keybuffer == "$")
          {
            this.endOfBlock((pos) => {
              this.putVisualCaretInPos(pos)
            })
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "c")
          {
            var {from, to} = this.editor.selection
            this.changeAction({
              left: from,
              right: to,
            })
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "d")
          {
            var {from, to} = this.editor.selection
            this.deleteAction({
              left: from,
              right: to,
            })
            this.resetKeybuffer()
            this.vimMode = 'Normal'
          }
          else if(this.keybuffer == "y")
          {
            var {from, to} = this.editor.selection
            this.yankAction({
              left: from,
              right: to,
            })
            this.resetKeybuffer()
            this.toNormalMode()
            this.vimMode = 'Normal'
          }
          else if(this.keybuffer == "x")
          {
            var {from, to} = this.editor.selection
            this.deleteAction({
              left: from,
              right: to,
            })
            this.resetKeybuffer()
            this.vimMode = 'Normal'
          }
          else if(this.keybuffer == ",b")
          {
            this.editable = true
            this.editor.setOptions({
              editable: this.editable,
            })
            var result = this.editor.commands.bold()
            console.log(result)
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
            this.editable = false
            this.editor.setOptions({
              editable: this.editable,
            })
          }
          else if(this.keybuffer == "f")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharRightOfCursor(this.keybuffer, (pos) => {
                  this.putVisualCaretInPos(pos+1)
                })
                this.resetKeybuffer()
                this.vimMode = "Visual"
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "F")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharLeftOfCursor(this.keybuffer, (pos) => {
                  this.putVisualCaretInPos(pos)
                })
                this.resetKeybuffer()
                this.vimMode = "Visual"
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "t")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharRightOfCursor(this.keybuffer, (pos) => {
                  this.putVisualCaretInPos(pos)
                })
                this.vimMode = "Visual"
                this.resetKeybuffer()
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "T")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfCharLeftOfCursor(this.keybuffer, (pos) => {
                  this.putVisualCaretInPos(pos+1)
                })
                this.vimMode = "Visual"
                this.resetKeybuffer()
              }
            }
            this.resetKeybuffer()
          }
          else if(this.keybuffer == "'")
          {
            var {from, to} = this.editor.selection
            var {size} = this.editor.view.state.doc.content
            this.vimMode = 'Operator Pending'
            this.handleOperatorPending = (event) => {
              if (this.keybuffer) {
                this.getPosOfJumpMark(this.keybuffer, (pos) => {
                  this.putVisualCaretInPos(pos+1)
                })
                this.resetKeybuffer()
                this.vimMode = "Visual"
              }
            }
            event.preventDefault()
            event.stopPropagation()
            this.resetKeybuffer()
          }
        }
        else if (this.vimMode == "Operator Pending") {
          if (this.handleOperatorPending) {
            this.handleOperatorPending(event)
          }
          else {
            this.resetKeybuffer()
            this.vimMode = "Normal"
            this.toNormalMode()
          }
        }
      }
    },
  },
  watch: {
    editable() {
      this.editor.setOptions({
        editable: this.editable,
      })
      if (this.editable) {
        // this.toInsertMode()
        this.vimMode = 'Insert'
      }
      else {
        this.vimMode = 'Normal'
        // this.getSelectionPosition()
      }
    },
  },
  mounted() {
    this.editor = new Editor(this.editorOptions)
    this.turndownService.use(turndownPluginGfm.gfm)
    this.turndownService.addRule('todoListItems', {
      filter: function (node) {
        return node.dataset.type === 'todo_item'
      },
      replacement: function (content, node) {
        return '* ' + (node.dataset.done == 'true' ? '[x]' : '[ ]') + ' ' + node.querySelector('p').innerHTML + '\n'
      }
    })
  },
  created () {
    var $this = this
    bus.$on('openFile', (filename) => {
      // console.log('And the filename is... ' + filename)
      fs.readFile(filename, 'utf8', (err, contents) => {
        if (err) {
          console.err('Couldnt open')
        } else {
          const $ch = cheerio.load(contents)
          // console.log($ch('body').html())
          $this.editor.setContent($ch('body').html())
        }
      })
    })
    bus.$on('openMarkdownFile', (filename) => {
      // console.log('And the filename is... ' + filename)
      fs.readFile(filename, 'utf8', (err, contents) => {
        if (err) {
          console.err('Couldnt open')
        } else {
          var md = new MarkdownIt()
          md.use(mdTodoLists)
          var result = md.render(contents)
          console.log(result)
          $this.editor.setContent(result)
        }
      })
    })
    bus.$on('openNote', (note) => {
      $this.$store.commit('setCurrentNote', note)
      console.log(note)
      fs.readFile(note.contentPath, 'utf8', (err, contents) => {
        if (err) {
          console.err('Couldnt open')
        } else {
          // $this.editor.destroy()
          // $this.editor = new Editor(this.editorOptions)
          var md = new MarkdownIt()
          md.use(mdTodoLists)
          var result = md.render(contents)
          console.log(result)
          $this.editor.view.updateState($this.editor.createState())
          $this.editor.setContent(result)
          $this.vimMode = "Normal"
          $this.editable = false
          $this.moveToTop()
          setTimeout(x => {
            $this.$refs.editorContainer.focus()
            $this.editor.focus()
          }, 100)
        }
      })
    })
    bus.$on('focusEditor', () => {
      $this.$refs.editorContainer.querySelector('.ProseMirror').focus()
      $this.moveToTop()
    })
  },
  beforeDestroy() {
    this.editor.destroy()
  },
}
</script>

<style lang="scss">
$color-black: #000000;
$color-white: #ffffff;
$color-grey: #dddddd;

::selection {
  color: black;
  background-color: #ffd97d;
  // outline: red solid 2px;
  // outline-width: 10px;
  // outline-style: solid;
  // outline-color: black;
}

.ProseMirror {
  outline: none;
}

div#vimishStatusBar {
  position: fixed;
  bottom: 0px;
  z-index: 3;
  background-color: #222527;
  width: 100%;
  padding: 3px;
}

#keybuffer {
  color: white;
}

.statusBarVimMode {
  padding: 3px;
  font-family: 'Lucida Grande';
  border-radius: 5px;
}

.statusBarVimMode-Normal {
  background-color: #2A774D;
  color: white;
}

.statusBarVimMode-Insert {
  background-color: #4F99D3;
  color: white;
}

.statusBarVimMode-Visual {
  background-color: #800058;
  color: white;
}
.statusBarVimMode-Operator_Pending {
  color: #b7a966;
}

.editor {
  position: relative;
  max-width: 30rem;
  margin: 0 auto 5rem auto;
  font-family: "Georgia";


  &__content {


    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;

    * {
      caret-color: currentColor;
    }

    pre {
      padding: 0.7rem 1rem;
      border-radius: 5px;
      background: $color-black;
      color: $color-white;
      font-size: 0.9rem;
      overflow-x: auto;

      code {
        display: block;
        font-family: 'Code New Roman';
      }
    }

    p code {
      padding: 0.2rem 0.4rem;
      border-radius: 5px;
      font-size: 0.8rem;
      font-weight: bold;
      background: rgba($color-black, 0.1);
      color: rgba($color-black, 0.8);
    }

    ul,
    ol {
      padding-left: 1rem;
    }

    li > p,
    li > ol,
    li > ul {
      margin: 0;
    }

    a {
      // color: inherit;
      color: cornflowerblue;
    }

    blockquote {
      border-left: 3px solid rgba($color-black, 0.1);
      color: rgba($color-black, 0.8);
      padding-left: 0.8rem;
      font-style: italic;

      p {
        margin: 0;
      }
    }

    img {
      max-width: 100%;
      border-radius: 3px;
    }

    table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
      margin: 0;
      overflow: hidden;

      td, th {
        min-width: 1em;
        border: 2px solid $color-grey;
        padding: 3px 5px;
        vertical-align: top;
        box-sizing: border-box;
        position: relative;
        > * {
          margin-bottom: 0;
        }
      }

      th {
        font-weight: bold;
        text-align: left;
      }

      .selectedCell:after {
        z-index: 2;
        position: absolute;
        content: "";
        left: 0; right: 0; top: 0; bottom: 0;
        background: rgba(200, 200, 255, 0.4);
        pointer-events: none;
      }

      .column-resize-handle {
        position: absolute;
        right: -2px; top: 0; bottom: 0;
        width: 4px;
        z-index: 20;
        background-color: #adf;
        pointer-events: none;
      }
    }

    .tableWrapper {
      margin: 1em 0;
      overflow-x: auto;
    }

    .resize-cursor {
      cursor: ew-resize;
      cursor: col-resize;
    }

  }
}
ul[data-type="todo_list"] {
  padding-left: 0;
}
li[data-type="todo_item"] {
  display: flex;
  flex-direction: row;
}
.todo-checkbox {
  border: 2px solid $color-black;
  height: 0.9em;
  width: 0.9em;
  box-sizing: border-box;
  margin-right: 10px;
  margin-top: 0.3rem;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  border-radius: 0.2em;
  background-color: transparent;
  transition: 0.4s background;
}
.todo-content {
  flex: 1;
  > p:last-of-type {
    margin-bottom: 0;
  }
  > ul[data-type="todo_list"] {
    margin: .5rem 0;
  }
}
li[data-done="true"] {
  > .todo-content {
    > p {
      text-decoration: line-through;
    }
  }
  > .todo-checkbox {
    background-color: $color-black;
  }
}
li[data-done="false"] {
  text-decoration: none;
}
blockquote:first-child, h1:first-child, h2:first-child, h3:first-child, ol:first-child, p:first-child, pre:first-child, ul:first-child {
    margin-top: 0;
}
</style>

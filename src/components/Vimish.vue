<template>
  <div>
    <div @click="helpers.getSelectionPosition()" @keydown="keymonitor" ref="editorContainer" :class="'mode-'+vimMode" tabindex="5">
      <editor-content :editor="editor" class="editor editor__content"/>
    </div>
    <div>
      <portal to="statusBarRight" :order="1" v-if="portalActive">
        <span class="keybuffer">{{fullKeybuffer}}</span>
        <span v-if="hasChanged">Has changed!</span>
        <span class="checkbox">
          <input type="checkbox" id="editable" v-model="editable" />
          <label for="editable" style="color:white;">editable</label>
        </span>
        <span class="statusBarVimMode" :class="'statusBarVimMode-'+vimMode.replace(/ /g, '_')">{{vimMode}}</span>
      </portal>
    </div>
  </div>
  <modal ref="editLink">
    <template v-slot:header>
    </template>

    <template v-slot:body>
      <input
      type="text"
      class="modal__input"
      v-model="linkURL"
      ref="linkURLinput"
      placeholder="URL"
      @keydown.enter="changeLink"
      >
      <input
      type="text"
      class="modal__input"
      v-model="linkLabel"
      ref="linkLabelinput"
      placeholder="Label"
      @keydown.enter="changeLink"
      >
    </template>

    <template v-slot:footer>
      <div>
      </div>
    </template>
  </modal>
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
import {InputRule} from 'prosemirror-inputrules'
import {TextSelection, Selection} from 'prosemirror-state'
import JumpMark from './VimishExtensions/JumpMark.js'
import fs from 'fs'
import cheerio from 'cheerio'
import MarkdownIt from 'markdown-it'
import TurndownService from 'turndown'
import { bus } from '../main'
import TextPrompt from '@/components/TextPrompt.vue'
import Modal from '@/components/Modal.vue'

import Helpers from '@/components/Vimish/Helpers.js'
import Actions from '@/components/Vimish/Actions.js'
import Motions from '@/components/Vimish/Motions.js'
import TextObjects from '@/components/Vimish/TextObjects.js'
import Keybinds from '@/components/Vimish/Keybinds.js'

var turndownPluginGfm = require('joplin-turndown-plugin-gfm')
var mdTodoLists = require('./markdown-it-extensions/todo-lists.js')

export default {
  name: 'Vimish',
  components: {
    EditorMenuBar,
    EditorContent,
    TextPrompt,
    Modal,
  },
  props: [
    'note',
  ],
  activated() {
    this.portalActive = true
  },
  deactivated() {
    this.portalActive = false
  },
  computed: {
    hasChanged() {
      if(this.originalDoc) {
        return !this.originalDoc.eq(this.editor.view.state.doc)
      }
    },
  },
  data() {
    var $this = this
    return {
      portalActive: true,
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
        this.inputRules.push(new InputRule(/\[\[([\w\u00C0-\u02AF\u0370-\u04FF\u00A0-\uFADF\. ]+)(\|([\w\u00C0-\u02AF\u0370-\u04FF\u00A0-\uFADF\. ]+))?\]\]$/,
        (state, match, start, end) => {
          var isSplit = !!match[3]
          var note = $this.$store.state.currentNoteCollection.resolveToNote(match[1])
          var label = isSplit ? match[3] : match[1]
          var linkMarkSchema = state.schema.marks.link
          var linkMark = linkMarkSchema.create()
          if (note) {
            linkMark.attrs.href = `/editor/${note.id}`
          }
          else {
            linkMark.attrs.href = `/new-note/${label}`
          }
          var tr = state.tr
          tr = tr.insertText(label, start, end)
          tr = tr.addMark(start, start+label.length, linkMark)
          return tr
        }))
      },
      },
      originalDoc: null,
      editor: null,
      editable: false,
      fullKeybuffer: '',
      keybuffer: '',
      keybufferCount: null,
      keybufferRegister: null,
      vimMode: 'Normal',
      searchString: null,
      searchDir: 1,
      linkLabel: '',
      linkURL: '',
      linkFrom: null,
      linkTo: null,
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
    editLink() {
      console.log('Edit links!')
      var {from, to} = this.editor.selection
      var $pos = this.editor.state.doc.resolve(from)
      var state = this.editor.state
      const { parent, parentOffset } = $pos
      const start = parent.childAfter(parentOffset)
      if (!start.node) return null

      const link = start.node.marks.find((mark) => mark.type === state.schema.marks.link)
      if (!link) {
        var text = this.editor.view.state.doc.textBetween(from, to)
        this.linkFrom = from
        this.linkTo = to
        this.linkLabel = text
        this.linkURL = ''
        this.$refs.editLink.openModal(() => {
          this.$refs.linkURLinput.focus()
        })
        return null
      }
      console.log(link.attrs.href)

      let startIndex = $pos.index()
      let startPos = $pos.start() + start.offset
      let endIndex = startIndex + 1
      let endPos = startPos + start.node.nodeSize
      while (startIndex > 0 && link.isInSet(parent.child(startIndex - 1).marks)) {
        startIndex -= 1
        startPos -= parent.child(startIndex).nodeSize
      }
      while (endIndex < parent.childCount && link.isInSet(parent.child(endIndex).marks)) {
        endPos += parent.child(endIndex).nodeSize
        endIndex += 1
      }
      this.editor.setSelection(startPos, endPos)
      console.log(`From: ${startPos}, to: ${endPos}`)
      var text = this.editor.view.state.doc.textBetween(startPos, endPos)
      console.log(text)
      this.linkFrom = startPos
      this.linkTo = endPos
      this.linkLabel = text
      this.linkURL = link.attrs.href
      this.$refs.editLink.openModal(() => {
        this.$refs.linkURLinput.focus()
      })
    },
    changeLink() {
      console.log(`Link: ${this.linkURL}`)
      console.log(`Label: ${this.linkLabel}`)
      this.$refs.editLink.closeModal()
      var linkMarkSchema = this.editor.state.schema.marks.link
      var linkMark = linkMarkSchema.create()
      var label = this.linkLabel
      var start = this.linkFrom
      var end = this.linkTo
      linkMark.attrs.href = this.linkURL
      var tr = this.editor.state.tr
      tr = tr.insertText(label, start, end)
      tr = tr.removeMark(start, start+label.length, linkMark.type)
      tr = tr.addMark(start, start+label.length, linkMark)
      this.editor.dispatchTransaction(tr)
    },
    },
  },
  watch: {
    editable() {
      this.editor.setOptions({
        editable: this.editable,
      })
      if (this.editable) {
        this.vimMode = 'Insert'
      }
      else {
        this.vimMode = 'Normal'
      }
    },
    hasChanged(to, from) {
      this.$emit('hasChanged', to)
    },
  },
  mounted() {
    this.editor = new Editor(this.editorOptions)
    this.editable = true
    this.editor.setSelection(1, 2)
    this.editable = false
    this.turndownService.use(turndownPluginGfm.gfm)
    this.turndownService.addRule('todoListItems', {
      filter: function (node) {
        return node.dataset.type === 'todo_item'
      },
      replacement: function (content, node) {
        return '* ' + (node.dataset.done == 'true' ? '[x]' : '[ ]') + ' ' + node.querySelector('p').innerHTML + '\n'
      }
    })
    var $this = this
    fs.readFile(this.note.contentPath, 'utf8', (err, contents) => {
      if (err) {
        console.err('Couldnt open')
      } else {
        var md = new MarkdownIt()
        md.use(mdTodoLists)
        var result = md.render(contents)
        console.log(result)
        // $this.editor.view.updateState($this.editor.createState())
        $this.editor.setContent(result)
        $this.inputMD = result
        $this.vimMode = "Normal"
        $this.editable = false
        $this.motions.moveToStart()
        // setTimeout(x => {
        //   // $this.$refs.editorContainer.focus()
        //   // $this.editor.focus()
        //   $this.editor.view.focus()
        //   $this.moveToTop()
        // }, 100)
        bus.$emit('focusEditor')
    this.turndownService.addRule('wikiLinksExist', {
      filter: function (node, options) {
        return (
          node.nodeName === 'A' &&
          node.getAttribute('href') &&
          node.getAttribute('href').startsWith('/editor/')
        )
      },
      replacement: function (content, node, options) {
        var id = node.getAttribute('href').split('/').pop()
        return `[[${id}|${content.trim()}]]`
      }
    })
    this.turndownService.addRule('wikiLinksNonExist', {
      filter: function (node, options) {
        return (
          node.nodeName === 'A' &&
          node.getAttribute('href') &&
          node.getAttribute('href').startsWith('/new-note/')
        )
      },
      replacement: function (content, node, options) {
        var label = node.getAttribute('href').split('/').pop()
        return `[[${label}]]`
      }
    })
    var $this = this
    if (this.note) {
      //MarkdownIt
      var md = new MarkdownIt({
        linkify: true,
      })
      md.use(mdTodoLists)
      var wikilinks = require('markdown-it-wikilinks')({
        baseURL: '/',
        makeAllLinksAbsolute: true,
        uriSuffix: '',
        htmlAttributes: {
          'class': 'wikilink',
          'target': '_blank',
        },
        postProcessPageName: (pageName) => {
          var note = $this.$store.state.currentNoteCollection.resolveToNote(pageName)
          if (note) {
            return `editor/${note.id}`
          }
          else {
            return `new-note/${pageName}`
          }
        },
      })
      md.use(wikilinks)
  },
  created () {
    this.helpers = Helpers(this, window)
    this.actions = Actions(this, window)
    this.motions = Motions(this, window)
    this.textObjects = TextObjects(this, window)
    this.keybinds = Keybinds(this, window)
    this.keymonitor = this.keybinds.keymonitor
    var $this = this
    bus.$on('focusEditor', () => {
      this.$nextTick(() => {
        setTimeout(() => {
          // $this.$refs.editorContainer.querySelector('.ProseMirror').focus()
          // window.getSelection().selectAllChildren(
          //   document.getElementsByClassName('ProseMirror')[0]
          // )
          var pmNode = document.getElementsByClassName('ProseMirror')[0]
          var selection = window.getSelection();
          var range = selection.getRangeAt(0)
          try {
            range.setStart(pmNode, 0)
            range.setEnd(pmNode, 1)
          }
          catch (e) {
            if (e.name != "IndexSizeError") {
              throw e
            }
          }
          selection.removeAllRanges()
          selection.addRange(range)
          pmNode.focus()
          $this.motions.moveToStart()
        }, 100)
      })
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

    a[href^="/new-note/"] {
      color: #d33;
    }

    a[href^="http"]:after {
      content: url(https://en.wikipedia.org/w/skins/Vector/resources/skins.vector.styles/images/external-link-ltr-icon.svg);
      // background-position: center right;
      // background-repeat: no-repeat;
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

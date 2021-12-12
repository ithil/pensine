<template>
  <div class="fleetingNoteList" tabindex="10" @keyup="keymonitor" @keydown="preventDefaultFix" ref="fleetingNoteList">
    <div class="fleetingNotes">
      <div v-for="f in processedFleetingNotes" :key="f.filename">
        <fleeting-note
        :fleetingNoteObj="f"
        :options="fleetingNoteOptions"
        @selectNote="selectNote"
        @unselectNote="unselectNote"
        @focusNote="focusNote"
        @scrollFocusedIntoView="scrollFocusedIntoView"
        @markNote="markNote"
        @gotoMark="gotoMark"
        :class="checkFocus(f) ? 'focused' : ''"
        :isFocused="checkFocus(f)"
        :searchString="searchString"
        ref="fleetingNoteItems"
        >
        </fleeting-note>
      </div>
    </div>
    <div class="searchBar" v-if="searchBarVisible">
      <span class="statusBarItem">Search for:</span>
      <span class="statusBarItem">
        <input
        v-model="searchString"
        ref="searchInput"
        @keydown="searchKeymonitor"
        ></input>
    </span>
    </div>
    <portal to="statusBarLeft" :order="1" v-if="portalActive">
      <span v-if="selectedNotes.length > 0" class="statusBarSection">
        <span class="statusBarItem bold">{{selectedNotes.length}} selected</span>
        <span class="statusBarItem">➝</span>
        <span class="statusBarItem clickable" @click="deleteSelectedNotes">
          <Icon name="Trash" />
          delete
        </span>
        <span class="statusBarItem clickable" @click="addSelectedToStack">
          <Icon name="Layers" />
          stack
        </span>
        <span class="statusBarItem clickable" @click="sendSelectedToPort">
          <Icon name="Truck" />
          port
        </span>
        <span class="statusBarItem clickable" @click="linkSelectedNotes">
          <Icon name="Link" />
          link
        </span>
        <span class="statusBarItem clickable">
          <Icon name="GitMerge" />
          merge
        </span>
      </span>
    </portal>
    <portal to="statusBarRight" :order="1" v-if="portalActive">
      <span class="keybuffer">{{fullKeybuffer}}</span>
      <span v-if="$store.state.bag.length > 0" @click="showBag">
        <Icon name="Pocket" /> {{$store.state.bag.length}}
      </span>
      <span><span v-if="filterTerm.length > 0">{{processedFleetingNotes.length}}/</span>{{fleetingNotes.length}} items</span>
    </portal>
  </div>
</template>

<script>
import fs from 'fs'
import path from 'path'
import sanitizeFilename from 'sanitize-filename'
import moment from 'moment'
import 'moment/locale/de'
import fleetingNote from '@/components/FleetingNote.vue'
import MarkdownIt from 'markdown-it'
import { clipboard, shell, nativeImage } from 'electron'
import Icon from '@/components/Icon.vue'

function* arrIterator(arr) {
  var len = arr.length
  var i = 0
  var dir = 1
  while (true) {
    dir = yield arr[i]
    dir = dir || 1
    i = i + dir
    if (i < 0) {
      i = len + i
    }
    else if (i >= len) {
      i = 0 + (len - i)
    }
  }
}

export default {
  name: 'fleeting-note-list',
  props: {
    'fleetingNotes': Array,
    'fleetingNoteOptions': {
      type: Object,
      default() {
        return {}
      },
    },
    'filterTerm': {
      type: String,
      default: '',
    },
    'sortOrder': {
      type: String,
      default: 'oldestFirst',
    },
  },
  components: {
    fleetingNote,
    Icon,
  },
  data() {
    return {
      selectedNotes: [],
      markedNotes: {},
      focusedNotePath: '',
      md: new MarkdownIt({linkify: true}),
      portalActive: true,
      fullKeybuffer: '',
      keybuffer: '',
      keybufferCount: null,
      keybufferRegister: null,
      isMounted: false,
      searchString: '',
      searchBarVisible: false,
      foundItems: [],
      resultsIt: null,
    }
  },
  methods: {
    updateFleetingNotes() {
      this.$emit('updateFleetingNotes')
    },
    selectNote(fleetingNoteObj) {
      console.log(`Selected: ${fleetingNoteObj.filename}`)
      this.selectedNotes.push(fleetingNoteObj)
    },
    unselectNote(fleetingNoteObj) {
      console.log(`Unselected: ${fleetingNoteObj.filename}`)
      var index = this.selectedNotes.findIndex(n => n.path == fleetingNoteObj.path)
      this.selectedNotes.splice(index, 1)
    },
    markNote(fleetingNoteObj, mark) {
      console.log(`Marked as ${mark}: ${fleetingNoteObj.filename}`)
      this.markedNotes[mark] = fleetingNoteObj
    },
    gotoMark(mark) {
      console.log(`Goto mark ${mark}`)
      if (this.markedNotes[mark]) {
        this.focusNote(this.markedNotes[mark])
        this.scrollFocusedIntoView()
      }
    },
    checkFocus(f) {
      if (f && f.path && this.focusedNotePath) {
        return f.path == this.focusedNotePath
      }
      return false
    },
    showBag() {
      var $this = this
      var bag = this.$store.state.bag
      var items = bag.map(fnPath => {
        var fn = $this.$store.state.currentNoteCollection.getFleetingNoteByPath(fnPath)
        if (fn) {
          return {
            label: fn.abstract,
            lucideIcon: 'File',
            description: fn.stack || 'Inbox',
            action:() => {
              console.log(fn.path)
              this.$store.commit('removeFromBag', fn.path)
            }
          }
        }
      })
      var filter = function (context) {
        var $items = context.itemsWithIds
        var itemsFiltered = $items.filter(item => {
          return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
        })
        itemsFiltered.push({
          id: context.getHighestId() + 1,
          lucideIcon: 'Delete',
          label: 'Empty Bag',
          action: () => {
            this.$store.commit('emptyBag')
          },
        })
        return itemsFiltered
      }
      this.$store.commit('triggerCustomSelectList', {items, filter})
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    deleteSelectedNotes(event) {
      var $this = this
      this.$store.commit('triggerCustomTextPrompt', {
        message: `Are you sure you want to delete ${this.selectedNotes.length} fleeting notes?`,
        action: (text) => {
          if (['y', 'yes'].includes(text.trim())) {
            for (let n of $this.selectedNotes) {
              n.delete()
            }
            $this.selectedNotes = []
          }
        }
      })
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    linkSelectedNotes() {
      var $this = this
      var bag = this.$store.state.bag
      var items = bag.map(fnPath => {
        var fn = $this.$store.state.currentNoteCollection.getFleetingNoteByPath(fnPath)
        if (fn) {
          return {
            label: fn.abstract,
            lucideIcon: 'File',
            action:() => {
              setTimeout(() => {
                this.$store.commit('triggerCustomTextPrompt', {
                  message: `Edge Properties (comma-separated)`,
                  action: (edgeProperties) => {
                    edgeProperties = edgeProperties.split(',').map(i => i.trim()).filter(i => i)
                    for (let n of $this.selectedNotes) {
                      n.addLink(fn.relativePath, edgeProperties)
                    }
                    $this.selectedNotes = []
                    for (let n of this.$refs.fleetingNoteItems) {
                      n.selected = false
                    }
                    this.$refs.fleetingNoteList.focus()
                  }
                })
              }, 50)
            }
          }
        }
      })
      var filter = function (context) {
        var $items = context.itemsWithIds
        var searchString = context.searchString.toLowerCase()
        var registers = $this.$store.state.currentNoteCollection.registers
        var registerPath = null
        var registerName = null
        for (let r of registers) {
          if (searchString.startsWith(r.prefix)) {
            registerPath = r.path
            registerName = r.name
            searchString = searchString.slice(r.prefix.length)
          }
        }
        if (registerPath) {
          var stack = $this.$store.state.currentNoteCollection.stacks.getStackByPath(registerPath)
          var stackContent = stack.getContent()
          var items = []
          var id = 1
          for (let i of stackContent) {
            if (!i.isStack && i.content.toLowerCase().indexOf(searchString) > -1) {
              items.push({
                id: id,
                lucideIcon: 'AtSign',
                label: i.abstract,
                description: registerName,
                action: () => {
                  setTimeout(() => {
                    this.$store.commit('triggerCustomTextPrompt', {
                      message: `Edge Properties (comma-separated)`,
                      action: (edgeProperties) => {
                        edgeProperties = edgeProperties.split(',').map(i => i.trim()).filter(i => i)
                        for (let n of $this.selectedNotes) {
                          n.addLink(i.relativePath, edgeProperties)
                        }
                        $this.selectedNotes = []
                        for (let n of $this.$refs.fleetingNoteItems) {
                          n.selected = false
                        }
                      }
                    })
                  }, 50)
                },
              })
              id++
            }
          }
          return items
        }
        var itemsFiltered = $items.filter(item => {
          return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
        })
        itemsFiltered.push({
          id: context.getHighestId() + 1,
          lucideIcon: 'FilePlus',
          label: 'Link all bagged notes',
          action: () => {
            for (let fnPath of bag) {
              for (let n of $this.selectedNotes) {
                // this fnPath is absoulte but needs to be relative!!!
                n.addLink(fnPath)
              }
              $this.selectedNotes = []
              for (let n of $this.$refs.fleetingNoteItems) {
                n.selected = false
              }
            }
          },
        })
        return itemsFiltered
      }
      this.$store.commit('triggerCustomSelectList', {items, filter})
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    tagSelectedNotes() {
      var $this = this
      var stacksPath = $this.$store.state.currentNoteCollection.paths.stacks
      var tagStackPath = path.join(stacksPath, 'tags')
      if (!fs.existsSync(tagStackPath)) {
        fs.mkdirSync(tagStackPath, { recursive: true })
      }
      var stack = $this.$store.state.currentNoteCollection.stacks.getStackByPath('tags')
      var stackContent = stack.getContent()
      var items = []
      var filter = function (context) {
        var $items = context.itemsWithIds
        var searchString = context.searchString.toLowerCase()
        var items = []
        var id = 1
        for (let i of stackContent) {
          if (!i.isStack && i.content.toLowerCase().indexOf(searchString) > -1) {
            items.push({
              id: id,
              lucideIcon: 'Tag',
              label: i.abstract,
              action: () => {
                var edgeProperties = ['tag']
                if ($this.selectedNotes.length > 0) {
                  for (let n of $this.selectedNotes) {
                    n.addLink(i.relativePath, edgeProperties)
                  }
                  $this.selectedNotes = []
                  for (let n of $this.$refs.fleetingNoteItems) {
                    n.selected = false
                  }
                }
                else {
                  let n = $this.getFocusedNoteItem().fleetingNoteObj
                  if (n) {
                    n.addLink(i.relativePath, edgeProperties)
                  }
                }
              },
            })
          }
          id++
        }
        var newTag = context.searchString.trim()
        items.push({
          id: id + 1,
          lucideIcon: 'FilePlus',
          label: newTag,
          description: 'Create new tag',
          action: () => {
            var newFnPath = path.join(tagStackPath, `${sanitizeFilename(newTag)}.md`)
            fs.writeFileSync(newFnPath, `# ${newTag}`, 'utf8')
            var newFn = $this.$store.state.currentNoteCollection.getFleetingNoteByPath(newFnPath)
            var edgeProperties = ['tag']
            if ($this.selectedNotes.length > 0) {
              for (let n of $this.selectedNotes) {
                n.addLink(newFn.relativePath, edgeProperties)
              }
              $this.selectedNotes = []
              for (let n of $this.$refs.fleetingNoteItems) {
                n.selected = false
              }
            }
            else {
              let n = $this.getFocusedNoteItem().fleetingNoteObj
              if (n) {
                n.addLink(newFn.relativePath, edgeProperties)
              }
            }
          },
        })
        return items
      }
      this.$store.commit('triggerCustomSelectList', {items, filter})
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    addSelectedToStack(event) {
      var $this = this
      var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
      var items = stacks.map(s => {
        return {
          label: s.relativePath,
          lucideIcon: 'Layers',
          action:() => {
            for (let n of $this.selectedNotes) {
              n.sendToStack(s.relativePath)
            }
            $this.selectedNotes = []
          }
        }
      })
      var filter = function (context) {
        var $items = context.itemsWithIds
        var itemsFiltered = $items.filter(item => {
          return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
        })
        itemsFiltered.push({
          id: context.getHighestId() + 1,
          lucideIcon: 'Plus',
          label: context.searchString.trim(),
          description: 'Create new stack',
          action: () => {
            for (let n of $this.selectedNotes) {
              n.sendToStack(context.searchString.trim())
            }
            $this.selectedNotes = []
          },
        })
        return itemsFiltered
      }
      this.$store.commit('triggerCustomSelectList', {items, filter})
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    sendSelectedToPort(event) {
      var $this = this
      var ports = this.$global.pensieve.ports
      ports = ports.filter(p => p.collectionName != this.$store.state.currentNoteCollection.name)
      var items = ports.map(p => {
        return {
          label: p.name,
          lucideIcon: 'Truck',
          description: p.collectionName,
          action:() => {
            for (let n of $this.selectedNotes) {
              p.sendToPort(n)
            }
            $this.selectedNotes = []
            this.$refs.fleetingNoteList.focus()
          }
        }
      })
      this.$store.commit('triggerCustomSelectList', {items})
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    focusNote(fleetingNoteObj, event) {
      this.focusedNotePath = fleetingNoteObj.path
      if (event) {
        var el = event.target
        var classes = []
        while (el) {
          if (el.classList) {
            classes = [...classes, ...el.classList.values()]
          }
          el = el.parentNode
        }
        if (!classes.includes('fleetingNoteEditor')) {
          this.$refs.fleetingNoteList.focus()
        }
      }
      else {
        this.$refs.fleetingNoteList.focus()
      }
    },
    focusNext(c = 1) {
      var index = this.processedFleetingNotes.findIndex(i => i.path == this.focusedNotePath)
      var len = this.processedFleetingNotes.length
      if (index > -1) {
        if (index + c >= len) {
          this.focusedNotePath = this.processedFleetingNotes[0].path
        }
        else if (index + c < 0) {
          this.focusedNotePath = this.processedFleetingNotes[len - 1].path
        }
        else {
          this.focusedNotePath = this.processedFleetingNotes[index + c].path
        }
        this.scrollFocusedIntoView()
      }
    },
    scrollFocusedIntoView() {
      this.$nextTick(function () {
        var $this = this
        setTimeout(function () { // This is just a dirty hack so I can go to bed
          var focusedItem = $this.getFocusedNoteItem()
          if (focusedItem) {
            focusedItem.$el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 5)
      })
    },
    getFocusedNoteItem() {
      return this.$refs.fleetingNoteItems.find(n => n.$el.classList.contains('focused'))
    },
    getSelectedNotesItems() {
      return this.$refs.fleetingNoteItems.filter(n => n.$el.classList.contains('selected'))
    },
    preventDefaultFix(event) {
      var tagName = event.target.tagName
      if (!(['INPUT', 'TEXTAREA'].includes(tagName))) {
        if (event.keyCode == 32) {
          event.stopPropagation()
          event.preventDefault()
        }
      }
    },
    keymonitor(event) {
      var tagName = event.target.tagName
      if (!(['INPUT', 'TEXTAREA'].includes(tagName))) {
        if (event.key === "Escape") {
          this.fullKeybuffer = ''
        }
        else if (event.key.length == 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
          this.fullKeybuffer += event.key
          var match = this.fullKeybuffer.match(/(\d+)?("([a-zA-Z0-9+]))?(.+)/)
          this.keybufferCount = match[1]
          this.keybufferRegister = match[3]
          this.keybuffer = match[4]
          event.stopPropagation()
          event.preventDefault()
          if (this.keybuffer == "j")
          {
            // Focus next item down
            this.focusNext(1 * (this.keybufferCount || 1))
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "k")
          {
            // Focus next item up
            this.focusNext(-1 * (this.keybufferCount || 1))
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gg")
          {
            // Focus first item in list
            this.focusedNotePath = this.processedFleetingNotes[0].path
            this.scrollFocusedIntoView()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "G")
          {
            // Focus last item in list
            var len = this.processedFleetingNotes.length
            this.focusedNotePath = this.processedFleetingNotes[len - 1].path
            this.scrollFocusedIntoView()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "za")
          {
            // Toggle compact mode (fold) of focused item
            if (this.selectedNotes.length > 0) {
              let selectedNotesItems = this.getSelectedNotesItems()
              for (let n of selectedNotesItems) {
                n.toggleCompactMode()
              }
            }
            else {
              this.getFocusedNoteItem().toggleCompactMode()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zo")
          {
            // Disable compact mode (open fold) of focused item
            if (this.selectedNotes.length > 0) {
              let selectedNotesItems = this.getSelectedNotesItems()
              for (let n of selectedNotesItems) {
                n.toggleCompactMode(false)
              }
            }
            else {
              this.getFocusedNoteItem().toggleCompactMode(false)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zO")
          {
            // Disable compact mode (open fold) for all items
            let allNotesItems = this.$refs.fleetingNoteItems
            for (let n of allNotesItems) {
              n.toggleCompactMode(false)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zc")
          {
            // Enable compact mode (close fold) of focused item
            if (this.selectedNotes.length > 0) {
              let selectedNotesItems = this.getSelectedNotesItems()
              for (let n of selectedNotesItems) {
                n.toggleCompactMode(true)
              }
            }
            else {
              this.getFocusedNoteItem().toggleCompactMode(true)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "zC")
          {
            // Enable compact mode (close fold) for all items
            let allNotesItems = this.$refs.fleetingNoteItems
            for (let n of allNotesItems) {
              n.toggleCompactMode(true)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "r")
          {
            this.updateFleetingNotes()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == " ")
          {
            this.getFocusedNoteItem().toggleSelectNote()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "t")
          {
            if (this.selectedNotes.length > 0) {
              this.addSelectedToStack()
            }
            else {
              this.getFocusedNoteItem().addToStack()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == ",p")
          {
            // Send all selected items OR focused item to port
            if (this.selectedNotes.length > 0) {
              this.sendSelectedToPort()
            }
            else {
              this.getFocusedNoteItem().sendToPort()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "x")
          {
            if (this.selectedNotes.length > 0) {
              this.deleteSelectedNotes()
            }
            else {
              this.getFocusedNoteItem().deleteNote()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "e")
          {
            this.getFocusedNoteItem().editNote()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "ll")
          {
            // Show links of focused note
            this.getFocusedNoteItem().showLinks()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "la")
          {
            // Add links to all selected notes OR focused note
            if (this.selectedNotes.length > 0) {
              this.linkSelectedNotes()
            }
            else {
              this.getFocusedNoteItem().linkNote()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "lu")
          {
            // Remove a link from selected note
            this.getFocusedNoteItem().unlinkNote()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "lt")
          {
            // Add tag to all selected notes OR focused note
            this.tagSelectedNotes()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "b")
          {
            let fn = this.getFocusedNoteItem().fleetingNoteObj
            this.$store.commit('addToBag', fn.path)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "B")
          {
            this.showBag()
            this.fullKeybuffer = ''
          }
          else if (/^m[a-zA-Z0-9]/.test(this.keybuffer))
          {
            let mark = this.keybuffer[1]
            this.markNote(this.getFocusedNoteItem().fleetingNoteObj, mark)
            this.fullKeybuffer = ''
          }
          else if (/^'[a-zA-Z0-9]/.test(this.keybuffer))
          {
            let mark = this.keybuffer[1]
            this.gotoMark(mark)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yr")
          {
            var fleetingNoteObj = this.getFocusedNoteItem().fleetingNoteObj
            if (fleetingNoteObj.isText) {
              var content = fleetingNoteObj.content
              clipboard.writeText(content)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yh")
          {
            var fleetingNoteObj = this.getFocusedNoteItem().fleetingNoteObj
            if (fleetingNoteObj.isText) {
              var content = fleetingNoteObj.renderedContent
              clipboard.writeHTML(content)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yi")
          {
            var fleetingNoteObj = this.getFocusedNoteItem().fleetingNoteObj
            if (fleetingNoteObj.isImage) {
              let dataURL = `data:${fleetingNoteObj.mime};base64,${fleetingNoteObj.contentBase64}`
              let img = nativeImage.createFromDataURL(dataURL)
              clipboard.writeImage(img)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "yl")
          {
            var count = this.keybufferCount || 1
            var fleetingNoteObj = this.getFocusedNoteItem().fleetingNoteObj
            if (fleetingNoteObj.webLinks[count - 1]) {
              clipboard.writeText(fleetingNoteObj.webLinks[count - 1])
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gf")
          {
            var notePath = this.getFocusedNoteItem().fleetingNoteObj.path
            shell.showItemInFolder(notePath)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "go")
          {
            var notePath = this.getFocusedNoteItem().fleetingNoteObj.path
            shell.openPath(notePath)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gl")
          {
            var count = this.keybufferCount || 1
            var fleetingNoteObj = this.getFocusedNoteItem().fleetingNoteObj
            if (fleetingNoteObj.webLinks[count - 1]) {
              shell.openExternal(fleetingNoteObj.webLinks[count - 1])
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gi")
          {
            this.$emit('focusSendBox')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "va")
          {
            this.selectedNotes = []
            for (let n of this.$refs.fleetingNoteItems) {
              n.selected = true
              this.selectedNotes.push(n.fleetingNoteObj)
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "vc")
          {
            this.selectedNotes = []
            for (let n of this.$refs.fleetingNoteItems) {
              n.selected = false
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "vi")
          {
            for (let n of this.$refs.fleetingNoteItems) {
              n.toggleSelectNote()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "/")
          {
            this.searchBarVisible = true
            var $this = this
            this.$nextTick(function () {
              setTimeout(function () { // This is just a dirty hack so I can go to bed
                $this.$refs.searchInput.focus()
                $this.searchString = ''
              }, 5)
            })
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "n")
          {
            var count = this.keybufferCount || 1
            var iteration = this.resultsIt.next(1 * count)
            if (!iteration.done && iteration.value) {
              this.focusedNote = iteration.value.fleetingNoteObj
              this.scrollFocusedIntoView()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "N")
          {
            var count = this.keybufferCount || 1
            var iteration = this.resultsIt.next(-1 * count)
            if (!iteration.done && iteration.value) {
              this.focusedNote = iteration.value.fleetingNoteObj
              this.scrollFocusedIntoView()
            }
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "sn")
          {
            this.$emit('changeSortOrder', 'newestFirst')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "so")
          {
            this.$emit('changeSortOrder', 'oldestFirst')
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "dd")
          {
            // Link note to a calendar date
            this.getFocusedNoteItem().showLinkToDatePrompt()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "dn")
          {
            // Link note to calendar date that equals creation date
            let note = this.getFocusedNoteItem()
            note.linkToDate(note.fleetingNoteObj.date)
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "dt")
          {
            // Link note to today's calendar date
            this.getFocusedNoteItem().linkToDate(moment())
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "dy")
          {
            // Link note to yesterday's calendar date
            this.getFocusedNoteItem().linkToDate(moment().subtract(this.keybufferCount || 1, 'day'))
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "dw")
          {
            // Link note to calendar date of last weekday X 
            let today = moment()
            let count = this.keybufferCount
            count = count > 6 ? 0 : count
            this.getFocusedNoteItem().linkToDate(today.day(today.day() >= count ? count : count-7))
            this.fullKeybuffer = ''
          }
        }
      }
    },
    searchKeymonitor(event) {
      if (event.key === "Escape") {
        this.searchBarVisible = false
        this.searchString = ''
        this.$refs.fleetingNoteList.focus()
      }
      else if (event.key === "Enter") {
        this.searchBarVisible = false
        this.$refs.fleetingNoteList.focus()
      }
      else if (event.key === 'Tab' && event.shiftKey) {
        var iteration = this.resultsIt.next(-1)
        if (!iteration.done && iteration.value) {
          this.focusedNotePath = iteration.value.fleetingNoteObj.path
          this.scrollFocusedIntoView()
        }
        event.preventDefault()
        event.stopPropagation()
      }
      else if (event.key === 'Tab') {
        var iteration = this.resultsIt.next(1)
        if (!iteration.done && iteration.value) {
          this.focusedNotePath = iteration.value.fleetingNoteObj.path
          this.scrollFocusedIntoView()
        }
        event.preventDefault()
        event.stopPropagation()
      }
      else if (this.searchString.length > 0) {
        var index = this.$refs.fleetingNoteItems.findIndex(n => n.$el.classList.contains('focused'))
        var fleetingNoteItems = this.$refs.fleetingNoteItems.slice(index)
          .concat(this.$refs.fleetingNoteItems.slice(0,index))
        this.foundItems = fleetingNoteItems
          .filter(n => n.fleetingNoteObj.isText && (new RegExp(this.searchString, 'i')).test(n.content))
        this.resultsIt = arrIterator(this.foundItems)
        this.resultsIt.next()
        if (this.foundItems[0]) {
          this.focusedNotePath = this.foundItems[0].fleetingNoteObj.path
          this.scrollFocusedIntoView()
        }
      }
    },
  },
  computed: {
    processedFleetingNotes() {
      var processedNotes = []
      if (this.filterTerm && this.filterTerm.length > 0) {
        processedNotes = this.fleetingNotes.filter(item => {
          return item.content.toLowerCase().indexOf(this.filterTerm.toLowerCase()) > -1
        })
      }
      else {
        processedNotes = this.fleetingNotes
      }
      if (this.sortOrder == 'newestFirst') {
        processedNotes = processedNotes.sort((a, b) => b.date - a.date)
      }
      else if (this.sortOrder == 'oldestFirst') {
        processedNotes = processedNotes.sort((a, b) => a.date - b.date)
      }
      return processedNotes
    },
  },
  mounted() {
    this.isMounted = true
    this.focusedNotePath = this.processedFleetingNotes[0] ? this.processedFleetingNotes[0].path : ''
    this.$refs.fleetingNoteList.focus()
  },
  unmounted() {
    this.isMounted = false
  },
  activated() {
    this.portalActive = true
  },
  deactivated() {
    this.portalActive = false
  },
}
</script>
<style scoped lang='scss'>
.fleetingNoteList {
  outline: none;
}

.fleetingNotes {
  .fleetingNote {
    margin-bottom: 10px;
  }
}

.searchBar {
  display: flex;
  bottom: 23px;
  z-index: 3;
  font-family: 'Lucida Grande';
  font-size: 12px;
  background-color: #222527;
  color: white;
  width: 100%;
  padding: 2px;
  height: 24px;
  position: fixed;
  input {
    background: #444444;
    color: white;
    border: none;
    outline: none;
    font-family: 'Lucida Grande';
    font-size: 12px;
  }
}
</style>

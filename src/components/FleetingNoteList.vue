<template>
  <div class="fleetingNoteList" tabindex="10" @keyup="keymonitor" @keydown="preventDefaultFix" ref="fleetingNoteList">
    <div class="fleetingNotes">
      <div v-for="f in processedFleetingNotes" :key="f.filename">
        <fleeting-note
        :fleetingNoteObj="f"
        @selectNote="selectNote"
        @unselectNote="unselectNote"
        @focusNote="focusNote"
        :class="f == focusedNote ? 'focused' : ''"
        @markNote="markNote"
        @gotoMark="gotoMark"
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
      focusedNote: null,
      markedNotes: {},
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
    addSelectedToStack(event) {
      var $this = this
      var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
      var items = stacks.map(s => {
        return {
          label: s.relativePath,
          iconClasses: ['feather-icon', 'icon-layers'],
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
          iconClasses: ['feather-icon', 'icon-plus'],
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
    focusNote(fleetingNoteObj) {
      console.log(`Focused: ${fleetingNoteObj.filename}`)
      console.log(this.focusedNoteItem)
      this.focusedNote = fleetingNoteObj
    },
    focusNext(c = 1) {
      var index = this.processedFleetingNotes.findIndex(i => i == this.focusedNote)
      var len = this.processedFleetingNotes.length
      if (index > -1) {
        if (index + c >= len) {
          this.focusedNote = this.processedFleetingNotes[0]
        }
        else if (index + c < 0) {
          this.focusedNote = this.processedFleetingNotes[len - 1]
        }
        else {
          this.focusedNote = this.processedFleetingNotes[index + c]
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
            focusedItem.$el.scrollIntoViewIfNeeded()
          }
        }, 5)
      })
    },
    getFocusedNoteItem() {
      return this.$refs.fleetingNoteItems.find(n => n.$el.classList.contains('focused'))
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
            this.focusNext(1 * (this.keybufferCount || 1))
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "k")
          {
            this.focusNext(-1 * (this.keybufferCount || 1))
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "gg")
          {
            this.focusedNote = this.processedFleetingNotes[0]
            this.scrollFocusedIntoView()
            this.fullKeybuffer = ''
          }
          else if (this.keybuffer == "G")
          {
            var len = this.processedFleetingNotes.length
            this.focusedNote = this.processedFleetingNotes[len - 1]
            this.scrollFocusedIntoView()
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
          else if (this.keybuffer == "i")
          {
            this.getFocusedNoteItem().insertNote()
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
          this.focusedNote = iteration.value.fleetingNoteObj
          this.scrollFocusedIntoView()
        }
        event.preventDefault()
        event.stopPropagation()
      }
      else if (event.key === 'Tab') {
        var iteration = this.resultsIt.next(1)
        if (!iteration.done && iteration.value) {
          this.focusedNote = iteration.value.fleetingNoteObj
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
          this.focusedNote = this.foundItems[0].fleetingNoteObj
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
    this.focusedNote = this.processedFleetingNotes[0]
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
  max-width: 550px;
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

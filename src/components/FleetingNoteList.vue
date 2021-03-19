<template>
  <div class="fleetingNoteList" tabindex="10" @keydown="keymonitor">
    <div class="fleetingNotes">
      <div v-for="f in fleetingNotes" :key="f.filename">
        <fleeting-note
        :fleetingNoteObj="f"
        @selectNote="selectNote"
        @unselectNote="unselectNote"
        @focusNote="focusNote"
        :class="f == focusedNote ? 'focused' : ''"
        ref="fleetingNoteItems"
        >
        </fleeting-note>
      </div>
    </div>
    <portal to="statusBarLeft" :order="1" v-if="portalActive">
      <span v-if="selectedNotes.length > 0">
        <span class="statusBarItem">{{selectedNotes.length}} items selected</span>
        <span class="statusBarItem">|</span>
        <span class="statusBarItem">delete</span>
        <span class="statusBarItem">merge</span>
        <span class="statusBarItem">new</span>
      </span>
    </portal>
    <portal to="statusBarRight" :order="1" v-if="portalActive">
      <span class="keybuffer">{{fullKeybuffer}}</span>
      <span>{{fleetingNotes.length}} items</span>
    </portal>
  </div>
</template>

<script>
import fs from 'fs'
import path from 'path'
import fleetingNote from '@/components/FleetingNote.vue'
import MarkdownIt from 'markdown-it'
import { clipboard, shell } from 'electron'

export default {
  name: 'fleeting-note-list',
  props: {
    'fleetingNotes': Array,
  },
  components: {
    fleetingNote,
  },
  data() {
    return {
      selectedNotes: [],
      focusedNote: null,
      md: new MarkdownIt({linkify: true}),
      portalActive: true,
      fullKeybuffer: '',
      keybuffer: '',
      keybufferCount: null,
      keybufferRegister: null,
      isMounted: false,
    }
  },
  methods: {
    selectNote(fleetingNoteObj) {
      console.log(`Selected: ${fleetingNoteObj.filename}`)
      this.selectedNotes.push(fleetingNoteObj)
    },
    unselectNote(fleetingNoteObj) {
      console.log(`Unselected: ${fleetingNoteObj.filename}`)
      var index = this.selectedNotes.findIndex(n => n.path == fleetingNoteObj.path)
      this.selectedNotes.splice(index, 1)
    },
    focusNote(fleetingNoteObj) {
      console.log(`Focused: ${fleetingNoteObj.filename}`)
      console.log(this.focusedNoteItem)
      this.focusedNote = fleetingNoteObj
    },
    focusNext(c = 1) {
      var index = this.fleetingNotes.findIndex(i => i == this.focusedNote)
      var len = this.fleetingNotes.length
      if (index > -1) {
        if (index + c >= len) {
          this.focusedNote = this.fleetingNotes[0]
        }
        else if (index + c < 0) {
          this.focusedNote = this.fleetingNotes[len - 1]
        }
        else {
          this.focusedNote = this.fleetingNotes[index + c]
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
        }
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
          this.focusedNote = this.fleetingNotes[0]
          this.scrollFocusedIntoView()
          this.fullKeybuffer = ''
        }
        else if (this.keybuffer == "G")
        {
          var len = this.fleetingNotes.length
          this.focusedNote = this.fleetingNotes[len - 1]
          this.scrollFocusedIntoView()
          this.fullKeybuffer = ''
        }
        else if (this.keybuffer == " ")
        {
          this.getFocusedNoteItem().toggleSelectNote()
          this.fullKeybuffer = ''
        }
        else if (this.keybuffer == "t")
        {
          this.getFocusedNoteItem().addToStack()
          this.fullKeybuffer = ''
        }
        else if (this.keybuffer == "i")
        {
          this.getFocusedNoteItem().insertNote()
          this.fullKeybuffer = ''
        }
        else if (this.keybuffer == "x")
        {
          this.getFocusedNoteItem().deleteNote()
          this.fullKeybuffer = ''
        }
        else if (this.keybuffer == "e")
        {
          this.getFocusedNoteItem().editNote()
          this.fullKeybuffer = ''
        }
        else if (this.keybuffer == "yr")
        {
          var content = this.getFocusedNoteItem().content
          clipboard.writeText(content)
          this.fullKeybuffer = ''
        }
        else if (this.keybuffer == "yh")
        {
          var content = this.getFocusedNoteItem().renderedContent
          clipboard.writeHTML(content)
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
      }
    },
  },
  computed: {
  },
  mounted() {
    this.isMounted = true
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
  margin-left: 50px;
  padding: 20px;
}
</style>

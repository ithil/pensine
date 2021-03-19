<template>
  <div class="stack">
    <ul class="fleetingNotes">
      <li v-for="f in fleetingNotes" :key="f.filename">
        <fleeting-note :fleetingNoteObj="f" @selectNote="selectNote" @unselectNote="unselectNote">
        </fleeting-note>
      </li>
    </ul>
  <div class="sendFleetingNote">
    <textarea rows="7" cols="60" v-model="newFleetingNoteContent" @keyup="sendKeymonitor"></textarea>
  </div>
  </div>
</template>

<script>
import fs from 'fs'
import path from 'path'
import treeItem from '@/components/TreeView.vue'
import fleetingNote from '@/components/FleetingNote.vue'
import MarkdownIt from 'markdown-it'

export default {
  name: 'Stack',
  components: {
    treeItem,
    fleetingNote,
  },
  data() {
    return {
      fleetingNotes: null,
      selectedNotes: [],
      newFleetingNoteContent: '',
      md: new MarkdownIt(),
    }
  },
  methods: {
    selectNote(fleetingNoteObj) {
      console.log(`Selected: ${fleetingNoteObj.filename}`)
      selectedNotes.push(fleetingNoteObj)
    },
    unselectNote(fleetingNoteObj) {
      console.log(`Unselected: ${fleetingNoteObj.filename}`)
      var index = this.selectedNotes.findIndex(n => n.path == fleetingNoteObj.path)
      this.selectedNotes.splice(index, 1)
    },
    updateFleetingNotes() {
      this.fleetingNotes = this.stack.getContent().filter(i => !i.isStack)
      // console.log(this.fleetingNotes)
    },
    sendNewNote() {
      this.stack.sendText(this.newFleetingNoteContent)
      this.newFleetingNoteContent = ''
    },
    sendKeymonitor(event) {
      if (event.shiftKey && event.key == 'Enter') {
        this.sendNewNote()
        event.stopPropagation()
        event.preventDefault()
      }
    },
  },
  computed: {
    stack() {
      var name = this.$route.params.name
      if (name) {
        return this.$store.state.currentNoteCollection.stacks.getStackByPath(name)
      }
    },
    routeTab() {
      return this.$route.params.name || 'Stack'
    },
  },
  mounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('stacksItemAdd', this.updateFleetingNotes)
    collection.events.on('stacksItemChange', this.updateFleetingNotes)
    collection.events.on('stacksItemDelete', this.updateFleetingNotes)
    this.updateFleetingNotes()
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('stacksItemAdd', this.updateFleetingNotes)
    collection.events.removeListener('stacksItemChange', this.updateFleetingNotes)
    collection.events.removeListener('stacksItemDelete', this.updateFleetingNotes)
  },
  activated() {
    this.$store.commit('setTitle', 'Stack')
  },
  deactivated() {
    this.$store.commit('resetTitle')
  },
}
</script>
<style scoped lang='scss'>
.fleetingNotes {
  float: left;
  max-width: 550px;
}

.fleetingNotes li {
  list-style: none;
}

#stacksList /deep/ .tree-view.item li {
  list-style: none;
}

#stacksList /deep/ .tree-toggle.no-children {
  color: transparent !important;
}

.sendFleetingNote {
  margin-left: 80px;
}
</style>

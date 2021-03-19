<template>
  <div class="stack">
    <fleeting-note-list
    :fleetingNotes="fleetingNotes"
    >
  </fleeting-note-list>
  <div class="sendFleetingNote">
    <textarea rows="7" cols="60" v-model="newFleetingNoteContent" @keyup="sendKeymonitor"></textarea>
  </div>
  </div>
</template>

<script>
import fleetingNoteList from '@/components/FleetingNoteList.vue'

export default {
  name: 'Stack',
  components: {
    fleetingNoteList,
  },
  data() {
    return {
      fleetingNotes: [],
      newFleetingNoteContent: '',
    }
  },
  methods: {
    updateFleetingNotes() {
      this.fleetingNotes = this.stack.getContent().filter(i => !i.isStack)
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
.stack {
  background: rgba(0, 0, 0, 0.05)
}
.sendFleetingNote {
  margin-left: 80px;
}
</style>

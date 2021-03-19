<template>
  <div class="inbox">
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
  name: 'Inbox',
  components: {
    fleetingNoteList,
  },
  data() {
    return {
      inbox: new this.$global.pensieve.Inbox(this.$store.state.currentNoteCollection),
      stacks: this.$store.state.currentNoteCollection.stacks,
      fleetingNotes: [],
      newFleetingNoteContent: '',
      isMounted: false,
    }
  },
  methods: {
    updateFleetingNotes() {
      this.fleetingNotes = this.inbox.getList()
      // console.log(this.fleetingNotes)
    },
    sendNewNote() {
      this.inbox.sendText(this.newFleetingNoteContent)
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
    routeTab() {
      return 'Inbox'
    },
  },
  mounted() {
    this.isMounted = true
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('inboxItemAdd', this.updateFleetingNotes)
    collection.events.on('inboxItemChange', this.updateFleetingNotes)
    collection.events.on('inboxItemDelete', this.updateFleetingNotes)
    this.updateFleetingNotes()
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('inboxItemAdd', this.updateFleetingNotes)
    collection.events.removeListener('inboxItemChange', this.updateFleetingNotes)
    collection.events.removeListener('inboxItemDelete', this.updateFleetingNotes)
  },
  activated() {
    this.$store.commit('setTitle', 'Inbox')
  },
  deactivated() {
    this.$store.commit('resetTitle')
  },
}
</script>
<style scoped lang='scss'>
.inbox {
  background: rgba(0, 0, 0, 0.05)
}

.sendFleetingNote {
  margin-left: 80px;
}
</style>

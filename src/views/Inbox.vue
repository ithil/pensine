<template>
  <div class="inbox">
    <div class="filterOptions">
      <input v-model="filterTerm" type="search" placeholder="Filter ...">
      <select v-model="sortOrder" class="sortOrder">
        <option disabled value="">Sort Order</option>
        <option v-for="option in sortOptions" v-bind:value="option.value">
          {{ option.text }}
        </option>
      </select>
    </div>
    <fleeting-note-list
    :fleetingNotes="fleetingNotes"
    @updateFleetingNotes="updateFleetingNotes"
    @focusSendBox="focusSendBox"
    @changeSortOrder="changeSortOrder"
    @changeFilterTerm="changeFilterTerm"
    :sortOrder="sortOrder"
    :filterTerm="filterTerm"
    ref="fleetingNoteList"
    >
  </fleeting-note-list>
  <div class="sendFleetingNote">
    <textarea
    v-model="newFleetingNoteContent"
    @keyup="sendKeymonitor"
    ref="sendBox"
    placeholder="Send to Inbox ..."
    ></textarea>
  </div>
</div>
</template>

<script>
import fleetingNoteList from '@/components/FleetingNoteList.vue'
import Icon from '@/components/Icon.vue'

export default {
  name: 'Inbox',
  components: {
    fleetingNoteList,
    Icon,
  },
  data() {
    return {
      inbox: new this.$global.pensieve.Inbox(this.$store.state.currentNoteCollection),
      stacks: this.$store.state.currentNoteCollection.stacks,
      fleetingNotes: [],
      newFleetingNoteContent: '',
      isMounted: false,
      sortOrder: 'newestFirst',
      filterTerm: '',
      sortOptions: [
        { text: 'Oldest First', value: 'oldestFirst' },
        { text: 'Newest First', value: 'newestFirst' },
      ],
    }
  },
  methods: {
    updateFleetingNotes() {
      this.fleetingNotes = this.inbox.getList()
    },
    sendNewNote() {
      this.inbox.sendText(this.newFleetingNoteContent)
      this.newFleetingNoteContent = ''
      this.$refs.fleetingNoteList.$el.focus()
    },
    sendKeymonitor(event) {
      if (event.shiftKey && event.key == 'Enter') {
        this.sendNewNote()
        event.stopPropagation()
        event.preventDefault()
      }
      else if (event.key == 'Escape') {
        this.$refs.fleetingNoteList.$el.focus()
      }
    },
    focusSendBox() {
      this.$refs.sendBox.focus()
    },
    changeSortOrder(sortOrder) {
      this.sortOrder = sortOrder
    },
    changeFilterTerm(filterTerm) {
      this.filterTerm = filterTerm
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
  background: repeating-linear-gradient( 45deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 10px, rgba(0, 0, 0, 0.08) 10px, rgba(0, 0, 0, 0.08) 20px );
  padding-top: 20px;
  padding-left: 50px;
  min-height: -webkit-fill-available;
  .filterOptions {
    margin-bottom: 20px;
    input[type="search"] {
      width: 450px;
      border-radius: 5px;
      border: 2px solid #d6d6d6;
      padding: 5px;
      &:focus {
        outline: none;
        border-color: cornflowerblue;
      }
    }
    select.sortOrder {
      font-size: 12px;
      font-family: sans-serif;
      font-weight: 700;
      color: #444;
      padding: .6em 1.4em .5em .8em;
      max-width: 100%;
      box-sizing: border-box;
      margin: 0;
      border: 1px solid #aaa;
      border-radius: 5px;
      -moz-appearance: none;
      -webkit-appearance: none;
      appearance: none;
      background-color: #fff;
    }
  }
  .fleetingNoteList {
    padding-bottom: 40px;
  }
}

.sendFleetingNote {
  margin-left: 10px;
  position: fixed;
  bottom: 30px;
  textarea {
    border-radius: 10px;
    border: 2px solid #bfbfbf;
    padding: 10px;
    width: 38em;
    height: 1.1em;
    box-shadow: 0px 0px 15px #9e9e9ed9;
    &:focus {
      outline: none;
      border-color: cornflowerblue;
      height: 7em;
    }
  }
}
</style>

<template>
  <div class="inbox">
    <div class="header">
      <div class="name">
        <Icon name="Inbox" />
        Inbox
      </div>
      <div class="filterOptions">
        <input v-model="filterTerm" type="search" placeholder="Filter ..." ref="filterInput">
        <select v-model="sortOrder" class="sortOrder">
          <option disabled value="">Sort Order</option>
          <option v-for="option in sortOptions" v-bind:value="option.value">
            {{ option.text }}
          </option>
        </select>
      </div>
      <div>
      </div>
    </div>
    <fleeting-note-list
    :fleetingNotes="fleetingNotes"
    @updateFleetingNotes="updateFleetingNotes"
    @focusSendBox="focusSendBox"
    @focusFilterInput="focusFilterInput"
    @changeSortOrder="changeSortOrder"
    @changeFilterTerm="changeFilterTerm"
    @sendNewNote="_sendNewNote"
    :sortOrder="sortOrder"
    :filterTerm="filterTerm"
    ref="fleetingNoteList"
    >
  </fleeting-note-list>
  <div class="sendFleetingNote">
    <textarea
    v-model="newFleetingNoteContent"
    @keydown="sendKeymonitor"
    ref="sendBox"
    placeholder="Send to Inbox ..."
    ></textarea>
  </div>
</div>
</template>

<script>
import fleetingNoteList from '@/components/FleetingNoteList.vue'
import { bus } from '@/main'
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
        { text: 'Shortest First', value: 'shortestFirst' },
        { text: 'Longest First', value: 'longestFirst' },
        { text: 'Random', value: 'random' },
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
    _sendNewNote(text) {
      this.inbox.sendText(text)
    },
    sendKeymonitor(event) {
      if ((event.shiftKey && event.key == 'Enter') || (event.metaKey && event.key == 's')) {
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
    focusFilterInput() {
      this.$refs.filterInput.focus()
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
    this.$store.commit('setTitle', 'Inbox')
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('inboxItemAdd', this.updateFleetingNotes)
    collection.events.on('inboxItemChange', this.updateFleetingNotes)
    collection.events.on('inboxItemDelete', this.updateFleetingNotes)
    this.updateFleetingNotes()
    var $this = this
    bus.$on('filterTag', (opts) => {
      if (!$this._inactive) {
        this.filterTerm = `#${opts.tag}`
      }
    })
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('inboxItemAdd', this.updateFleetingNotes)
    collection.events.removeListener('inboxItemChange', this.updateFleetingNotes)
    collection.events.removeListener('inboxItemDelete', this.updateFleetingNotes)
    this.$store.commit('resetTitle')
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
  min-height: -webkit-fill-available;
  .header {
    position: sticky;
    padding: 10px 10px 10px 0px;
    display: flex;
    justify-content: space-between;
    top: 0px;
    left: 60px;
    background: linear-gradient(#9e9e9ec9, #7373731c);
    backdrop-filter: blur(4px);
    border-bottom: 1px solid #e8e8e8ab;
    z-index: 20;
    font-size: 20px;
    .name {
      display: flex;
      gap: 4px;
      font-family: Helvetica;
      background: black;
      color: white;
      padding: 3px 10px 3px 15px;
      border-radius: 5px;
      border-top-left-radius: 0px;
      border-bottom-left-radius: 0px;
    }
    .filterOptions {
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
  }
  .fleetingNoteList {
    padding-top: 30px;
    padding-bottom: 30px;
    margin: 0 auto;
    width: 630px;
    /deep/ .fleetingNote {
      scroll-margin-top: 55px;
      scroll-margin-bottom: 55px;
    }
  }
}

.sendFleetingNote {
  margin: auto auto;
  width: 38em;
  position: sticky;
  bottom: 10px;
  textarea {
    border-radius: 10px;
    border: 2px solid #bfbfbf;
    padding: 10px;
    width: 38em;
    height: 1.1em;
    box-shadow: 0px 0px 15px #9e9e9ed9;
    font-family: 'Code New Roman';
    &:focus {
      outline: none;
      border-color: cornflowerblue;
      height: 7em;
    }
  }
}
</style>

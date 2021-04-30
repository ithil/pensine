<template>
  <div class="stack">
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
    placeholder="Send to Stack ..."
    ></textarea>
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
      sortOrder: 'oldestFirst',
      filterTerm: '',
      sortOptions: [
        { text: 'Oldest First', value: 'oldestFirst' },
        { text: 'Newest First', value: 'newestFirst' },
      ],
    }
  },
  methods: {
    updateFleetingNotes() {
      this.fleetingNotes = this.stack.getContent().filter(i => !i.isStack)
    },
    sendNewNote() {
      this.stack.sendText(this.newFleetingNoteContent)
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
    stack() {
      var name = this.$route.params.name
      if (name) {
        return this.$store.state.currentNoteCollection.stacks.getStackByPath(name)
      }
    },
    routeTab() {
      if (this.stack) {
        return this.stack.name
      }
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
  background: rgba(0, 0, 0, 0.05);
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

<template>
  <div class="stack">
    <div class="header">
      <div class="name">
        <Icon name="Layers" />
        {{stack.relativePath}}
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
      <div class="substacks">
        <button class="substacksBtn" v-if="substacks.length > 0">
          <Icon name="Folder" />
          Substacks ({{substacks.length}})
        </button>
        <div class="substacksMenu">
          <a v-for="substack in substacks" href="#" @click="$router.push(`/stacks/${substack.relativePath}`)">
            <Icon name="Layers" />
            {{ substack.name }}
          </a>
        </div>
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
    :fleetingNoteOptions="{showRightHandRelations: true}"
    ref="fleetingNoteList"
    >
  </fleeting-note-list>
  <div class="sendFleetingNote">
    <textarea
    v-model="newFleetingNoteContent"
    @keydown="sendKeymonitor"
    ref="sendBox"
    placeholder="Send to Stack ..."
    ></textarea>
  </div>
  </div>
</template>

<script>
import fleetingNoteList from '@/components/FleetingNoteList.vue'
import { bus } from '@/main'
import Icon from '@/components/Icon.vue'

export default {
  name: 'Stack',
  components: {
    fleetingNoteList,
    Icon,
  },
  data() {
    return {
      stack: this.$store.state.currentNoteCollection.stacks.getStackByPath(this.$route.params.name),
      fleetingNotes: [],
      substacks: [],
      newFleetingNoteContent: '',
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
      var content = this.stack.getContent()
      this.fleetingNotes = content.filter(i => !i.isStack)
      this.substacks = content.filter(i => i.isStack)
    },
    sendNewNote() {
      this.stack.sendText(this.newFleetingNoteContent)
      this.newFleetingNoteContent = ''
      this.$refs.fleetingNoteList.$el.focus()
    },
    _sendNewNote(text) {
      this.stack.sendText(text)
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
      if (this.stack) {
        return {
          title: this.stack.name || 'Stack',
          tips: `${this.stack.relativePath} – ${this.fleetingNotes.length} items`,
        }
      }
      else {
        return {
          title: this.$route.params.name || 'Stack',
        }
      }
    },
  },
  mounted() {
    var collection = this.$store.state.currentNoteCollection
    this.$store.commit('setTitle', 'Stack')
    collection.events.on('stacksItemAdd', this.updateFleetingNotes)
    collection.events.on('stacksItemChange', this.updateFleetingNotes)
    collection.events.on('stacksItemDelete', this.updateFleetingNotes)
    this.updateFleetingNotes()
    var $this = this
    bus.$on('filterTag', (opts) => {
      if (!$this._inactive) {
        this.filterTerm = `#${opts.tag}`
      }
    })
    if (this.$route.query.note) {
      console.log(this.$route.query.note)
    }
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('stacksItemAdd', this.updateFleetingNotes)
    collection.events.removeListener('stacksItemChange', this.updateFleetingNotes)
    collection.events.removeListener('stacksItemDelete', this.updateFleetingNotes)
    this.$store.commit('resetTitle')
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
  background: radial-gradient(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1));
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
    .substacks {
      position: relative;
      display: inline-block;
      button.substacksBtn {
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
      }
      .substacksMenu {
        display: none;
        position: absolute;
        background-color: #f1f1f1;
        min-width: 160px;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
        z-index: 1;
        font-size: 13px;
        right: 0px;
        top: 28px;
        border-radius: 8px 8px 8px 8px;
        border: 2px solid rgba(207, 207, 216, 0.6);
        padding: 5px;
        a {
          font-family: sans-serif;
          color: black;
          padding: 5px 10px;
          text-decoration: none;
          display: block;
          border-radius: 5px;
          &:hover {
            background: rgba(207, 207, 216, 0.6);
          }
        }
      }
      &:hover .substacksMenu {
        display: block;
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

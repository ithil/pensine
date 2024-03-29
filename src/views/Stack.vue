<template>
  <div class="stack" :style="customBackground">
    <div class="blur"></div>
    <div class="header">
      <div class="name">
        <Icon :name="stackIcon ? stackIcon : 'Layers'" />
        {{stack.relativePath}}
      </div>
      <div class="filterOptions">
        <input v-model="filterTerm" type="search" placeholder="Filter ..." ref="filterInput" @keydown="filterInputKeymonitor">
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
    <note-list
    :notes="notes"
    @updateNotes="updateNotes"
    @focusSendBox="focusSendBox"
    @focusFilterInput="focusFilterInput"
    @changeSortOrder="changeSortOrder"
    @changeFilterTerm="changeFilterTerm"
    @sendNewNote="_sendNewNote"
    :stack="stack"
    :sortOrder="sortOrder"
    :filterTerm="filterTerm"
    :noteOptions="{showRightHandRelations: true}"
    :showLeftHandBox="true"
    ref="noteList"
    >
  </note-list>
  <div class="no-notes message-box" v-if="notes.length == 0">
    <Icon name="Ghost" />
    This stack does not have any notes.
  </div>
  <div class="sendNote">
    <textarea
    v-model="newNoteContent"
    @keydown="sendKeymonitor"
    ref="sendBox"
    placeholder="Send to Stack ..."
    ></textarea>
  </div>
  </div>
</template>

<script>
import NoteList from '@/components/NoteList.vue'
import { bus } from '@/main'
import Icon from '@/components/Icon.vue'

export default {
  name: 'Stack',
  components: {
    NoteList,
    Icon,
  },
  data() {
    return {
      stack: this.$store.state.currentNoteCollection.stacks.getStackByPath(this.$route.params.name),
      notes: [],
      lastUpdated: 0,
      substacks: [],
      newNoteContent: '',
      sortOrder: 'newestFirst',
      filterTerm: '',
      sortOptions: [
        { text: 'Oldest First', value: 'oldestFirst' },
        { text: 'Newest First', value: 'newestFirst' },
        { text: 'Cal: Oldest First', value: 'relatedDateOldestFirst' },
        { text: 'Cal: Newest First', value: 'relatedDateNewestFirst' },
        { text: 'Mod: Oldest First', value: 'modificationOldestFirst' },
        { text: 'Mod: Newest First', value: 'modificationNewestFirst' },
        { text: 'Most Relations', value: 'mostRelationsFirst' },
        { text: 'Fewest Relations', value: 'fewestRelationsFirst' },
        { text: 'Alphabetical', value: 'alphabetical' },
        { text: 'Shortest First', value: 'shortestFirst' },
        { text: 'Longest First', value: 'longestFirst' },
        { text: 'Random', value: 'random' },
      ],
      previouslyFocusedElement: null,
    }
  },
  methods: {
    updateNotes() {
      if ((new Date() - this.lastUpdated) > 1000 ) {
        var content = this.stack.getContent()
        this.notes = content.filter(i => !i.isStack)
        this.substacks = content.filter(i => i.isStack)
        this.lastUpdated = new Date()
        if (this.$refs.noteList?.focusedNotePath === '') {
          this.$refs.noteList.setFocusToFirstNote()
        }
      }
    },
    sendNewNote() {
      var notePath = this.stack.sendText(this.newNoteContent)
      if (notePath) {
        this.$refs.noteList.scrollToFocusedNoteOnNextUpdate = true
        this.$refs.noteList.setFocusedNotePath(notePath)
      }
      this.newNoteContent = ''
      this.$refs.noteList.$el.focus()
    },
    _sendNewNote(text, {scrollIntoView = false} = {}) {
      var notePath = this.stack.sendText(text)
      if (notePath) {
        this.$refs.noteList.scrollToFocusedNoteOnNextUpdate = true
        this.$refs.noteList.setFocusedNotePath(notePath)
      }
      return notePath
    },
    sendKeymonitor(event) {
      if ((event.shiftKey && event.key == 'Enter') || (event.metaKey && event.key == 's')) {
        this.sendNewNote()
        event.stopPropagation()
        event.preventDefault()
      }
      else if (event.key == 'Escape') {
        this.$refs.noteList.$el.focus()
      }
    },
    filterInputKeymonitor(event) {
      if (event.key == 'Enter') {
        this.$refs.noteList.$el.focus()
        this.$refs.noteList.setFocusToFirstNote()
        event.stopPropagation()
        event.preventDefault()
      }
      else if (event.key == 'Escape') {
        this.filterTerm = ''
        this.$refs.noteList.$el.focus()
        this.$refs.noteList.scrollFocusedIntoView()
      }
    },
    focusSendBox() {
      this.previouslyFocusedElement = document.activeElement
      this.$refs.sendBox.focus()
    },
    focusFilterInput() {
      this.previouslyFocusedElement = document.activeElement
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
        var routeTabData = {
          title: this.stack.name || 'Stack',
          tips: `${this.stack.relativePath} – ${this.notes.length} items`,
          tabClass: 'stack',
        }
        for (let p of ['icon', 'iconColor', 'iconBackground']) {
          let v = this.stack.metadata.get(`style.${p}`)
          if (v) {
            routeTabData[p] = v
          }
        }
        return routeTabData
      }
      else {
        return {
          title: this.$route.params.name || 'Stack',
        }
      }
    },
    customBackground() {
      var backgroundCss = this.stack.metadata.get('style.background')
      if (backgroundCss) {
        return `background: ${backgroundCss};`
      }
    },
    stackIcon() {
      let v = this.stack.metadata.get(`style.icon`)
      if (v) {
        return v
      }
    }
  },
  mounted() {
    var collection = this.$store.state.currentNoteCollection
    this.$store.commit('setTitle', 'Stack')
    collection.events.on('stacksItemAdd', this.updateNotes)
    collection.events.on('stacksItemChange', this.updateNotes)
    collection.events.on('stacksItemDelete', this.updateNotes)
    this.updateNotes()
    var $this = this
    bus.$on('filterTag', (opts) => {
      if (!$this._inactive) {
        this.filterTerm = `#${opts.tag}`
      }
    })
    if (this.$route.query.note) {
      console.log(this.$route.query.note)
    }
    var sortOrder = this.stack.metadata.get('sortOrder')
    if(sortOrder) {
      this.changeSortOrder(sortOrder)
    }
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('stacksItemAdd', this.updateNotes)
    collection.events.removeListener('stacksItemChange', this.updateNotes)
    collection.events.removeListener('stacksItemDelete', this.updateNotes)
    this.$store.commit('resetTitle')
  },
  activated() {
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
    }
    this.$store.commit('setTitle', 'Stack')
  },
  deactivated() {
    this.previouslyFocusedElement = document.activeElement
    this.$store.commit('resetTitle')
  },
}
</script>
<style scoped lang='scss'>
.stack {
  background: radial-gradient(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1));
  min-height: -webkit-fill-available;
  position: relative;
  .blur {
    background: rgba(255, 255, 255, 0.2);
    // backdrop-filter: blur(8px);
    min-height: 100%;
    width: 100%;
    position: absolute;
  }
  .header {
    position: sticky;
    padding: 10px 10px 10px 0px;
    display: flex;
    justify-content: space-between;
    top: 0px;
    left: 60px;
    background: linear-gradient(#9e9e9ec9, #7373731c);
    backdrop-filter: blur(4px);
    border-bottom: 1px solid #e8e8e863;
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
        text-align: center;
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
  .noteList {
    /deep/ .notes {
      margin: 0 auto;
      width: 630px;
      padding-top: 30px;
      padding-bottom: 30px;
    }
    /deep/ .note {
      scroll-margin-top: 55px;
      scroll-margin-bottom: 55px;
    }
  }
}
.message-box {
  margin: 0 auto;
  width: 630px;
  background: #c7c7c7;
  padding: 15px;
  border-radius: 10px;
  border: 2px solid #b7b7b7;
  font-style: italic;
}
.sendNote {
  margin: auto auto;
  width: fit-content;
  position: sticky;
  bottom: 10px;
  textarea {
    border-radius: 10px;
    border: 2px solid #bfbfbf;
    padding: 10px;
    width: 43em;
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

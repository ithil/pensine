<template>
  <div class="search">
    <div class="blur"></div>
    <div class="header">
      <div class="name">
        <Icon name="Search" />
        Search
      </div>
      <div class="filterOptions">
        <input v-model="searchTerm" type="search" placeholder="Search for ..." ref="searchInput" @keyup.enter="executeSearch">
        <button class="optionsButton" :class="{pressed: matchCase}" @click="matchCase = !matchCase">
          Aa
        </button>
        <button class="optionsButton" :class="{pressed: useRegex}" @click="useRegex = !useRegex">
          .*
        </button>
      </div>
      <div class="filterOptions">
        <select v-model="sortOrder" class="sortOrder">
          <option disabled value="">Sort Order</option>
          <option v-for="option in sortOptions" v-bind:value="option.value">
            {{ option.text }}
          </option>
        </select>
      </div>
    </div>
    <fleeting-note-list
    :fleetingNotes="fleetingNotes"
    @updateFleetingNotes="updateFleetingNotes"
    @changeSortOrder="changeSortOrder"
    @focusFilterInput="$refs.searchInput.focus()"
    :sortOrder="sortOrder"
    :fleetingNoteOptions="{showRightHandRelations: true, showStackBadge: true}"
    :showLeftHandBox="true"
    :enableStackFilterBox="true"
    :outlineOpen="true"
    ref="fleetingNoteList"
    >
  </fleeting-note-list>
  <div class="no-notes message-box" v-if="searchInProgess">
    <Icon name="Loader" />
    Search in progess ...
  </div>
  <div class="no-notes message-box" v-if="noResults">
    <Icon name="Ghost" />
    No results found for <code>{{executedSearchTerm}}</code>
  </div>
  </div>
</template>

<script>
import fleetingNoteList from '@/components/FleetingNoteList.vue'
import { bus } from '@/main'
import Icon from '@/components/Icon.vue'

export default {
  name: 'Search',
  components: {
    fleetingNoteList,
    Icon,
  },
  data() {
    return {
      fleetingNotes: [],
      lastUpdated: 0,
      sortOrder: 'newestFirst',
      searchTerm: '',
      matchCase: false,
      useRegex: false,
      executedSearchTerm: '',
      noResults: false,
      searchInProgess: false,
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
    updateFleetingNotes() {
      if ((new Date() - this.lastUpdated) > 1000 ) {
        this.executeSearch()
        this.lastUpdated = new Date()
      }
    },
    executeSearch() {
      var searchTerm = this.searchTerm
      if (searchTerm.length > 0) {
        this.executedSearchTerm = searchTerm
        this.fleetingNotes = []
        this.searchInProgess = true
        var useRegex = false
        if (this.useRegex) {
          searchTerm = new RegExp(searchTerm, this.matchCase ? '' : 'i')
          useRegex = true
        }
        else if (!this.matchCase) {
          // Escape RegExp: https://stackoverflow.com/a/6969486
          let escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          searchTerm = new RegExp(escapedSearchTerm, 'i')
          useRegex = true
        }
        var collection = this.$store.state.currentNoteCollection
        collection.searchFleetingNotes(searchTerm, useRegex).then(notes => {
          this.searchInProgess = false
          this.fleetingNotes = notes
          this.$refs.fleetingNoteList.clearRelationFilter()
          this.$refs.fleetingNoteList.clearStackFilter()
          if (notes.length < 1) {
            this.noResults = true
          }
          else {
            this.noResults = false
            this.$refs.fleetingNoteList.$el.focus()
            var $this = this
            setTimeout(function () { // This is just a dirty hack so I can go to bed
              $this.$refs.fleetingNoteList.setFocusToFirstNote()
              $this.$refs.fleetingNoteList.scrollFocusedIntoView()
            }, 50)
          }
        })
      }
    },
    changeSortOrder(sortOrder) {
      this.sortOrder = sortOrder
    },
  },
  computed: {
    routeTab() {
      return {
        title: this.executedSearchTerm || 'Search',
        tips: `${this.fleetingNotes.length} results`,
      }
    },
  },
  mounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('stacksItemAdd', this.updateFleetingNotes)
    collection.events.on('stacksItemChange', this.updateFleetingNotes)
    collection.events.on('stacksItemDelete', this.updateFleetingNotes)
    // this.updateFleetingNotes()
    this.$refs.searchInput.focus()
    var $this = this
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('stacksItemAdd', this.updateFleetingNotes)
    collection.events.removeListener('stacksItemChange', this.updateFleetingNotes)
    collection.events.removeListener('stacksItemDelete', this.updateFleetingNotes)
  },
  activated() {
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
    }
  },
  deactivated() {
    this.previouslyFocusedElement = document.activeElement
  },
}
</script>
<style scoped lang='scss'>
.search {
  --header-background: #7373731c;
  background: radial-gradient(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.1));
  min-height: -webkit-fill-available;
  position: relative;
  .blur {
    background: rgba(255, 255, 255, 0.2);
    // backdrop-filter: blur(8px);
    min-height: 100%;
    width: 100%;
    position: absolute;
    z-index: -10;
  }
  .header {
    position: sticky;
    padding: 10px 10px 10px 0px;
    display: flex;
    justify-content: space-between;
    top: 0px;
    left: 60px;
    background: var(--header-background);
    backdrop-filter: blur(4px);
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
  }
  .fleetingNoteList {
    /deep/ .fleetingNotes {
      margin: 0 auto;
      width: 630px;
      padding-top: 30px;
      padding-bottom: 30px;
    }
    /deep/ .fleetingNote {
      scroll-margin-top: 101px;
      scroll-margin-bottom: 5px;
      .rightHandRelations {
        right: -240px;
      }
    }
    /deep/ .stackFilterBox {
      position: sticky;
      top: 49px;
      z-index: 1;
      background: var(--header-background);
      backdrop-filter: blur(4px);
      padding: 5px;
      border-bottom: 1px solid #e8e8e8ab;
      margin-bottom: 0;
    }
    /deep/ .leftHandBox {
      height: 79.4vh;
    }
  }
  button.optionsButton {
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
    &.pressed {
      background: #aebdd9;
      border-color: cornflowerblue;
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
</style>

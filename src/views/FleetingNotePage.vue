<template>
  <div class="fleetingNotePage" v-if="fn">
    <div class="parentNote column">
    <fleeting-note-list
    :fleetingNotes="[fn]"
    @updateFleetingNotes="updateFleetingNotes"
    @tabRight="focusLinkedNotes"
    @tabLeft="focusLinkedNotes"
    :fleetingNoteOptions="{showStackBadge: true}"
    :enableStatusBar="false"
    ref="parentNote"
    >
  </fleeting-note-list>
    </div>
    <div class="linkedNotes column">
    <fleeting-note-list
    :fleetingNotes="linkedNotes.map(f => f.fnObj)"
    @updateFleetingNotes="updateFleetingNotes"
    @tabRight="focusParentNote"
    @tabLeft="focusParentNote"
    @focusSendBox="focusSendBox"
    @focusFilterInput="focusFilterInput"
    @changeSortOrder="changeSortOrder"
    @changeFilterTerm="changeFilterTerm"
    :sortOrder="sortOrder"
    :filterTerm="filterTerm"
    :fleetingNoteOptions="{showStackBadge: true}"
    :enableStackFilterBox="true"
    ref="linkedNotes"
    >
  </fleeting-note-list>
    </div>
  </div>
</template>

<script>
import fleetingNoteList from '@/components/FleetingNoteList.vue'
import fleetingNote from '@/components/FleetingNote.vue'
import { bus } from '@/main'

export default {
  name: 'FleetingNotePage',
  components: {
    fleetingNoteList,
    fleetingNote,
  },
  data() {
    return {
      fn: this.$store.state.currentNoteCollection.getFleetingNoteByPath(
        this.$route.params.name.split('/').map(c => decodeURIComponent(c)).join('/')
      ),
      decodedPath: this.$route.params.name.split('/').map(c => decodeURIComponent(c)).join('/'),
      lastUpdated: 0,
      sortOrder: 'inherit',
      filterTerm: '',
      previouslyFocusedElement: null,
    }
  },
  methods: {
    updateFleetingNotes() {
      if ((new Date() - this.lastUpdated) > 1000 ) {
        this.fn = this.$store.state.currentNoteCollection.getFleetingNoteByPath(
          this.decodedPath
        )
        this.lastUpdated = new Date()
      }
    },
    focusLinkedNotes() {
      this.$refs.linkedNotes.$el.focus()
    },
    focusParentNote() {
      this.$refs.parentNote.$el.focus()
    },
    focusSendBox() {
      // Not implemented
    },
    focusFilterInput() {
      // Not implemented
    },
    changeSortOrder(sortOrder) {
      this.sortOrder = sortOrder
    },
    changeFilterTerm(filterTerm) {
      this.filterTerm = filterTerm
    },
  },
  computed: {
    linkedNotes() {
      var notes = []
      if (this.fn.hasMetadata) {
        var metadata = this.fn.getMetadata()
        if (metadata.links) {
          for (let i of metadata.links) {
            let fnObj = this.$store.state.currentNoteCollection.getFleetingNoteByPath(i[0])
            if (fnObj) {
              notes.push({type: 'link', fnObj: fnObj, edgeProperties: i[1]})
            }
          }
        }
        if (metadata.backlinks) {
          for (let i of metadata.backlinks) {
            let fnObj = this.$store.state.currentNoteCollection.getFleetingNoteByPath(i[0])
            if (fnObj) {
              notes.push({type: 'backlink', fnObj: fnObj, edgeProperties: i[1]})
            }
          }
        }
      }
      return notes
    },
    stack() {
      if (this.fn) {
        return this.$store.state.currentNoteCollection.stacks.getStackByPath(this.fn.stack)
      }
    },
    routeTab() {
      if (this.fn) {
        var routeTabData = {
          title: this.fn.title || this.fn.content.slice(0, 20),
          tips: this.fn.abstract || this.fn.content.slice(0, 400),
        }
        for (let p of ['icon', 'iconColor', 'iconBackground']) {
          let v = this.stack.metadata.get(`style.${p}`)
          if (v) {
            routeTabData[p] = v
          }
        }
        return routeTabData
      }
    },
  },
  mounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('stacksItemAdd', this.updateFleetingNotes)
    collection.events.on('stacksItemChange', this.updateFleetingNotes)
    collection.events.on('stacksItemDelete', this.updateFleetingNotes)
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
<style lang='scss'>
.fleetingNotePage {
  background: rgba(0, 0, 0, 0.05);
  min-height: -webkit-fill-available;
  overflow: hidden;
  .column {
    float: left;
    // width: 45%;
    width: calc(45vw + 4.9px);
    padding: 30px 30px 0px 30px;
    overflow-x: hidden;
    overflow-y: auto;
    height: 89.1vh;
    &::-webkit-scrollbar {
      display: none;
    }
  }
  @media screen and (max-width: 1215px) {
    .column {
      margin: 0 auto;
      width: 630px;
      float: none;
    }
  }
  .parentNote:focus-within {
    background: linear-gradient(90deg, #0090f71a, transparent);
  }
  .linkedNotes:focus-within {
    background: linear-gradient(90deg, transparent, #0090f71a);
  }
  .parentNote .fleetingNote {
    border-color: #81c181;
  }
  .linkedNote {
    display: flex;
    .relation {
      width: 100px;
      padding: 15px;
      .type {
        text-transform: capitalize;
        font-family: 'Cambria';
        background: #2d2d2d;
        color: white;
        padding: 7px;
        border-radius: 10px;
      }
      .badge {
        padding: 5px;
        background: #cacaca;
        border-radius: 5px;
        font-size: 10px;
        width: fit-content;
        color: black;
        margin-top: 4px;
        margin-left: 10px;
        border: 1px solid #6d6d6d;
        font-family: 'Lucida Grande';
        &.badge-conflicts {
          color: #b50f0f;
          background: #d29b9b;
          border-color: #b50f0f;
        }
        &.badge-agrees {
          color: #0d3e0d;
          background: #a9c3a9;
          border-color: #0d3e0d;
        }
      }
    }
  }
}
</style>

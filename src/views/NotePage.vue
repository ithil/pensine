<template>
  <div class="notePage" v-if="note">
    <div class="parentNote column">
    <note-list
    :notes="[note]"
    @updateNotes="updateNotes"
    @tabRight="focusLinkedNotes"
    @tabLeft="focusLinkedNotes"
    :noteOptions="{showStackBadge: true}"
    :enableStatusBar="false"
    ref="parentNote"
    >
  </note-list>
    </div>
    <div class="linkedNotes column">
    <note-list
    :notes="linkedNotes.map(f => f.noteObj)"
    @updateNotes="updateNotes"
    @tabRight="focusParentNote"
    @tabLeft="focusParentNote"
    @focusSendBox="focusSendBox"
    @focusFilterInput="focusFilterInput"
    @changeSortOrder="changeSortOrder"
    @changeFilterTerm="changeFilterTerm"
    :sortOrder="sortOrder"
    :filterTerm="filterTerm"
    :noteOptions="{showStackBadge: true}"
    :enableStackFilterBox="true"
    ref="linkedNotes"
    >
  </note-list>
    </div>
  </div>
</template>

<script>
import NoteList from '@/components/NoteList.vue'
import Note from '@/components/Note.vue'
import { bus } from '@/main'

export default {
  name: 'note-page',
  components: {
    NoteList,
    Note,
  },
  data() {
    return {
      note: this.$store.state.currentNoteCollection.getNoteByPath(
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
    updateNotes() {
      if ((new Date() - this.lastUpdated) > 1000 ) {
        this.note = this.$store.state.currentNoteCollection.getNoteByPath(
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
      if (this.note.hasMetadata) {
        var metadata = this.note.getMetadata()
        if (metadata.links) {
          for (let i of metadata.links) {
            let noteObj = this.$store.state.currentNoteCollection.getNoteByPath(i[0])
            if (noteObj) {
              notes.push({type: 'link', noteObj: noteObj, edgeProperties: i[1]})
            }
          }
        }
        if (metadata.backlinks) {
          for (let i of metadata.backlinks) {
            let noteObj = this.$store.state.currentNoteCollection.getNoteByPath(i[0])
            if (noteObj) {
              notes.push({type: 'backlink', noteObj: noteObj, edgeProperties: i[1]})
            }
          }
        }
      }
      return notes
    },
    stack() {
      if (this.note) {
        return this.$store.state.currentNoteCollection.stacks.getStackByPath(this.note.stack)
      }
    },
    routeTab() {
      if (this.note) {
        var routeTabData = {
          title: this.note.title || this.note.content.slice(0, 20),
          tips: this.note.abstract || this.note.content.slice(0, 400),
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
    collection.events.on('stacksItemAdd', this.updateNotes)
    collection.events.on('stacksItemChange', this.updateNotes)
    collection.events.on('stacksItemDelete', this.updateNotes)
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('stacksItemAdd', this.updateNotes)
    collection.events.removeListener('stacksItemChange', this.updateNotes)
    collection.events.removeListener('stacksItemDelete', this.updateNotes)
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
.notePage {
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
  .parentNote .note {
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

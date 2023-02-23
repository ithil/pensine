<template>
  <div class="nodeExplorer" v-if="note">
    <div class="column">
      <node-tree
      class="item"
      v-for="(child, index) in tree"
      :key="child.id"
      :passedKey="`${index}`"
      :item="child"
      :focusedId="focused"
      @updateParentsChildren="updateChildren"
      >
    </node-tree>
  </div>
  <div class="focusedNote column" v-if="noteObj">
    <note
    :noteObj="noteObj"
    :options="{showStackBadge: true}"
    class="focusedNote"
    ref="noteItem"
    >
    </note>
    <note-list
    :notes="focusedNoteRelations"
    :noteOptions="{showStackBadge: true}"
    @changeSortOrder="changeSortOrder"
    @changeFilterTerm="changeFilterTerm"
    :sortOrder="sortOrder"
    :filterTerm="filterTerm"
    ref="noteList"
    >
  </note-list>
  </div>
</div>
</template>

<script>
import NoteList from '@/components/NoteList.vue'
import Note from '@/components/Note.vue'
import nodeTree from '@/components/NodeTree.vue'

import { bus } from '@/main'

export default {
  name: 'NodeExplorer',
  components: {
    NoteList,
    Note,
    nodeTree,
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
      tree: [],
      focused: '',
      focusedNoteObj: null,
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
    updateChildren() {
      this.tree.children = this.tree.getChildren()
    },
    getChildGetter() {
      var $this = this
      var childGetter = function() {
        var childs = []
        for (let r of $this.getLinkedNotes(this.noteObj)) {
          childs.push({
            name: r.noteObj.abstract,
            noteObj: r.noteObj,
            id: `${this.id} ${r.noteObj.relativePath}`,
            getChildren() { return $this.getChildGetter().bind(this)() },
            click() { $this.focused = this.id; $this.focusedNoteObj = this.noteObj },
          })
        }
        return childs
      }
      return childGetter
    },
    getLinkedNotes(note) {
      var notes = []
      if (note.hasMetadata) {
        var metadata = note.getMetadata()
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
    changeSortOrder(sortOrder) {
      this.sortOrder = sortOrder
    },
    changeFilterTerm(filterTerm) {
      this.filterTerm = filterTerm
    },
  },
  computed: {
    routeTab() {
      if (this.note) {
        return {
          title: this.note.title || this.note.content.slice(0, 20),
          tips: this.note.abstract || this.note.content.slice(0, 400),
        }
      }
    },
    focusedNoteRelations() {
      if (this.noteObj) {
        return this.getLinkedNotes(this.noteObj).map(r => r.noteObj)
      }
      else {
        return []
      }
    },
  },
  mounted() {
    var $this = this
    this.tree.push({
      name: this.note.abstract,
      noteObj: this.note,
      id: `${this.note.relativePath}`,
      getChildren() {
        var childs = []
        for (let r of $this.getLinkedNotes($this.note)) {
          childs.push({
            name: r.noteObj.abstract,
            noteObj: r.noteObj,
            id: `${this.id} ${r.noteObj.relativePath}`,
            getChildren() { return $this.getChildGetter().bind(this)() },
            click() { $this.focused = this.id; $this.focusedNoteObj = this.noteObj },
          })
        }
        return childs
      },
      click() { $this.focused = this.id; $this.focusedNoteObj = this.noteObj },
    })
  },
  unmounted() {
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
.nodeExplorer {
  background: rgba(0, 0, 0, 0.05);
}

.column {
  float: left;
  width: 50%;
  padding: 30px 30px 0px 30px;
  overflow-x: hidden;
  overflow-y: auto;
  height: 89.1vh;
  &::-webkit-scrollbar {
    display: none;
  }
  &.focusedNote {
    width: 40%;
  }
}
.note.focusedNote {
  border-color: #81c181;
  margin-bottom: 20px;
}

.nodeExplorer {

  .node-tree {
    list-style: none;
    margin-block-start: 0;
    li {
      list-style: none;
    }
  }

  .tree-row {
    margin-top: 10px;
    display: inline-flex;
    width: 100%;
    .tree-toggle {
      font-size: 18px;
      margin-right: 5px;
      align-self: center;
    }
    .position {
      input {
        user-select: all;
        width: 25px;
        margin-right: 10px;
        background: none;
        border: 1px solid #dddddd;
        text-align: center;
        height: 20px;
      }
    }
  }

  .tree-element:hover {
    .stack {
      visibility: visible;
      opacity: 1;
      height: auto;
      width: auto;
      font-size: 12px;
    }
  }

  .tree-element {
    border: 1px solid #bbbbbb;
    background: #d3d3d3;
    margin-top: 2px;
    padding: 2px;
    border-radius: 5px;
    width: 100%;
    min-height: 23px;
    display: inline-flex;
    &.focused {
      outline: 1px cornflowerblue solid;
    }
    .name {
      flex-grow: 1;
      &.title {
        font-weight: bold;
      }
    }
    .stack {
      visibility: hidden;
      opacity: 0;
      background: black;
      color: white;
      font-size: 0;
      padding: 3px;
      border-radius: 6px;
      flex-shrink: 0;
      align-self: center;
      transition: visibility 0.1s linear, opacity 0.1s linear, height 0.1s linear, width 0.1s linear;
      height: 0;
      width: 0;
    }
    .deleteHandle {
      margin: 0px 3px 0px 3px;
      &:hover {
        color: #e34545;
      }
    }
    .handle {
      cursor: pointer;
      background: none;
      transition: all .1s ease-in;
      align-self: center;
      &:hover {
        background: #dddddd;
        border-radius: 5px;
      }
    }
    .moveHandles {
      flex-shrink: 0;
      align-self: center;
      background: #8181812b;
      border-radius: 5px;
      margin: 0px 3px 0px 3px;
      padding: 1px;
      border: 1px solid #00000030;
    }
    &[data-stack="tags"] {
      border-width: 2px;
      border-color: #599584;
    }
    &[data-stack="bib"] {
      border-width: 2px;
      border-color: #956459;
    }
    &[data-stack^="calendar"] {
    }
    &[data-stack="places"] {
      background: hsl(38, 97%, 76%);
      color: hsla(19, 30%, 35%, 1);
      border: 1.5px solid rgb(197, 166, 112);
      .svg-icon {
        color: #bf3516;
      }
    }
    &[data-stack="people"] {
      background: hsl(38, 97%, 76%);
      color: hsla(19, 30%, 35%, 1);
      border: 1.5px solid rgb(197, 166, 112);
    }
    &[data-stack="groups"] {
      background: hsl(38, 97%, 76%);
      color: hsla(19, 30%, 35%, 1);
      border: 1.5px solid rgb(197, 166, 112);
      .svg-icon {
        color: #428547;
      }
    }
  }
}
</style>

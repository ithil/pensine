<template>
  <div class="nodeExplorer" v-if="fn">
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
  <div class="focusedNote column" v-if="focusedFnObj">
    <fleeting-note
    :fleetingNoteObj="focusedFnObj"
    :options="{showStackBadge: true}"
    class="focusedNote"
    ref="fleetingNoteItem"
    >
    </fleeting-note>
    <fleeting-note-list
    :fleetingNotes="focusedNoteRelations"
    :fleetingNoteOptions="{showStackBadge: true}"
    sortOrder="inherit"
    ref="fleetingNoteList"
    >
  </fleeting-note-list>
  </div>
</div>
</template>

<script>
import fleetingNoteList from '@/components/FleetingNoteList.vue'
import fleetingNote from '@/components/FleetingNote.vue'
import nodeTree from '@/components/NodeTree.vue'

import { bus } from '@/main'

export default {
  name: 'NodeExplorer',
  components: {
    fleetingNoteList,
    fleetingNote,
    nodeTree,
  },
  data() {
    return {
      fn: this.$store.state.currentNoteCollection.getFleetingNoteByPath(
        this.$route.params.name.split('/').map(c => decodeURIComponent(c)).join('/')
      ),
      decodedPath: this.$route.params.name.split('/').map(c => decodeURIComponent(c)).join('/'),
      sortOrder: 'newestFirst',
      filterTerm: '',
      tree: [],
      focused: '',
      focusedFnObj: null,
      previouslyFocusedElement: null,
    }
  },
  methods: {
    updateFleetingNotes() {
      this.fn = this.$store.state.currentNoteCollection.getFleetingNoteByPath(
        this.decodedPath
      )
    },
    updateChildren() {
      this.tree.children = this.tree.getChildren()
    },
    getChildGetter() {
      var $this = this
      var childGetter = function() {
        var childs = []
        for (let r of $this.getLinkedNotes(this.fnObj)) {
          childs.push({
            name: r.fnObj.abstract,
            fnObj: r.fnObj,
            id: `${this.id} ${r.fnObj.relativePath}`,
            getChildren() { return $this.getChildGetter().bind(this)() },
            click() { $this.focused = this.id; $this.focusedFnObj = this.fnObj },
          })
        }
        return childs
      }
      return childGetter
    },
    getLinkedNotes(fn) {
      var notes = []
      if (fn.hasMetadata) {
        var metadata = fn.getMetadata()
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
  },
  computed: {
    routeTab() {
      if (this.fn) {
        return {
          title: this.fn.title || this.fn.content.slice(0, 20),
          tips: this.fn.abstract || this.fn.content.slice(0, 400),
        }
      }
    },
    focusedNoteRelations() {
      if (this.focusedFnObj) {
        return this.getLinkedNotes(this.focusedFnObj).map(r => r.fnObj)
      }
      else {
        return []
      }
    },
  },
  mounted() {
    var $this = this
    this.tree.push({
      name: this.fn.abstract,
      fnObj: this.fn,
      id: `${this.fn.relativePath}`,
      getChildren() {
        var childs = []
        for (let r of $this.getLinkedNotes($this.fn)) {
          childs.push({
            name: r.fnObj.abstract,
            fnObj: r.fnObj,
            id: `${this.id} ${r.fnObj.relativePath}`,
            getChildren() { return $this.getChildGetter().bind(this)() },
            click() { $this.focused = this.id; $this.focusedFnObj = this.fnObj },
          })
        }
        return childs
      },
      click() { $this.focused = this.id; $this.focusedFnObj = this.fnObj },
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
.fleetingNote.focusedNote {
  border-color: #81c181;
  margin-bottom: 20px;
}

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
</style>

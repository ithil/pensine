<template>
  <div>
    <div style='width:100%;' class='navbar-tree'>
      <tree-item
      class='item'
      v-for='(tree, index) in treeData'
      :item='tree'
      :key='index'
      @make-folder='makeFolder'
      @add-item='addItem'
      ></tree-item>
    </div>
  </div>
</template>

<script>
  import Vue from 'vue'
  import fs from 'fs'
  import treeItem from './TreeView.vue'
  import { bus } from '../main'

  export default {
    name: 'nav-bar',
    components: {
      treeItem
    },
    computed: {

    },
    data () {
      return {
        treeData: [
        ]
      }
    },
    methods: {
      // Methods go here
      makeFolder: function (item) {
        Vue.set(item, 'children', [])
        this.addItem(item)
      },
      addItem: function (item) {
        item.children.push({
          name: 'new stuff'
        })
      updateAllNotes() {
        var allNotes = this.$store.state.currentNoteCollection.allNotes
        var allNotesNode = this.treeData.find(node => node.name == 'All Notes')
        allNotesNode.badge = allNotes.length
        allNotesNode.children = []
        allNotes.forEach((n, i) => {
          allNotesNode.children.push({
            key: n.id + 91,
            name: n.name,
            icon: '✣',
            filename: n.contentPath,
            click: function () {
              $this.$router.push(`/editor/${n.id}`).catch(err => {
                // Ignore the vuex err regarding  navigating to the page they are already on.
                if (
                  err.name !== 'NavigationDuplicated' &&
                  !err.message.includes('Avoided redundant navigation to current location')
                ) {
                  // But print any other errors to the console
                  console.error(err)
                }
              })
            }
          })
        })
      },
      updateStacks() {
        var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
        var stacksNode = this.treeData.find(node => node.name == 'Stacks')
        stacksNode.badge = stacks.length
        stacksNode.children = []
        stacks.forEach((s, i) => {
          stacksNode.children.push({
            key: i + 777,
            name: s.relativePath,
            badge: s.getCountOfNotes(),
            click: function () {
              $this.$router.push(`/stacks/${s.relativePath}`).catch(err => {
                // Ignore the vuex err regarding  navigating to the page they are already on.
                if (
                  err.name !== 'NavigationDuplicated' &&
                  !err.message.includes('Avoided redundant navigation to current location')
                ) {
                  // But print any other errors to the console
                  console.error(err)
                }
              })
            }
          })
        })
      },
      updateTagTree() {
        var tagTree = this.$store.state.currentNoteCollection.getTagTree()
        var tagMetadata = new this.$global.pensieve.Tags(this.$store.state.currentNoteCollection)
        var tagTreeNode = this.treeData.find(node => node.name == 'Tags')
        tagTreeNode.children = []
        var currentKey = 201
        var convertTree = function(tree, level, head, node) {
          for (var t of Object.keys(tree)) {
            var newHead = head + (head=='' ? '' : '.') + t
            var currentTagMetadata = tagMetadata.getTag(newHead)
            var tagNode = {
              key: currentKey,
              name: t,
              icon: `${(currentTagMetadata && currentTagMetadata.icon) ? currentTagMetadata.icon : '#'}`,
              children: [],
            }
            currentKey++
            convertTree(tree[t].subtags, level+1, newHead, tagNode)
            tree[t].notes.forEach((n, i) => {
              tagNode.children.push({
                key: currentKey,
                name: n.name,
                icon: '✣',
                children: [],
                click: function () {
                  $this.$router.push(`/editor/${n.id}`).catch(err => {
                    // Ignore the vuex err regarding  navigating to the page they are already on.
                    if (
                      err.name !== 'NavigationDuplicated' &&
                      !err.message.includes('Avoided redundant navigation to current location')
                    ) {
                      // But print any other errors to the console
                      console.error(err)
                    }
                  })
                }
              })
              currentKey++
            })
            node.children.push(tagNode)
          }
        }
        convertTree(tagTree, 0, '', tagTreeNode)
      },
  },
    mounted () {
      var $this = this
      var createTree = () => {
        this.treeData = [
          { name: 'Home', click: () => { this.$router.push('/') }},
          { name: 'Inbox', click: () => { this.$router.push('/inbox') }},
        ]
        var stacksNode = {
          key: 777,
          name: 'Stacks',
          children: []
        }
        this.treeData.push(stacksNode)
        this.updateStacks()
        var allNotes = this.$store.state.currentNoteCollection.allNotes
        var allNotesNode = {
          key: 90,
          name: 'All Notes',
          children: []
        }
        this.treeData.push(allNotesNode)
        this.updateAllNotes()
        var tagTreeNode = {
          key: 200,
          name: 'Tags',
          children: []
        }
        this.treeData.push(tagTreeNode)
        this.updateTagTree()
      }
      createTree()
    bus.$on('noteCollectionChanged', () => {
      createTree()
    })
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('stacksItemAdd', this.updateStacks)
    collection.events.on('stacksItemChange', this.updateStacks)
    collection.events.on('stacksItemDelete', this.updateStacks)
    collection.events.on('noteAdd', this.updateAllNotes)
    collection.events.on('noteChange', this.updateAllNotes)
    collection.events.on('noteDelete', this.updateAllNotes)
    collection.events.on('noteAdd', this.updateTagTree)
    collection.events.on('noteChange', this.updateTagTree)
    collection.events.on('noteDelete', this.updateTagTree)
  },
    unmounted() {
      var collection = this.$store.state.currentNoteCollection
      collection.events.removeListener('stacksItemAdd', this.updateStacks)
      collection.events.removeListener('stacksItemChange', this.updateStacks)
      collection.events.removeListener('stacksItemDelete', this.updateStacks)
      collection.events.removeListener('noteAdd', this.updateAllNotes)
      collection.events.removeListener('noteChange', this.updateAllNotes)
      collection.events.removeListener('noteDelete', this.updateAllNotes)
      collection.events.removeListener('noteAdd', this.updateTagTree)
      collection.events.removeListener('noteChange', this.updateTagTree)
      collection.events.removeListener('noteDelete', this.updateTagTree)
    },
  }
</script>

<style scoped lang='scss'>
* {
  color: #ababab;
  font-family: 'Avenir Next';
  font-size: 14px;
}

ul {
    padding: 0;
    margin: 0;
}
.navbar-tree {
  user-select: none;
  margin-top: 10px;
}
.navbar-tree /deep/ ul {
  padding: 0;
}
.navbar-tree /deep/ .tree-view.item {
  margin-left: 10px;
}
.navbar-tree /deep/ .tree-view.item {
  ul, li {
    list-style: none;
  }
  // .toggle::before {
  //   font-family: 'Octicons Regular';
  //   font-weight: normal;
  //   font-style: normal;
  //   display: inline-block;
  //   line-height: 1;
  //   -webkit-font-smoothing: antialiased;
  //   text-decoration: none;
  //   font-size: 12px;
  //   width: 12px;
  //   height: 12px;
  //   content: "\f0a3";
  // }
}
.navbar-tree /deep/ .tree-row {
  display: flex;
  cursor: default;
  .tree-toggle {
    color: #ababab;
    margin-right: 3px;
    &.no-children {
      color: transparent !important;
    }
  }
  .tree-name {
    flex-grow: 1;
  }
}
.navbar-tree /deep/ .tree-badge {
  background-color: rgb(66, 66, 66);
  color: #dadada;
  font-size: 11px;
  font-weight: bold;
  border-radius: 5px;
  padding: 2px;
  padding-right: 4px;
  padding-left: 4px;
}

.navbar-tree /deep/ .tree-icon {
    min-width: 18px;
    font-size: 12px;
    font-weight: bold;
    color: white;
    padding-left: 2px;
    font-family: Monaco;
    text-align: center;
}

.navbar-tree /deep/ .row_data {
  display: flex;
  justify-content: left;
}
.navbar-tree /deep/ .row_data :nth-child(2) {
  flex-grow: 1;
  white-space: 'nowrap';
  overflow: 'hidden';
  text-overflow: ellipsis;

}
.navbar-tree /deep/ .row_data :nth-child(1) {
  flex-shrink: 0;
  padding-right: 5px;
}
.navbar-tree /deep/ .tree-indent {
  margin: 0 5px;
}
</style>

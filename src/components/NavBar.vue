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
      },
      updateStacks() {
        var $this = this
        // var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
        var stacks = this.$store.state.currentNoteCollection.stacks.getStacks(true)
        var stacksNode = this.treeData.find(node => node.name == 'Stacks')
        // stacksNode.badge = stacks.length
        stacksNode.children = []
        var convertTree = function(tree, node) {
          for (let s of tree) {
            var stackNode = {
              key: `/stacks/${s.relativePath}`,
              name: s.name,
              lucideIcon: 'Layers',
              badge: s.getCountOfNotes(),
              children: [],
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
            }
            var substacks = s.getContent().filter(se => se.isStack)
            if (substacks.length > 0) {
              convertTree(substacks, stackNode)
            }
            node.children.push(stackNode)
          }
        }
        convertTree(stacks, stacksNode)
      },
  },
    mounted () {
      var $this = this
      var createTree = () => {
        this.treeData = [
          {
            name: 'Home',
            click: () => { this.$router.push('/') },
            lucideIcon: 'Home',
          },
        ]
        var stacksNode = {
          key: 777,
          name: 'Stacks',
          lucideIcon: 'Layers',
          children: []
        }
        this.treeData.push(stacksNode)
        this.updateStacks()
      }
      createTree()
      bus.$on('noteCollectionChanged', () => {
        createTree()
      })
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('stacksItemAdd', this.updateStacks)
    collection.events.on('stacksItemChange', this.updateStacks)
    collection.events.on('stacksItemDelete', this.updateStacks)
  },
    unmounted() {
      var collection = this.$store.state.currentNoteCollection
      collection.events.removeListener('stacksItemAdd', this.updateStacks)
      collection.events.removeListener('stacksItemChange', this.updateStacks)
      collection.events.removeListener('stacksItemDelete', this.updateStacks)
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
    word-break: break-all;
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
  height: fit-content;
}

.navbar-tree /deep/ .tree-icon {
    min-width: 18px;
    font-size: 12px;
    font-weight: bold;
    color: white;
    padding-left: 2px;
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

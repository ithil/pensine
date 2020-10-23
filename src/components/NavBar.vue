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
      }
    },
    mounted () {
      var $this = this
      var createTree = () => {
        this.treeData = [
          { name: 'Home', click: () => { this.$router.push('/') }},
          { name: 'Inbox', click: () => { this.$router.push('/inbox') }},
          { name: 'Editor', click: () => { this.$router.push('/editor') }},
        ]
        var allNotes = this.$global.currentNoteCollection.allNotes
        var myNode = {
          key: 90,
          name: 'My Notes',
          badge: allNotes.length,
          children: []
        }
        allNotes.forEach((n, i) => {
          myNode.children.push({
            key: n.id + 91,
            name: n.label,
            filename: n.contentPath,
            click: function () {
              console.log('Does dis work? ' + n.contentPath)
              $this.$router.push('/editor').catch(err => {
                // Ignore the vuex err regarding  navigating to the page they are already on.
                if (
                  err.name !== 'NavigationDuplicated' &&
                  !err.message.includes('Avoided redundant navigation to current location')
                ) {
                  // But print any other errors to the console
                  console.error(err)
                }
              })
              $this.$nextTick(() => {
                bus.$emit('openNote', n)
              })
            }
          })
        })
        this.treeData.push(myNode)
        var tagTree = this.$global.currentNoteCollection.getTagTree()
        var tagMetadata = new this.$global.pensieve.Tags(this.$global.currentNoteCollection)
        var tagTreeNode = {
          key: 200,
          name: 'Tags',
          children: []
        }
        var currentKey = 201
        var convertTree = function(tree, level, head, node) {
          for (var t of Object.keys(tree)) {
            var newHead = head + (head=='' ? '' : '.') + t
            var currentTagMetadata = tagMetadata.getTag(newHead)
            // console.log('  '.repeat(level)+colors.grey.bold(`${(currentTagMetadata && currentTagMetadata.icon) ? currentTagMetadata.icon : '#'} `)+colors.green(t))
            var tagNode = {
              key: currentKey,
              name: `${(currentTagMetadata && currentTagMetadata.icon) ? currentTagMetadata.icon : '#'} ${t}`,
              children: [],
            }
            currentKey++
            convertTree(tree[t].subtags, level+1, newHead, tagNode)
            // for (var n of tree[t].notes) {
            tree[t].notes.forEach((n, i) => {
              // console.log('  '.repeat(level+1)+n.name)
              tagNode.children.push({
                key: currentKey,
                name: n.name,
                children: [],
                click: function () {
                  $this.$router.push('/editor').catch(err => {
                    // Ignore the vuex err regarding  navigating to the page they are already on.
                    if (
                      err.name !== 'NavigationDuplicated' &&
                      !err.message.includes('Avoided redundant navigation to current location')
                    ) {
                      // But print any other errors to the console
                      console.error(err)
                    }
                  })
                  $this.$nextTick(() => {
                    bus.$emit('openNote', n)
                  })
                }
              })
              currentKey++
            })
            node.children.push(tagNode)
          }
        }
        convertTree(tagTree, 0, '', tagTreeNode)
        this.treeData.push(tagTreeNode)
      }
      createTree()
    bus.$on('noteCollectionChanged', () => {
      createTree()
    })
    }
  }
</script>

<style scoped lang='scss'>
* {
  // color: white;
  color: #ababab;
  // font-family: 'Lucida Grande', 'Segoe UI', 'Open Sans', sans-serif;
  // font-family: 'Helvetica Neue';
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
  // flex-grow: .1;
  flex-shrink: 0;
  padding-right: 5px;
}
.navbar-tree /deep/ .tree-indent {
  margin: 0 5px;
}
</style>

<template>
  <div>
    <div style='width:100%;' class='navbar-tree'>
      <tree-item
      class='item'
      v-for='(tree, index) in treeData'
      :item='tree'
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
          { name: 'Home', click: () => { this.$router.push('/') }},
          { name: 'Inbox', click: () => { this.$router.push('/inbox') }},
          { name: 'Editor', click: () => { this.$router.push('/editor') }},
          {
            name: 'My Tree',
            badge: '30',
            children: [
              { name: 'You' },
              { name: 'Me' },
              {
                name: 'Them',
                children: [
                  {
                    name: 'Everyone',
                    children: [{ name: 'Bonjour' }, { name: 'Guten Tag' }]
                  },
                  { name: 'Cactus' },
                  { name: 'Alder' },
                  {
                    name: 'Forest',
                    children: [{ name: 'Water' }, { name: 'A snail' }]
                  }
                ]
              }
            ]
          },
          {name: 'Second Tree'}
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
      var allNotes = this.$noteCollection.allNotes
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
            bus.$emit('openNote', n)
            // It does! :)
          }
        })
      })
      this.treeData.push(myNode)
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

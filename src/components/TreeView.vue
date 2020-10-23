<template id='#item-template'>
  <div class="tree-view">
    <li>
      <div
      :class="{folder: isFolder}"
      class="tree-row"
      @click.stop.prevent="triggerClick"
      @dblclick="toggle">
      <span class="tree-toggle" :class="{'no-children': !isFolder}" @click="toggle">
        <!-- <b-icon :icon="isOpen ? 'chevron-down' : 'chevron-right'"></b-icon> -->
        <span v-if="isOpen">▾</span>
        <span v-else>▸</span>
      </span>
      <span class="tree-name">{{ item.name }}</span>
      <span class="tree-badge" v-if="item.badge">{{item.badge}}</span>
    </div>
    <ul v-show="isOpen" v-if="isFolder" class="tree">
      <tree-item
      class="item"
      v-for="(child, index) in item.children"
      :key="index"
      :item="child"
      @make-folder="$emit('make-folder', $event)"
      @add-item="$emit('add-item', $event)"
      ></tree-item>
      <!-- <li class="add" @click="$emit('add-item', item)">+</li> -->
    </ul>
  </li>
  </div>
</template>

<script>
  // import Vue from 'vue'
  // import pensieve from 'pensieve'
  // var pensieve = require('/Users/janus/Coding/projects/pensieve/src/pensieve-lib.js')

  export default {
    name: 'tree-item',
    template: '#item-template',
    props: {
      item: Object
    },
    data: function () {
      return {
        isOpen: false,
        // myNoteCollection: pensieve.NoteCollection('/Users/janus/Notes')
      }
    },
    computed: {
      isFolder: function () {
        return this.item.children && this.item.children.length
      }
    },
    methods: {
      toggle: function () {
        if (this.isFolder) {
          this.isOpen = !this.isOpen
        }
      },
      makeFolder: function () {
        if (!this.isFolder) {
          this.$emit('make-folder', this.item)
          this.isOpen = true
        }
      },
      triggerClick: function () {
        // this.toggle()
        if (this.item.click) {
          this.item.click()
        }
      }
    }
  }
</script>

<style lang="scss">
.tree {
  margin-top: 0px;
  margin-bottom: 0px;
}
</style>

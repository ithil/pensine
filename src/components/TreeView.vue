<template id='#item-template'>
  <div class="tree-view">
    <li>
      <div
      :class="{folder: isFolder}"
      class="tree-row"
      >
      <span class="tree-toggle" :class="{'no-children': !isFolder}" @click="toggle">
        <span v-if="isOpen">▾</span>
        <span v-else>▸</span>
      </span>
      <span class="tree-icon" :class="item.iconClasses || []" v-if="item.icon || item.iconClasses">{{item.icon ? item.icon : ''}}</span>
      <span
      class="tree-name"
      @click.stop.prevent="triggerClick"
      @dblclick="toggle"
      >{{ item.name }}</span>
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
    </ul>
  </li>
  </div>
</template>

<script>

  export default {
    name: 'tree-item',
    template: '#item-template',
    props: {
      item: Object
    },
    data: function () {
      return {
        isOpen: false,
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

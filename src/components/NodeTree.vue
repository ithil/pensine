<template id='#item-template'>
  <div class="node-tree">
    <li>
      <div
      class="tree-row"
      >
      <span class="tree-toggle" @click="toggle">
        <span v-if="isOpen">
          <Icon name="ChevronDown" />
        </span>
        <span v-else>
          <Icon name="ChevronRight" />
        </span>
      </span>
      <span
      class="tree-element"
      :class="{focused: focusedId == item.id}"
      :data-stack="item.fnObj.stack"
      @click="triggerClick"
      >
      <span
      class="name"
      :class="{ title: item.fnObj.title ? true : false }"
      >
        {{item.name}}
      </span>
      <span class="stack">
        <Icon name="Layers" /> {{item.fnObj.stack}}
      </span>
      <span class="deleteHandle handle" v-if="parentItem" @click="removeRelation">
        <Icon name="X" />
      </span>
      <span class="moveHandles" v-if="parentItem">
        <span class="moveUp handle" @click="moveRelation(-1)">
          <Icon name="ChevronUp" />
        </span>
        <span class="moveDown handle" @click="moveRelation(1)">
          <Icon name="ChevronDown" />
        </span>
      </span>
    </span>
  </div>
  <ul v-if="isOpen" class="node-tree">
    <node-tree
    class="item"
    v-for="(child, index) in children"
    :key="child.id"
    :passedKey="`${passedKey} ${index}`"
    :parentItem="item"
    :item="child"
    :focusedId="focusedId"
    @updateParentsChildren="updateChildren"
    >
    <template v-for="(_, slot) in $slots">
      <template :slot="slot">
        <slot :name="slot"></slot>
      </template>
    </template>
  </node-tree>
</ul>
</li>
</div>
</template>

<script>
import Icon from '@/components/Icon.vue'

  export default {
    name: 'node-tree',
    template: '#item-template',
    props: {
      item: Object,
      parentItem: Object,
      passedKey: String,
      focusedId: String,
      'hideCircularParent': {
        type: Boolean,
        default: true,
      },
    },
    components: {
      Icon,
    },
    data: function () {
      return {
        isOpen: false,
        children: [],
      }
    },
    computed: {
    },
    methods: {
      toggle: function () {
        this.isOpen = !this.isOpen
        if (this.isOpen) {
          this.updateChildren()
        }
      },
      triggerClick: function () {
        if (this.item.click) {
          this.item.click()
        }
      },
      updateChildren() {
        this.children = this.item.getChildren()
        if (this.parentItem && this.hideCircularParent) {
          this.children = this.children.filter(c => c.fnObj.path != this.parentItem.fnObj.path)
        }
      },
      removeRelation() {
        var parentAbstract = this.parentItem.fnObj.abstract
        var relationAbtract = this.item.fnObj.abstract
        var $this = this
        this.$store.commit('triggerCustomTextPrompt', {
          message: `Remove relation "${relationAbtract}" from "${parentAbstract}"?`,
          action: (text) => {
            if (['y', 'yes'].includes(text.trim())) {
              this.parentItem.fnObj.removeLink(this.item.fnObj.relativePath)
              this.parentItem.fnObj.removeBacklink(this.item.fnObj.relativePath)
              setTimeout(() => {
                $this.$emit('updateParentsChildren')
              }, 200)
            }
          }
        })
      },
      moveRelation(delta) {
        if (this.parentItem && this.parentItem.fnObj) {
          var parentFnObj = this.parentItem.fnObj
          var relationRelativePath = this.item.fnObj.relativePath
          parentFnObj.moveLink(relationRelativePath, delta)
          var $this = this
          setTimeout(() => {
            $this.$emit('updateParentsChildren')
          }, 200)
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

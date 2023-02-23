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
      <span class="position" v-if="parentItem">
        <input :placeholder="initialPosition + 1" v-model="newPosition" type="text" @keyup.enter="changePosition">
      </span>
      <span
      class="tree-element"
      :class="{focused: focusedId == item.id}"
      :data-stack="item.noteObj.stack"
      @click="triggerClick"
      >
      <span
      class="name"
      :class="{ title: item.noteObj.title ? true : false }"
      >
        {{item.name}}
      </span>
      <span class="stack">
        <Icon name="Layers" /> {{item.noteObj.stack}}
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
        newPosition: '',
        initialPosition: 0,
      }
    },
    computed: {
    },
    watch: {
      passedKey(val) {
        var initialPosition = val.split(' ').slice(-1)
        if (initialPosition) {
          this.initialPosition = Number(initialPosition)
        }
      },
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
          this.children = this.children.filter(c => c.noteObj.path != this.parentItem.noteObj.path)
        }
      },
      removeRelation() {
        var parentAbstract = this.parentItem.noteObj.abstract
        var relationAbtract = this.item.noteObj.abstract
        var $this = this
        this.$store.commit('triggerCustomTextPrompt', {
          message: `Remove relation "${relationAbtract}" from "${parentAbstract}"?`,
          action: (text) => {
            if (['y', 'yes'].includes(text.trim())) {
              this.parentItem.noteObj.removeLink(this.item.noteObj.relativePath)
              this.parentItem.noteObj.removeBacklink(this.item.noteObj.relativePath)
              setTimeout(() => {
                $this.$emit('updateParentsChildren')
              }, 200)
            }
          }
        })
      },
      moveRelation(delta) {
        if (this.parentItem && this.parentItem.noteObj) {
          var parentNoteObj = this.parentItem.noteObj
          var relationRelativePath = this.item.noteObj.relativePath
          parentNoteObj.moveLink(relationRelativePath, delta)
          var $this = this
          setTimeout(() => {
            $this.$emit('updateParentsChildren')
          }, 200)
        }
      },
      changePosition() {
        var newPosition = this.newPosition - 1
        var initialPosition = this.initialPosition
        this.newPosition = ''
        if (newPosition != initialPosition) {
          let delta = newPosition - initialPosition
          this.moveRelation(delta)
        }
      },
    },
    mounted() {
      var initialPosition = this.passedKey.split(' ').slice(-1)
      if (initialPosition) {
        this.initialPosition = Number(initialPosition)
      }
      if (!this.parentItem) {
        this.toggle()
      }
    },
  }
</script>

<style lang="scss">
.tree {
  margin-top: 0px;
  margin-bottom: 0px;
}
</style>

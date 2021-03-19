<template>
  <div class="insert">
    <SlickList lockAxis="y" v-model="items" tag="ul" class="insertionList" use-drag-handle>
      <SlickItem
      v-for="(item, index) in items"
      :index="index"
      :key="index"
      tag="li"
      class="line"
      :class="item.class"
      >
      <span v-handle class="handle"></span>
      <div class="content" v-html="md.render(item.content)">
      </div>
      <div class="editor" v-if="item.class=='newContent' && editing">
        <textarea rows="7" cols="60" v-model="editorContent"></textarea>
        <button @click="saveSnippet">Save</button>
        <button @click="cancelEditing">Cancel</button>
      </div>
      <ul class="actions" v-if="item.class=='newContent'">
        <li><a href="#" @click="editSnippet">edit</a></li>
        <li><a href="#" @click="bulletSnippet">bullet</a></li>
      </ul>
    </SlickItem>
  </SlickList>
  <button @click="save">Insert</button>
  <button @click="cancel">Cancel</button>
  <input type="checkbox" id="deleteFleetingNote" v-model="deleteFleetingNote">
  <label for="deleteFleetingNote">Delete Fleeting Note?</label>
</div>
</template>

<script>
import fs from 'fs'
import path from 'path'
import fleetingNote from '@/components/FleetingNote.vue'
import MarkdownIt from 'markdown-it'
import { SlickList, SlickItem, HandleDirective } from 'vue-slicksort'

export default {
  name: 'Insert',
  components: {
    fleetingNote,
    SlickItem,
    SlickList,
  },
  directives: { handle: HandleDirective },
  data() {
    return {
      md: new MarkdownIt(),
      items: [],
      editing: false,
      editorContent: '',
      deleteFleetingNote: true,
    }
  },
  computed: {
    note() {
      var id = this.$route.params.id
      if (id) {
        return this.$store.state.currentNoteCollection.getNoteById(id)
      }
    },
    fleetingNoteForInsertion() {
      return this.$store.state.fleetingNoteForInsertion
    },
    // routeTab() {
    //   return this.stack.relativePath || 'Stack'
    // },
  },
  methods: {
    save() {
      var $this = this
      var text = this.items.map(i => i.content).join('\n')
      console.log(text)
      this.note.setContentAsync(text, () => {
        $this.$tabs.close()
        $this.$router.push(`/editor/${$this.note.id}`).catch(err => {
          // Ignore the vuex err regarding  navigating to the page they are already on.
          if (
            err.name !== 'NavigationDuplicated' &&
            !err.message.includes('Avoided redundant navigation to current location')
          ) {
            // But print any other errors to the console
            console.error(err)
          }
        })
      })
      if (this.deleteFleetingNote) {
        this.fleetingNoteForInsertion.delete()
      }
    },
    cancel() {
      this.$tabs.close()
    },
    editSnippet(event) {
      this.editing = !this.editing
      event.preventDefault()
      event.stopPropagation()
    },
    bulletSnippet(event) {
      event.preventDefault()
      event.stopPropagation()
      var index = this.items.findIndex(i => i.class == 'newContent')
      if (index > -1) {
        var insertion = this.items[index].content
        insertion = insertion.split('\n').map(l => l ? `* ${l}` : '').join('\n')
        this.items[index].content = insertion
      }
    },
    saveSnippet(event) {
      this.editing = !this.editing
      var index = this.items.findIndex(i => i.class == 'newContent')
      if (index > -1) {
        this.items[index].content = this.editorContent
      }
      event.preventDefault()
      event.stopPropagation()
    },
    cancelEditing(event) {
      this.editing = !this.editing
      event.preventDefault()
      event.stopPropagation()
    },
  },
  mounted() {
    var lines = this.note.content.split('\n')
    this.items = lines.map(l => {
      return { content: l, class: 'originalContent' }
    })
    this.items.push({
      content: this.fleetingNoteForInsertion.content,
      class: 'newContent',
    })
    this.editorContent = this.fleetingNoteForInsertion.content
  },
  unmounted() {
  },
  activated() {
    this.$store.commit('setTitle', 'Insert')
  },
  deactivated() {
    this.$store.commit('resetTitle')
  },
}
</script>
<style scoped lang='scss'>
ul.insertionList {
  li.line {
    list-style: none;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: #d2d2d2;
    opacity: 0.96;
    color: black;
    border-radius: 2px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    font-family: 'Lucida Grande', 'Segoe UI', 'Open Sans', sans-serif;
    &.newContent {
      background-color: #bbccb3;
    }
    ul.actions {
      padding-inline-start: 0;
      li {
        display: inline-block;
        list-style: none;
        padding-inline-start: 0;
        padding-right: 6px;
        a {
          color: #888;
          text-decoration: none;
          font-size: 14px;
        }
      }
    }
  }
}

.handle {
  display: block;
  width: 18px;
  height: 18px;
  background-image: url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><path d="M0 7.5v5h50v-5H0zm0 15v5h50v-5H0zm0 15v5h50v-5H0z" color="%23000"/></svg>');
  background-size: contain;
  background-repeat: no-repeat;
  opacity: .25;
  margin-right: 20px;
  cursor: row-resize;
}

</style>

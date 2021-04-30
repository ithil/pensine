<template id='#item-template'>
  <div class="fleetingNote" @keydown="keymonitor" @click="focusNote" :class="{ selected: selected }">
    <div class="header">
      <span class="ago">{{ moment(fleetingNoteObj.date).fromNow() }}</span>
      <span class="timestamp">{{ moment(fleetingNoteObj.date).format('ddd DD.MM.YYYY HH:mm:ss') }}</span>
    </div>
    <div class="content" v-if="!editing">
      <div v-if="fleetingNoteObj.isText" v-html="renderedContentWithHighlights">
      </div>
      <div v-else-if="fleetingNoteObj.isImage">
        <img
        class="image"
        :src="`data:${fleetingNoteObj.mime};base64,${fleetingNoteObj.contentBase64}`"
        ></img>
      </div>
      <div v-else-if="fleetingNoteObj.isAudio">
        <audio
        controls
        :src="`data:${fleetingNoteObj.mime};base64,${fleetingNoteObj.contentBase64}`">
      </audio>
    </div>
      <div v-else class="miscFile">
        <div>
          <img class="icon" :src="icon"></img>
        </div>
        <div>
          <div class="filename">{{ fleetingNoteObj.filename }}</div>
          <div class="mime">{{ fleetingNoteObj.mime }}</div>
        </div>
      </div>
    </div>
    <div class="inboxEditor" v-if="editing">
      <textarea rows="7" cols="60" v-model="editorContent"></textarea>
      <button @click="saveNote">Save</button>
      <button @click="cancelEditing">Cancel</button>
    </div>
    <ul class="actions">
      <li><a href="#" @click="deleteNote">delete</a></li>
      <li v-if="fleetingNoteObj.isText"><a href="#" @click="editNote">edit</a></li>
      <li v-if="fleetingNoteObj.isText"><a href="#" @click="insertNote">insert</a></li>
      <li v-if="fleetingNoteObj.isText"><a href="#" @click="intoNewNote">new</a></li>
      <li><a href="#">move</a></li>
      <li><a href="#" @click="addToStack">stack</a></li>
      <li><a href="#" @click="toggleSelectNote">select</a></li>
    </ul>
  </div>
</template>

<script>
  import moment from 'moment'
  import MarkdownIt from 'markdown-it'
  import { bus } from '@/main'
  import { ipcRenderer } from 'electron'

  export default {
    name: 'fleeting-note',
    props: {
      'fleetingNoteObj': Object,
      'searchString': String,
    },
    data: function () {
      return {
        moment: moment,
        md: new MarkdownIt({linkify: true}),
        editing: false,
        selected: false,
        focused: false,
        editorContent: this.content,
        bus: bus,
        icon: null,
      }
    },
    computed: {
      content() {
        return this.fleetingNoteObj.content
      },
      renderedContent() {
        return this.md.render(this.content)
      },
      renderedContentWithHighlights() {
        var rendered = this.renderedContent
        if (this.searchString.length > 0) {
          return rendered.replace(
            new RegExp(this.searchString, 'gi'),
            '<span class="match">$&</span>'
          )
        }
        else {
          return rendered
        }
      },
    },
  watch: {
    content: function (val) {
      this.editorContent = val
    },
  },
    methods: {
      keymonitor(event) {
        if (event.key === "Escape") {
          // this.closeModal()
          event.preventDefault()
          event.stopPropagation()
        }
      },
      deleteNote(event) {
        this.$store.commit('triggerCustomTextPrompt', {
          message: `Are you sure you want to delete ${this.fleetingNoteObj.filename}?`,
          action: (text) => {
            if (['y', 'yes'].includes(text.trim())) {
              this.fleetingNoteObj.delete()
            }
          }
        })
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      editNote(event) {
        if (this.fleetingNoteObj.isText) {
          this.editing = !this.editing
        }
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      insertNote(event) {
        if (this.fleetingNoteObj.isText) {
          var $this = this
          this.$store.commit('setFleetingNoteForInsertion', this.fleetingNoteObj)
          var allNotes = this.fleetingNoteObj.collection.allNotes
          var items = allNotes.map(n => {
            return {
              label: n.name,
              action:() => {
                console.log(n)
                $this.$router.push(`/insert/${n.id}`).catch(err => {
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
          })
          this.$store.commit('triggerCustomSelectList', {items})
        }
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      intoNewNote(event) {
        this.bus.$emit('newNote', this.fleetingNoteObj.content)
      },
      addToStack(event) {
        var $this = this
        var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
        var items = stacks.map(s => {
          return {
            label: s.relativePath,
            iconClasses: ['feather-icon', 'icon-layers'],
            action:() => {
              console.log(s.path)
              this.fleetingNoteObj.sendToStack(s.relativePath)
            }
          }
        })
        var filter = function (context) {
          var $items = context.itemsWithIds
          var itemsFiltered = $items.filter(item => {
            return item.label.toLowerCase().indexOf(context.searchString.toLowerCase()) > -1
          })
          itemsFiltered.push({
            id: context.getHighestId() + 1,
            iconClasses: ['feather-icon', 'icon-plus'],
            label: context.searchString.trim(),
            description: 'Create new stack',
            action: () => {
              $this.fleetingNoteObj.sendToStack(context.searchString.trim())
            },
          })
          return itemsFiltered
        }
        this.$store.commit('triggerCustomSelectList', {items, filter})
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      toggleSelectNote(event) {
        this.selected = !this.selected
        if (this.selected) {
          this.$emit('selectNote', this.fleetingNoteObj)
        }
        else {
          this.$emit('unselectNote', this.fleetingNoteObj)
        }
        if (event) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
      focusNote() {
        this.focused = true
        this.$emit('focusNote', this.fleetingNoteObj)
      },
      saveNote(event) {
        this.fleetingNoteObj.setContent(this.editorContent)
        this.editing = !this.editing
        event.preventDefault()
        event.stopPropagation()
      },
      cancelEditing(event) {
        // this.content = this.fleetingNoteObj.content
        this.editing = !this.editing
      },
    },
    mounted() {
      this.editorContent = this.content
      var $this = this;

      (async () => {
        const icon = await ipcRenderer.invoke('getFileIcon', $this.fleetingNoteObj.path)
        $this.icon = icon
      })()
    }
  }
</script>

<style lang="scss">
.fleetingNote {
  min-width: 100px;
  height: min-content;
  padding: 10px;
  // border: 1px solid rgba(255, 255, 255, 0.2);
  border: 2px solid #ffd400;
  // background-color: #d2d2d2;
  background-color: #FAFAFA;
  opacity: 0.96;
  color: black;
  border-radius: 2px;
  // box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 15px rgba(181, 181, 181, 0.67);
  font-family: 'Lucida Grande', 'Segoe UI', 'Open Sans', sans-serif;
  &.focused {
    outline: 2px solid cornflowerblue;
  }
  &.selected {
    background-color: #c9d6e0;
  }
}


.fleetingNote .content {
  padding: 2px;
  font-family: 'Georgia';
  margin-top: 5px;
  margin-bottom: 5px;
  word-break: break-word;
  .match {
    background: #00000012;
    border: 1px solid #ababab;
    border-radius: 5px;
    padding: 2px;
  }
  blockquote {
    border-left: 3px solid #cfdae6;
    padding-left: 5px;
  }
  a {
    color: royalblue;
  }
  div p:last-child {
    margin-block-end: 0;
  }
  .image {
    max-height: 250px;
  }
  .miscFile {
    display: flex;
    .icon {
      padding-right: 5px;
    }
    .filename {
      font-weight: bold;
    }
    .mime {
      font-size: 12px;
      font-style: italic;
    }
  }
}

.fleetingNote .header {
  font-size: 12px;
  color: rgb(17, 17, 17);
  font-family: 'PT Mono';
}

.fleetingNote .header .ago {
  padding-right: 5px;
}

.fleetingNote .header .timestamp {
  font-size: 10px;
}

.fleetingNote ul.actions {
  padding-inline-start: 0;
  margin: 0;
  li {
    display: inline-block;
    list-style: none;
    padding-inline-start: 0;
    padding-right: 6px;
    a {
      color: #888;
      text-decoration: none;
      font-size: 12px;
    }
  }
}
</style>

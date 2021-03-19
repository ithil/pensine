<template id='#item-template'>
  <div class="fleetingNote" @keydown="keymonitor" :class="{ selected: selected }">
    <div class="header">
      <span class="ago">{{ moment(fleetingNoteObj.date).fromNow() }}</span>
      <span class="timestamp">{{ moment(fleetingNoteObj.date).format('ddd DD.MM.YYYY HH:mm:ss') }}</span>
    </div>
    <div class="content" v-if="!editing">
      <div v-if="fleetingNoteObj.isText" v-html="md.render(content)">
        <!-- {{ md.render(fleetingNoteObj.content) }} -->
      </div>
      <div v-else-if="fleetingNoteObj.isImage">
        <img
        class="image"
        :src="`data:${fleetingNoteObj.mime};base64,${fleetingNoteObj.contentBase64}`"
        ></img>
      </div>
      <div v-else>
        File of type {{ fleetingNoteObj.mime }}
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
  export default {
    name: 'fleeting-note',
    props: {
      'fleetingNoteObj': Object,
    },
    data: function () {
      return {
        moment: moment,
        md: new MarkdownIt(),
        editing: false,
        selected: false,
        editorContent: this.content,
      }
    },
    computed: {
      content() {
        return this.fleetingNoteObj.content
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
        event.preventDefault()
        event.stopPropagation()
      },
      editNote(event) {
        if (this.fleetingNoteObj.isText) {
          this.editing = !this.editing
        }
        event.preventDefault()
        event.stopPropagation()
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
          this.$store.commit('triggerCustomSelectList', items)
        }
        event.preventDefault()
        event.stopPropagation()
      },
      addToStack(event) {
        var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
        var items = stacks.map(s => {
          return {
            label: s.relativePath, action:() => {
              console.log(s.path)
              this.fleetingNoteObj.sendToStack(s.relativePath)
            }
          }
        })
        this.$store.commit('triggerCustomSelectList', items)
        event.preventDefault()
        event.stopPropagation()
      },
      toggleSelectNote(event) {
        this.selected = !this.selected
        if (this.selected) {
          this.$emit('selectNote', this.fleetingNoteObj)
        }
        else {
          this.$emit('unselectNote', this.fleetingNoteObj)
        }
        event.preventDefault()
        event.stopPropagation()
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
    }
  }
</script>

<style lang="scss">
.fleetingNote {
  min-width: 100px;
  height: min-content;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: #d2d2d2;
  opacity: 0.96;
  color: black;
  border-radius: 2px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  font-family: 'Lucida Grande', 'Segoe UI', 'Open Sans', sans-serif;
}

.fleetingNote.selected {
  background-color: #c9d6e0;
}

.fleetingNote .content {
  padding: 2px;
}

.fleetingNote .content .image {
  max-height: 250px;
}

.fleetingNote .header {
  font-size: 12px;
  color: rgb(17, 17, 17)
}

.fleetingNote .header .ago {
  padding-right: 5px;
}

.fleetingNote .header .timestamp {
  font-size: 10px;
}

.fleetingNote ul.actions {
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
</style>

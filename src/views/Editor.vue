<template>
  <div>
    <div id="noteMetadata" v-if="currentNote">
      <!-- <span class="noteId">{{ currentNote.id }}</span>
      <span class="noteLabel">{{ currentNote.label }}</span> -->
      <span class="noteTags">
        <span
        class="noteTag"
        v-for="(tag, index) in currentNote.metadata.tags"
        :key="index"
        >
        {{tag}}
      </span>
      </span>
    </div>
    <div class="editorView">
      <Vimish :note="note"></Vimish>
    </div>
  </div>
</template>

<script>
// @ is an alias to /src
import Vimish from '@/components/Vimish.vue'

export default {
  name: 'Editor',
  components: {
    Vimish
  },
  data () {
    return {
    }
  },
  activated() {
    this.$store.commit('setTitle', `[${this.note.id}] ${this.note.label}`)
  },
  deactivated() {
    this.$store.commit('resetTitle')
  },
  computed: {
    currentNote() {
      return this.$store.state.currentNote
    },
    routeTab() {
      if (this.$store.state.currentNote) {
        return this.$store.state.currentNote.label || 'Editor'
      }
    },
    note() {
      var id = this.$route.params.id
      if (id) {
        return this.$store.state.currentNoteCollection.getNoteById(id)
      }
    },
  },
  watch: {
    $route(to, from) {
      var id = to.params.id
      if (id) {
        var note = this.$store.state.currentNoteCollection.getNoteById(id)
        this.$store.commit('setCurrentNote', note)
        // this.note = note
      }
    }
  },
  mounted() {
    this.$store.commit('setTitle', `[${this.note.id}] ${this.note.label}`)
    var id = this.$route.params.id
    if (id) {
      var note = this.$store.state.currentNoteCollection.getNoteById(id)
      this.$store.commit('setCurrentNote', note)
      // this.note = note
    }
  },
}
</script>

<style lang="scss">
.editorView {
  margin-top: 20px;
}
#noteMetadata {
  padding: 10px;
  font-family: 'Lucida Grande';
  background-color: #dddddd;
  white-space: nowrap;
  overflow: auto;
}
#noteMetadata::-webkit-scrollbar {
  display: none;
}
.noteId {
  padding: 3px;
  margin: 2px;
  background-color: #afdfff;
  border-radius: 5px;
  border: 1px solid #7eccff;
  font-size: 14px;
}
.noteLabel {
  font-weight: bold;
  margin-left: 5px;
}
.noteTag {
  margin: 5px 4px 5px 10px;
  background-color: #ececec;
  padding: 4px;
  border-radius: 5px;
  border: solid 1px #d0d0d0;
}
</style>

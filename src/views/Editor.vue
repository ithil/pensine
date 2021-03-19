<template>
  <div class="notePage">
    <div id="noteMetadata" v-if="currentNote">
      <!-- <span class="noteId">{{ currentNote.id }}</span>
      <span class="noteLabel">{{ currentNote.label }}</span> -->
      <span class="noteCreationDate">{{ moment(currentNote.metadata.creationDate).format('DD.MM.YYYY') }}</span>
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
      <Vimish
      :note="note"
      @hasChanged="hasChangedHandler"
      ></Vimish>
    </div>
  </div>
</template>

<script>
// @ is an alias to /src
import Vimish from '@/components/Vimish.vue'
import {remote} from 'electron'
import moment from 'moment'

export default {
  name: 'Editor',
  components: {
    Vimish
  },
  data () {
    return {
      hasChanged: null,
      moment: moment,
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
        return `${this.hasChanged ? '* ' : ''}${this.$store.state.currentNote.label}` || 'Editor'
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
  methods: {
    hasChangedHandler(hasChanged) {
      this.hasChanged = hasChanged
    },
  },
  beforePageLeave(tab, type) {
    //If the value has not changed, just leave the tab
    if (!this.hasChanged) return

    console.log(`Trying to ${type} tab`)
    console.log(tab)

    var confirm = () => {
      remote.dialog.showMessageBoxSync(
        remote.getCurrentWindow(),
        {
          type:'question',
          buttons: ['Yes', 'No'],
          title:'Really close?',
          message: 'Are you sure?'
        }
      )
    }
    // Promise resolve to allow the page to leave
    return new Promise((resolve, reject) => {
      if (confirm()) {
        resolve()
      } else {
        reject(`Refuse to ${action} the page`)
      }
    })

    // The confirm component of Element is used here
    // You need to configure closeOnHashChange to false
    // to avoid the route switching causing the confirmation box to close
    // this.$confirm(msg, 'prompt', { closeOnHashChange: false })
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
  background-color: #d8dee6;
  white-space: nowrap;
  overflow: auto;
  box-shadow: 0px 0px 10px #a8bfc7;
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
.noteCreationDate {
  font-family: 'PT Mono';
  font-size: 11px;
  font-weight: bold;
}
.noteTag {
  margin: 5px 4px 5px 10px;
  background-color: #ececec;
  padding: 4px;
  border-radius: 5px;
  border: solid 1px #d0d0d0;
  font-family: 'PT Mono';
  font-size: 12px;
}

.notePage {
  background-color: #eae8e8;
  height: fit-content;
  min-height: -webkit-fill-available;
  padding-bottom: 30px;
}
</style>

<template>
  <div>
    <div id="noteMetadata" v-if="currentNote">
      <span class="noteId">{{ currentNote.id }}</span>
      <span class="noteLabel">{{ currentNote.label }}</span>
    </div>
    <div class="editorView">
      <Vimish></Vimish>
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
  computed: {
    currentNote() {
      return this.$store.state.currentNote
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
</style>

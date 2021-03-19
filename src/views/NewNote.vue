<template>
  <div class="newNote">
    <h1>Create New Note</h1>
    <input v-model="label" placeholder="Label">
    <input v-model="tagsString" placeholder="Tags">
    <button @click="createNote">Create</button>
    <button @click="cancel">Cancel</button>
</div>
</template>

<script>
import MarkdownIt from 'markdown-it'

export default {
  name: 'NewNote',
  components: {
  },
  data() {
    return {
      label: '',
      tagsString: '',
    }
  },
  computed: {
    // routeTab() {
    //   return this.stack.relativePath || 'Stack'
    // },
  },
  methods: {
    createNote(event) {
      var collection = this.$store.state.currentNoteCollection
      var note = collection.newNote(this.label)
      note.addTags(this.tagsString.split(',').filter(x => x != '').map(x => x.trim()))
      note.save()
      note.setContent(' ')
      // if (category) {
      //   collection.categorize(note, category)
      // }
      this.$tabs.close()
      this.$router.push(`/editor/${note.id}`).catch(err => {
        // Ignore the vuex err regarding  navigating to the page they are already on.
        if (
          err.name !== 'NavigationDuplicated' &&
          !err.message.includes('Avoided redundant navigation to current location')
        ) {
          // But print any other errors to the console
          console.error(err)
        }
      })
    },
    cancel(event) {
      this.$tabs.close()
    },
  },
  mounted() {
    this.label = this.$route.params.label || ''
  },
  unmounted() {
  },
  activated() {
    this.$store.commit('setTitle', 'New Note')
  },
  deactivated() {
    this.$store.commit('resetTitle')
  },
}
</script>
<style scoped lang='scss'>

</style>

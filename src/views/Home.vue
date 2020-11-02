<template>
  <div class="home">
    <h1>{{ currentNoteCollection.collectionJson.name }}</h1>
    <ul>
      <li>
        Number of notes: {{ currentNoteCollection.allNotes.length }}
      </li>
    </ul>
  </div>
</template>

<script>
// @ is an alias to /src

export default {
  name: 'Home',
  components: {
  },
  computed: {
    currentNoteCollection() {
      return this.$store.state.currentNoteCollection
    }
  },
}
</script>

<style lang="scss">
.home {
  padding: 10px;
  font-family: 'PT Mono';
}
</style>

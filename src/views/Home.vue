<template>
  <div class="home">
    <h1>{{ currentNoteCollection.collectionJson.name }}</h1>
    <ul>
      <li>
        Number of notes: {{ currentNoteCollection.allNotes.length }}
      </li>
      <li>
        Recently changed notes:
        <ul>
          <li v-for="n in recentlyChangedNotes" :key="n.id">
            <span class="noteLink" @click="$router.push(`/editor/${n.id}`)">
              {{n.name}}
            </span>
          </li>
        </ul>
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
    },
    recentlyChangedNotes() {
      return [...this.currentNoteCollection.allNotes]
            .sort((a, b) => b.lastModifiedContent - a.lastModifiedContent)
            .slice(0, 10)
    },
  },
}
</script>

<style lang="scss">
.home {
  padding: 10px;
  font-family: 'PT Mono';
}
.noteLink {
  cursor: pointer;
}
</style>

<template>
  <div class="inbox">
    <h1>Inbox</h1>
    <ul id="fleetingNotes">
      <li v-for="f in fleetingNotes" :key="f.name">
        <h2>{{ f.name }}</h2>
        <div v-html="md.render(f.content)"></div>
      </li>
    </ul>
  </div>
</template>

<script>
import fs from 'fs'
import path from 'path'
import MarkdownIt from 'markdown-it'


export default {
  name: 'Inbox',
  components: {
  },
  data() {
    return {
      inbox: new this.$global.pensieve.Inbox(this.$store.state.currentNoteCollection),
      fleetingNotes: null,
      md: new MarkdownIt(),
    }
  },
  mounted() {
    var listing = fs.readdirSync(this.inbox.path)
    listing = listing.filter(f => /\.(md|txt)$/.test(f))
    var fleetingNotes = []
    for (var f of listing) {
      var content = fs.readFileSync(path.join(this.inbox.path, f), 'utf-8')
      fleetingNotes.push({
        name: f,
        content: content,
      })
    }
    this.fleetingNotes = fleetingNotes
    console.log(fleetingNotes)
  }
}
</script>

<template>
  <div class="container">
    <div
    class="home"
    v-masonry="masonryId"
    transition-duration="0.3s"
    item-selector=".item"
    gutter="10"
    origin-left="true"
    >
    <div v-masonry-tile class="item">
      <h1>
        <span class="flourish">f</span>
        <span>{{ currentNoteCollection.collectionJson.name }}</span>
        <span class="flourish">e</span>
      </h1>
    </div>
    <div v-masonry-tile class="item">
      <div class="sendFleetingNote">
        <textarea
        v-model="newFleetingNoteContent"
        @keyup="sendKeymonitor"
        @focus="$redrawVueMasonry('homeScreen')"
        @blur="$redrawVueMasonry('homeScreen')"
        ref="sendBox"
        placeholder="Send to Inbox ..."
        ></textarea>
        <span class="noteLink" @click="$router.push('/inbox')">
          <span class="icon feather-icon icon-inbox"></span>Show all {{inboxCount}} Inbox items
        </span>
      </div>
    </div>
  <div v-masonry-tile class="item">
    <h2>Recently changed stacks</h2>
    <ul>
      <li v-for="s in recentlyChangedStacks" :key="s.relativePath">
        <span class="stackLink" @click="$router.push(`/stacks/${s.relativePath}`)">
          <span class="icon feather-icon icon-layers"></span>{{s.relativePath}}
        </span>
      </li>
    </ul>
    </div>
    <div v-masonry-tile class="item">
      <h2>Recently changed notes</h2>
      <ul>
        <li v-for="n in recentlyChangedNotes" :key="n.id">
          <span class="noteLink" @click="$router.push(`/editor/${n.id}`)">
            <span class="icon feather-icon icon-file-text"></span>{{n.name}}
          </span>
        </li>
      </ul>
    </div>
  </div>
</div>
</template>

<script>
// @ is an alias to /src

export default {
  name: 'Home',
  data() {
    return {
      masonryId: 'homeScreen',
      newFleetingNoteContent: '',
      inbox: new this.$global.pensieve.Inbox(this.$store.state.currentNoteCollection),
      inboxCount: 0,
    }
  },
  components: {
  },
  methods: {
    sendNewNote() {
      this.inbox.sendText(this.newFleetingNoteContent)
      this.newFleetingNoteContent = ''
      this.$refs.sendBox.blur()
    },
    sendKeymonitor(event) {
      if (event.shiftKey && event.key == 'Enter') {
        this.sendNewNote()
        event.stopPropagation()
        event.preventDefault()
      }
      else if (event.key == 'Escape') {
        this.$refs.sendBox.blur()
      }
    },
    updateInboxCount() {
      this.inboxCount = this.inbox.getList().length
    },
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
    recentlyChangedStacks() {
        var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
        return stacks.sort((a, b) => b.lastAddedTo - a.lastAddedTo).slice(0, 10)
    },
  },
  mounted() {
    setTimeout(() => {
      window.resizeTo(window.outerWidth+1,window.outerHeight)
      window.resizeTo(window.outerWidth-1,window.outerHeight)
    }, 1000)
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('inboxItemAdd', this.updateInboxCount)
    collection.events.on('inboxItemChange', this.updateInboxCount)
    collection.events.on('inboxItemDelete', this.updateInboxCount)
    this.updateInboxCount()
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('inboxItemAdd', this.updateInboxCount)
    collection.events.removeListener('inboxItemChange', this.updateInboxCount)
    collection.events.removeListener('inboxItemDelete', this.updateInboxCount)
  },
}
</script>

<style lang="scss">
.container {
  background-color: #e0d7e4;
  height: 100%;
  width: 100%;
  font-size: 104%;
}
.home {
  padding: 10px;
  font-family: 'Baskerville';
  .flourish {
    font-family: 'Wingdings 2';
    margin-left: 10px;
    margin-right: 10px;
    font-size: 30px;
    color: #adadad;
  }
  h1 {
    text-align: center;
  }
  .item {
    // background-color: #ffffff69;
    background-color: #ede8ef;
    width: 340px;
    border-radius: 10px;
    padding: 10px;
    border: 2px solid #bb6666;
    margin-bottom: 10px;
    h2 {
      margin-block-end: 10px;
      text-align: center;
    }
    ul {
      margin-block-start: 0px;
      margin-block-end: 0px;
      padding-inline-start: 10px
    }
    li {
      list-style: none;
    }
    .icon {
      margin-right: 2px;
    }
  }
  .sendFleetingNote {
    textarea {
      border-radius: 10px;
      border: 2px solid #bfbfbf;
      padding: 10px;
      width: 320px;
      height: 1.1em;
      &:focus {
        outline: none;
        border-color: cornflowerblue;
        height: 7em;
      }
    }
  }
}
.noteLink {
  cursor: pointer;
}
.stackLink {
  cursor: pointer;
}
</style>

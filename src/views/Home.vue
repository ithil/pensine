<template>
  <div class="container">
    <div
    class="home"
    >
    <div class="item name">
      <h1>
        <span class="flourish">f</span>
        <span>{{ currentNoteCollection.collectionJson.name }}</span>
        <span class="flourish">e</span>
      </h1>
    </div>
    <div class="item inbox">
      <div class="sendFleetingNote">
        <textarea
        v-model="newFleetingNoteContent"
        @keydown="sendKeymonitor"
        @focus="$redrawVueMasonry('homeScreen')"
        @blur="$redrawVueMasonry('homeScreen')"
        ref="sendBox"
        placeholder="Send to Inbox ..."
        ></textarea>
        <div class="stackLink showAll" @click="$router.push(`/stacks/${inbox.relativePath}`)">
          <Icon name="Inbox" /></span>Show all {{inboxCount}} Inbox items
        </div>
      </div>
    </div>
    <div class="item shortcuts" v-if="shortcuts">
      <ul>
        <li v-for="s in shortcuts" :key="s.path">
          <div class="shortcut" @click="$router.push(s.path)">
            <div class="icon" :style="s.style">
              <img v-if="s.iconUrl" :src="s.iconUrl"></img>
              <span v-else-if="s.iconClasses" :class="s.iconClasses"></span>
              <span v-else-if="s.emojiIcon"> {{s.emojiIcon}}</span>
              <Icon v-else name="Layers" />
            </div>
            <div class="label">{{s.name}}</div>
          </div>
        </li>
      </ul>
    </div>
    <div class="item stacks">
      <h2>Recently changed stacks</h2>
      <ul>
        <li v-for="s in recentlyChangedStacks" :key="s.relativePath">
          <span class="stackLink" @click="$router.push(`/stacks/${s.relativePath}`)">
            <Icon name="Layers" />{{s.relativePath}}
          </span>
        </li>
        <div class="stackLink showAll" @click="$router.push('/stacks')">
          <Icon name="Table" /></span>Show all {{stackCount}} Stacks
        </div>
      </ul>
    </div>
  </div>
</div>
</template>

<script>
// @ is an alias to /src
import fs from 'fs'
import path from 'path'
import Icon from '@/components/Icon.vue'

export default {
  name: 'Home',
  data() {
    return {
      masonryId: 'homeScreen',
      newFleetingNoteContent: '',
      inboxCount: 0,
      recentlyChangedStacks: [],
      stackCount: 0,
      lastUpdatedInboxCount: 0,
      lastUpdatedStacks: 0,
      previouslyFocusedElement: null,
    }
  },
  components: {
    Icon
  },
  methods: {
    sendNewNote() {
      this.inbox.sendText(this.newFleetingNoteContent)
      this.newFleetingNoteContent = ''
      this.$refs.sendBox.blur()
    },
    sendKeymonitor(event) {
      if ((event.shiftKey && event.key == 'Enter') || (event.metaKey && event.key == 's')) {
        this.sendNewNote()
        event.stopPropagation()
        event.preventDefault()
      }
      else if (event.key == 'Escape') {
        this.$refs.sendBox.blur()
      }
    },
    updateInboxCount() {
      if ((new Date() - this.lastUpdatedInboxCount) > 1000 ) {
        this.inboxCount = this.inbox.getContent().length
        this.lastUpdatedInboxCount = new Date()
      }
    },
    updateRecentlyChangedStacks() {
      if ((new Date() - this.lastUpdatedStacks) > 1000 ) {
        var stacks = this.$store.state.currentNoteCollection.stacks.getListOfStacks()
        this.stackCount = stacks.length
        this.recentlyChangedStacks = stacks.sort((a, b) => b.lastAddedTo - a.lastAddedTo).slice(0, 10)
        this.lastUpdatedStacks = new Date()
      }
    },
  },
  computed: {
    currentNoteCollection() {
      return this.$store.state.currentNoteCollection
    },
    shortcuts() {
      var shortcutsJsonPath = path.join(this.currentNoteCollection.path, '.shortcuts.json')
      if (fs.existsSync(shortcutsJsonPath)) {
        var shortcutsJson = JSON.parse(fs.readFileSync(shortcutsJsonPath, 'utf8'))
        return shortcutsJson.shortcuts
      }
    },
    inbox() {
      return this.currentNoteCollection.stacks.getSpecialStack('inbox')
    },
  },
  watch: {
    '$store.state.currentNoteCollection': function(oldCollection, newCollection) {
      oldCollection.events.removeListener('stacksItemAdd', this.updateInboxCount)
      oldCollection.events.removeListener('stacksItemChange', this.updateInboxCount)
      oldCollection.events.removeListener('stacksItemDelete', this.updateInboxCount)
      oldCollection.events.removeListener('stacksItemAdd', this.updateRecentlyChangedStacks)
      oldCollection.events.removeListener('stacksItemChange', this.updateRecentlyChangedStacks)
      oldCollection.events.removeListener('stacksItemDelete', this.updateRecentlyChangedStacks)
      this.$store.state.currentNoteCollection.events.on('stacksItemAdd', this.updateInboxCount)
      this.$store.state.currentNoteCollection.events.on('stacksItemChange', this.updateInboxCount)
      this.$store.state.currentNoteCollection.events.on('stacksItemDelete', this.updateInboxCount)
      this.$store.state.currentNoteCollection.events.on('stacksItemAdd', this.updateRecentlyChangedStacks)
      this.$store.state.currentNoteCollection.events.on('stacksItemChange', this.updateRecentlyChangedStacks)
      this.$store.state.currentNoteCollection.events.on('stacksItemDelete', this.updateRecentlyChangedStacks)
      this.updateInboxCount()
      this.updateRecentlyChangedStacks()
    }
  },
  mounted() {
    setTimeout(() => {
      window.resizeTo(window.outerWidth+1,window.outerHeight)
      window.resizeTo(window.outerWidth-1,window.outerHeight)
    }, 1000)
    var collection = this.$store.state.currentNoteCollection
    collection.events.on('stacksItemAdd', this.updateInboxCount)
    collection.events.on('stacksItemChange', this.updateInboxCount)
    collection.events.on('stacksItemDelete', this.updateInboxCount)
    collection.events.on('stacksItemAdd', this.updateRecentlyChangedStacks)
    collection.events.on('stacksItemChange', this.updateRecentlyChangedStacks)
    collection.events.on('stacksItemDelete', this.updateRecentlyChangedStacks)
    this.updateInboxCount()
    this.updateRecentlyChangedStacks()
  },
  unmounted() {
    var collection = this.$store.state.currentNoteCollection
    collection.events.removeListener('stacksItemAdd', this.updateInboxCount)
    collection.events.removeListener('stacksItemChange', this.updateInboxCount)
    collection.events.removeListener('stacksItemDelete', this.updateInboxCount)
    collection.events.removeListener('stacksItemAdd', this.updateRecentlyChangedStacks)
    collection.events.removeListener('stacksItemChange', this.updateRecentlyChangedStacks)
    collection.events.removeListener('stacksItemDelete', this.updateRecentlyChangedStacks)
  },
  activated() {
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
    }
  },
  deactivated() {
    this.previouslyFocusedElement = document.activeElement
  },
}
</script>

<style lang="scss">
.container {
  background: radial-gradient(#b7b6ad, #bbb8b2);
  min-height: -webkit-fill-available;
  width: 100%;
  font-size: 104%;
}
.home {
  padding: 10px;
  font-family: 'Baskerville';
  margin: 0 auto;
  width: 50%;
  min-height: -webkit-fill-available;
  .flourish {
    font-family: 'Wingdings 2';
    margin-left: 10px;
    margin-right: 10px;
    font-size: 30px;
    color: #706343;
  }
  h1 {
    text-align: center;
  }
  .item {
    background: #b7b6b79e;
    backdrop-filter: blur(2px);
    margin: auto auto 10px auto;
    width: 400px;
    border-radius: 10px;
    padding: 10px;
    border: 2px solid #706343;
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
    &.name {
      border: none;
    }
    &.shortcuts {
      background: none;
      border: none;
      width: 500px;
      ul {
        display: flex;
        flex-wrap: wrap;
      }
      li {
        display: inline-block;
        list-style: none;
        padding-top: 10px;
        margin: 0 auto;
      }
      .shortcut {
        color: white;
        cursor: pointer;
        transition: all .1s ease-in-out;
        &:hover {
          transform: scale(1.05);
        }
        & > * {
          margin: 0 auto;
          text-align: center;
        }
        .icon {
          background: #ffffff7a;
          border-radius: 10px;
          padding: 10px;
          width: 80px;
          height: 80px;
          text-align: center;
          box-shadow: 0px 0px 0px 2px #70634345;
          font-size: 5vw;
          text-align: center;
          img {
            width: 80px;
            height: 80px;
          }
          span, img {
            filter: sepia(0.5);
          }
        }
        .label {
          margin-top: 5px;
          color: white;
          font-size: 15px;
          background: black;
          border-radius: 10px;
          padding: 5px;
          max-width: 100px;
        }
      }
    }
  }
  .sendFleetingNote {
    textarea {
      border-radius: 10px;
      border: 2px solid #706343;
      padding: 10px;
      width: 90%;
      height: 1.1em;
      transition: height 0.1s linear;
      resize: none;
      font-family: 'Code New Roman';
      &:focus {
        outline: none;
        border-color: #b99b50;
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
#app[data-collection='Personal'] {
  --titlebar-bg-color: #7e4e974f;
  #titlebar {
    background: var(--titlebar-bg-color);
  }
  .router-tab__header {
    background: var(--titlebar-bg-color);
  }
  .container {
    background: radial-gradient(#9172a1, #a16f8d);
    .home {
      .flourish {
        color: #ffffff;
      }
      .item {
        background-color: #02020263;
        border: 2px solid #9a66bb85;
        color: white;
        &.shortcuts {
          background: none;
          border: none;
          .shortcut {
            .icon {
              span, img {
                filter: contrast(0.8);
              }
            }
          }
        }
      }
    }
  }
}
</style>

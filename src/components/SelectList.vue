<template>
  <div>
    <modal ref="selectList" @close="onClose">
      <template v-slot:header>
        <div class="message">{{message}}</div>
        <input
        type="text"
        class="modal__input"
        v-model="searchString"
        ref="input"
        @keydown.enter="runAction"
        @keydown.down="selectNext"
        @keydown.up="selectPrev"
        @keydown.tab="openSub"
        >
      </template>

      <template v-slot:body>
        <ol class="list-group">
          <li
          class="select-list-item"
          :class="i.id == selected ? 'selected' : ''"
          v-for="i in filteredItems"
          :key="i.id"
          :ref="i.id == selected ? 'selectedItem' : ''"
          @click="selected = i.id"
          @dblclick="selected = i.id; runAction()"
          >
            <div class="primary-line" :title="i.hover ? i.hover : ''">
              <Icon v-if="i.lucideIcon" :name="i.lucideIcon" />
              <span class="label" v-if="i.highlight" v-html="i.highlight"></span>
              <span class="label" v-else>{{ i.label }}</span>
            </div>
            <div class="secondary-line">
              {{ i.description }}
              <span
              v-if="i.badges && i.badges.length > 0"
              class="badge"
              :class="`badge-${badge}`"
              v-for="(badge, index) in i.badges"
              :key="index"
              >
              {{badge}}
            </span>
            </div>
          </li>
        </ol>
      </template>

      <template v-slot:footer>
        <div>
        </div>
      </template>
    </modal>
  </div>
</template>

<script>
import Modal from './Modal.vue'
import Icon from '@/components/Icon.vue'

  export default {
    name: 'select-list',
    components: {
      Modal,
      Icon,
    },
    props: {
      items: Array,
      filter: Function,
    },
    data: function () {
      return {
        message: '',
        itemsWithIds: [],
        currentItems: [],
        searchString: '',
        selected: null,
        itemsHistory: [],
        // {items: [], searchString: '', selectedId: 1}
      }
    },
    computed: {
      filteredItems () {
        if (this.filter) {
          return this.filter(this)
        }
        else {
          var items = this.itemsWithIds
          var itemsFiltered = items.filter(item => {
            return item.label.toLowerCase().indexOf(this.searchString.toLowerCase()) > -1
          })
          return itemsFiltered
        }
      }
    },
    watch: {
      searchString: function (val) {
        if (this.filteredItems.length > 0) {
          this.selected = this.filteredItems[0].id
        }
      },
      items: function (inputItems) {
        this.currentItems = inputItems
      },
      currentItems: function (inputItems) {
        this.itemsWithIds = []
        this.addItems(inputItems)
      },
    },
    methods: {
      addItem(item) {
        var newId = this.getHighestId() + 1
        this.itemsWithIds.push({
          id: newId,
          ...item
        })
      },
      addItems(items) {
        for (let i of items) {
          this.addItem(i)
        }
      },
      getHighestId() {
        if (this.itemsWithIds.length < 1) {
          return 0
        }
        var ids = this.itemsWithIds.map(c => c.id).filter(id => id)
        return Math.max.apply(null, ids)
      },
      logSelected() {
        if (this.selected) {
          console.log(this.selected)
          console.log(this.itemsWithIds.find(i => i.id == this.selected))
        }
        else {
          console.log('Nothing selected!')
        }
      },
      runAction() {
        if (this.selected) {
          var item = this.filteredItems.find(i => i.id == this.selected)
          if (item && item.action) {
            item.action()
            this.close()
          }
        }
        else {
          console.log('Nothing selected!')
        }
      },
      selectNext() {
        var index = this.filteredItems.findIndex(i => i.id == this.selected)
        var len = this.filteredItems.length
        if (index > -1) {
          if (index + 1 >= len) {
            this.selected = this.filteredItems[0].id
          }
          else {
            this.selected = this.filteredItems[index + 1].id
          }
          this.scrollSelectedIntoView()
        }
      },
      selectPrev() {
        var index = this.filteredItems.findIndex(i => i.id == this.selected)
        var len = this.filteredItems.length
        if (index > -1) {
          if (index - 1 < 0) {
            this.selected = this.filteredItems[len - 1].id
          }
          else {
            this.selected = this.filteredItems[index - 1].id
          }
          this.scrollSelectedIntoView()
        }
      },
      openSub(event) {
        event.stopPropagation()
        event.preventDefault()
        if (event.shiftKey) {
          if (this.itemsHistory.length > 0) {
            let prevItem = this.itemsHistory.pop()
            this.currentItems = prevItem.items
            this.searchString = prevItem.searchString
            this.selected = prevItem.selected
            this.message = prevItem.message,
            this.scrollSelectedIntoView()
          }
        }
        else {
          if (this.selected) {
            var item = this.filteredItems.find(i => i.id == this.selected)
            if (item && item.getSubItems) {
              var {newItems, newMessage} = item.getSubItems()
              if (Array.isArray(newItems)) {
                this.itemsHistory.push({
                  items: this.currentItems,
                  searchString: this.searchString,
                  selected: this.selected,
                  message: this.message,
                })
                this.currentItems = newItems
                this.searchString = ''
                this.selected = this.filteredItems[0].id
                this.message = newMessage
              }
            }
          }
        }
      },
      scrollSelectedIntoView() {
        this.$nextTick(function () {
          var selectedItem = this.$refs.selectedItem
          setTimeout(function () { // This is just a dirty hack so I can go to bed
            if (selectedItem) {
              selectedItem[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }, 5)
        })
      },
      close() {
        this.$refs.selectList.closeModal()
      },
      open() {
        this.currentItems = this.items
        this.searchString = ''
        this.itemsHistory = []
        this.message = ''
        if (this.filteredItems[0] && this.filteredItems[0].id) {
          this.selected = this.filteredItems[0].id
        }
        this.$refs.selectList.openModal(() => {
          this.$refs.input.focus()
        })
      },
      onClose() {
        this.$emit('close')
      },
    },
    mounted() {
      this.addItems(this.items)
    },
  }
</script>

<style lang="scss">
.modal {
  overflow-y: hidden;
}
.modal__header {
  .message {
    margin-bottom: 5px;
  }
}
.modal__body {
  margin-top: 5px;
}
ol.list-group {
  position: relative;
  overflow-y: auto;
  max-height: 295px;
  margin: 10px 0 0 0;
  padding: 0;
  border: 1px solid black;
  border-radius: 5px;
  background: #aaacac9c;
  list-style: none;
  cursor: default;
  font-size: 12px;
  .primary-line {
    .label {
      margin-left: 5px;
      .highlight {
        background: #ffd700;
        border-radius: 1px;
      }
    }
  }
  .secondary-line {
    margin-top: 4px;
    color: #626262;
    font-size: 10px;
    .badge {
      background: #adadad;
      padding-left: 4px;
      padding-right: 4px;
      border-radius: 4px;
      color: #333333;
      border: 1px solid #777777;
      &.badge-conflicts {
        color: #b50f0f;
        background: #d29b9b;
        border-color: #b50f0f;
      }
      &.badge-agrees {
        color: #0d3e0d;
        background: #a9c3a9;
        border-color: #0d3e0d;
      }
    }
  }
}

ol.list-group li {
  padding: 5px 10px;
  border-bottom: 1px solid #202123;
  user-select: none;
}
ol.list-group li.select-list-item.selected {
    background: #469fe5c9;
    color: #000;
    font-weight: bold;
    .secondary-line {
      color: #2d2d2d;
      font-weight: normal;
    }
}
ol.list-group li.select-list-item .secondary-line {
    color: #545454;
}
</style>

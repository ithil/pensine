<template>
  <div>
    <modal ref="selectList">
      <template v-slot:header>
        <input
        type="text"
        class="modal__input"
        v-model="searchString"
        ref="input"
        @keydown.enter="runAction"
        @keydown.down="selectNext"
        @keydown.up="selectPrev"
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
          >
            <div class="primary-line" :title="i.hover ? i.hover : ''">
              {{ i.label }}
            </div>
            <div class="secondary-line">
              {{ i.description }}
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

  export default {
    name: 'select-list',
    components: {
      Modal,
    },
    props: {
      items: Array,
    },
    data: function () {
      return {
        // items: [],
        itemsWithIds: [],
        searchString: '',
        selected: null,
      }
    },
    computed: {
      filteredItems () {
        var items = this.itemsWithIds
        var itemsFiltered = items.filter(item => {
          return item.label.toLowerCase().indexOf(this.searchString.toLowerCase()) > -1
        })
        return itemsFiltered
      }
    },
    watch: {
      searchString: function (val) {
        if (this.filteredItems.length > 0) {
          this.selected = this.filteredItems[0].id
        }
      },
      items: function (inputItems) {
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
          var item = this.itemsWithIds.find(i => i.id == this.selected)
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
      scrollSelectedIntoView() {
        this.$nextTick(function () {
          var selectedItem = this.$refs.selectedItem
          setTimeout(function () { // This is just a dirty hack so I can go to bed
            if (selectedItem) {
              selectedItem[0].scrollIntoViewIfNeeded()
            }
          }, 5)
        })
      },
      close() {
        this.$refs.selectList.closeModal()
      },
      open() {
        this.searchString = ''
        this.selected = this.filteredItems[0].id
        this.$refs.selectList.openModal(() => {
          this.$refs.input.focus()
        })
      },
    },
    mounted() {
      this.addItems(this.items)
      // this.addItems([
      //   {label: 'Print'},
      //   {label: 'Save'},
      //   {label: 'Save as...'},
      //   {label: 'Rename'},
      //   {label: 'New note'},
      //   {label: 'Add tags'},
      //   {label: 'Export'},
      //   {label: 'Find'},
      //   {label: 'Send to Inbox'},
      //   {label: 'Move'},
      //   {label: 'Split'},
      //   {label: 'Merge'},
      //   {label: 'Explore'},
      //   {label: 'Backlinks'},
      //   {label: 'Search and Replace'},
      //   {label: 'Diff'},
      //   {label: 'Show version history'},
      // ])
    },
  }
</script>

<style lang="scss">
.modal {
  overflow-y: hidden;
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
  background-color: #27292b;
  list-style: none;
  cursor: default;
  font-size: 11px;
}

ol.list-group li {
  padding: 5px 10px;
  border-bottom: 1px solid #202123;
}
ol.list-group li.selected {
    background-color: #4f99d3;
    color: #fff;
}
</style>

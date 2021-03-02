<template>
  <div>
    <modal ref="textPrompt" @close="onClose">
      <template v-slot:header>
        {{ message }}
      </template>

      <template v-slot:body>
        <input
        type="text"
        class="modal__input"
        v-model="inputText"
        ref="input"
        :placeholder="placeholder"
        @keydown.enter="runAction"
        >
      </template>

      <template v-slot:footer>
        <div>
        </div>
      </template>
    </modal>
  </div>
</template>

<script>
import Modal from '@/components/Modal.vue'

  export default {
    name: 'text-prompt',
    components: {
      Modal,
    },
    props: {
      message: String,
      placeholder: String,
      text: String,
      selection: Array,
      selectAll: Boolean,
      action: Function,
    },
    data: function () {
      return {
        inputText: '',
      }
    },
    computed: {
    },
    watch: {
    },
    methods: {
      runAction() {
        if (this.action) {
          this.close()
          this.action(this.inputText)
        }
      },
      close() {
        this.$refs.textPrompt.closeModal()
      },
      open() {
        this.inputText = this.text || ''
        this.$refs.textPrompt.openModal(() => {
          this.$refs.input.focus()
          if (this.selection && this.selection.length == 2) {
            this.$refs.input.setSelectionRange(this.selection[0], this.selection[1])
          }
          else if (this.selectAll) {
            this.$refs.input.setSelectionRange(0, this.$refs.input.value.length)
          }
        })
      },
      onClose() {
        this.$emit('close')
      },
    },
    mounted() {
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
.modal__header {
  font-size: 13px;
}
</style>

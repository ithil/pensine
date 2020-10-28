<template id='#item-template'>
  <div class="modal" v-if="show" @keydown="keymonitor">
    <div class="modal__backdrop" @click="closeModal()"/>

    <div class="modal__dialog" ref="dialog" tabindex="23">
      <div class="modal__header">
        <slot name="header"/>
      </div>

      <div class="modal__body">
        <slot name="body"/>
      </div>

      <div class="modal__footer">
        <slot name="footer"/>
      </div>
    </div>
  </div>
</template>

<script>

  export default {
    name: 'modal',
    data: function () {
      return {
        show: false,
      }
    },
    methods: {
      closeModal(cb) {
        this.show = false
        document.querySelector("body").classList.remove("overflow-hidden")
        if(cb) {
          cb()
        }
      },
      openModal(cb) {
        this.show = true
        document.querySelector("body").classList.add("overflow-hidden")
        this.$nextTick(() => {
          this.$refs.dialog.focus()
          if(cb) {
            cb()
          }
        })
      },
      keymonitor(event) {
        if (event.key === "Escape") {
          this.closeModal()
          event.preventDefault()
          event.stopPropagation()
        }
      }
    }
  }
</script>

<style lang="scss">
.modal {
  overflow-x: hidden;
  overflow-y: auto;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9;
  width: 500px;
  max-height: 320px;
  height: min-content;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: #202123;
  opacity: 0.96;
  color: #aaa;
  left: 50%;
  margin-left: -250px;
  border-radius: 2px;
  border-top: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  font-family: 'Lucida Grande', 'Segoe UI', 'Open Sans', sans-serif;
}
.modal__backdrop {
  // background-color: rgba(0, 0, 0, 0.3);
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
}
.modal__dialog {
  position: relative;
  outline: none;
  z-index: 2;
}
.modal__input {
  color: #CCC;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid #000;
  box-shadow: none;
  border-radius: 2px;
  padding-left: 5px;
  font-size: 14px;
  font-family: 'Code New Roman', sans-serif;
  width: 98%;
}
.modal__input:focus {
  outline-color: #4f99d3;
}
</style>

<template id='#item-template'>
  <div class="modal">
    <div class="modal__backdrop" @click="closeModal()" v-if="show"/>

    <transition name="slide">
      <div class="modal__dialog" ref="dialog" tabindex="23" v-if="show" @keydown="keymonitor">
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
    </transition>
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
        this.$emit('close')
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
        this.$emit('open')
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
.modal__backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
}
.modal__dialog {
  overflow-x: hidden;
  overflow-y: auto;
  position: fixed;
  top: 0;
  right: 0;
  z-index: 100;
  width: 500px;
  max-height: 350px;
  height: min-content;
  padding: 10px;
  border: 2px solid #89898980;
  background: #f4f3f2b5;
  backdrop-filter: blur(5px);
  color: #000;
  left: 50%;
  margin-left: -250px;
  border-radius: 10px;
  border-top: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  box-shadow: 0 0 30px #f4ffb587;
  font-family: 'Lucida Grande', 'Segoe UI', 'Open Sans', sans-serif;
  ::-webkit-scrollbar {
    background-color: #0000002b;
    width: 5px;
    height: 8px;
  }

  ::-webkit-scrollbar-thumb:window-inactive,
  ::-webkit-scrollbar-thumb {
    background: #1a6cd29e;
    box-shadow: none;
    border-radius: 0px;
  }

  ::-webkit-scrollbar-corner {
    background-color: rgba(42, 42, 42, 0.5);
  }
  outline: none;
}
.modal__input {
  color: #000;
  background-color: #ffffffb3;
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

.slide-enter-active {
  transition: all .1s ease-in;
}
.slide-leave-active {
  transition: all .1s ease-in;
}
.slide-enter, .slide-leave-to {
  transform: translateY(-100%);
}
</style>

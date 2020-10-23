<template>
  <div class="editorView">
    <Vimish></Vimish>
  </div>
</template>

<script>
// @ is an alias to /src
import Vimish from '@/components/Vimish.vue'

export default {
  name: 'Editor',
  components: {
    Vimish
  }
}
</script>

<style lang="scss">
.editorView {
  margin-top: 20px;
}
</style>

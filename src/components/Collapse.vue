<template>
  <div class="collapse">
    <div class="collapse__header">
      <slot name="header" :toggle="toggle" :isCollapsed="collapse_state"/>
    </div>

    <div class="collapse__body" v-if="!collapse_state">
      <slot name="body"/>
    </div>
  </div>
</template>

<script>
export default {
  name: 'collapse',
  props: {
    collapsed: {
      type: Boolean,
      default: true,
    },
  },
  data: function () {
    return {
      collapse_state: true,
    }
  },
  methods: {
    open() {
      this.collapse_state = false
    },
    close() {
      this.collapse_state = true
    },
    toggle() {
      this.collapse_state = !this.collapse_state
    },
  },
  mounted() {
    this.collapse_state = this.collapsed
  },
  computed: {
  },
};
</script>

<style lang="scss">
</style>

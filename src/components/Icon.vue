<template>
  <span class="svg-icon">
    <component :is="icon" />
  </span>
</template>

<script>
import * as icons from "lucide-vue";

export default {
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  computed: {
    icon() {
      return icons[this.name];
    },
  },
};
</script>

<style lang="scss">
.svg-icon {
  display: inline-flex;
  align-self: center;
  line-height: 1;
}
.svg-icon svg {
  height: 1em;
  width: 1em;
}
.svg-icon.svg-baseline svg {
  top: .125em;
  position: relative;
}
</style>

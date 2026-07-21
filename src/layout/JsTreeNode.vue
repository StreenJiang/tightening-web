<script setup lang="ts">
import { ref } from 'vue'
import { type JsNode, nodeSummary } from './js-tree'

const props = defineProps<{ node: JsNode; depth: number }>()

const collapsed = ref(false)
const longStrExpanded = ref(false)
</script>

<template>
  <div class="js-node">
    <!-- Primitive -->
    <template v-if="node.kind === 'prim'">
      <span v-if="node.val.length > 120 && !longStrExpanded" class="js-val-str" @click="longStrExpanded = true">
        {{ node.val.slice(0, 120) }}… <span class="js-expand-hint">展开</span>
      </span>
      <span v-else class="js-val-str" :class="{ 'js-val-long': node.val.length > 120 }">{{ node.val }}</span>
    </template>

    <!-- Object -->
    <template v-else-if="node.kind === 'obj'">
      <i :class="collapsed ? 'pi pi-chevron-right' : 'pi pi-chevron-down'" class="js-toggle" @click="collapsed = !collapsed" />
      <span class="js-brace">{</span>
      <template v-if="collapsed">
        <span class="js-summary">{{ nodeSummary(node) }}</span>
        <span class="js-brace">}</span>
      </template>
      <template v-else>
        <div v-for="(e, i) in node.entries" :key="i" class="js-child">
          <span class="js-key">"{{ e.key }}"</span><span class="js-colon">: </span>
          <JsTreeNode :node="e.node" :depth="depth + 1" />
          <span v-if="i < node.entries.length - 1" class="js-comma">,</span>
        </div>
        <div class="js-closing"><span class="js-brace">}</span></div>
      </template>
    </template>

    <!-- Array -->
    <template v-else>
      <i :class="collapsed ? 'pi pi-chevron-right' : 'pi pi-chevron-down'" class="js-toggle" @click="collapsed = !collapsed" />
      <span class="js-brace">[</span>
      <template v-if="collapsed">
        <span class="js-summary">{{ nodeSummary(node) }}</span>
        <span class="js-brace">]</span>
      </template>
      <template v-else>
        <div v-for="(item, i) in node.items" :key="i" class="js-child">
          <JsTreeNode :node="item" :depth="depth + 1" />
          <span v-if="i < node.items.length - 1" class="js-comma">,</span>
        </div>
        <div class="js-closing"><span class="js-brace">]</span></div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.js-node { display: inline; }
.js-toggle {
  cursor: pointer; user-select: none;
  color: var(--p-surface-400); margin-right: 2px; font-size: 10px; vertical-align: middle;
}
.js-brace { color: var(--p-surface-400); }
.js-key { color: var(--p-primary-500); }
.js-colon { color: var(--p-surface-400); }
.js-comma { color: var(--p-surface-400); }
.js-summary { color: var(--p-surface-400); font-style: italic; margin: 0 4px; }
.js-val-str { color: var(--p-green-600); cursor: default; }
.js-val-long { word-break: break-all; white-space: pre-wrap; }
.js-expand-hint { color: var(--p-primary-500); font-size: 11px; cursor: pointer; }
.js-child { margin-left: 20px; }
.js-closing { margin-left: 0; }
</style>

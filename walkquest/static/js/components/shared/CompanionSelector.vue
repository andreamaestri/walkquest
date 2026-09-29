<template>
  <div class="companions">
    <div class="companions__chips" role="group" aria-label="Who joined you">
      <M3Chip
        v-for="companion in store.userCompanions"
        :key="companion.id"
        :selected="isSelected(companion.id)"
        @click="toggle(companion.id)"
      >
        {{ companion.name }}
      </M3Chip>
      <M3Chip v-if="!adding" :filter="false" icon="material-symbols:add-rounded" @click="startAdding">Add someone</M3Chip>
    </div>

    <form v-if="adding" class="companions__add" @submit.prevent="add">
      <input
        ref="inputEl"
        v-model="name"
        class="companions__input"
        type="text"
        maxlength="100"
        autocomplete="off"
        placeholder="Their name"
        aria-label="Companion's name"
        @keydown.esc.stop.prevent="stopAdding"
      />
      <M3Button type="submit" variant="tonal" size="sm" :disabled="!name.trim() || saving">Add</M3Button>
      <M3Button variant="text" size="sm" @click="stopAdding">Cancel</M3Button>
    </form>

    <p v-if="error" class="companions__note is-error" role="alert">{{ error }}</p>
    <p v-else-if="!store.userCompanions.length && !adding && !store.isLoading" class="companions__note type-body-small">
      Walked solo? Skip this. People you add here are remembered for next time.
    </p>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue';
import M3Button from '../m3/M3Button.vue';
import M3Chip from '../m3/M3Chip.vue';
import { useCompanionsStore } from '../../stores/companions';

const props = defineProps({
  /** Ids of the selected companions. */
  modelValue: { type: Array, required: true },
});
const emit = defineEmits(['update:modelValue']);

const store = useCompanionsStore();
const adding = ref(false);
const name = ref('');
const saving = ref(false);
const error = ref('');
const inputEl = ref(null);

onMounted(() => store.fetchUserCompanions());

const isSelected = (id) => props.modelValue.includes(id);
const toggle = (id) => {
  emit('update:modelValue', isSelected(id) ? props.modelValue.filter((x) => x !== id) : [...props.modelValue, id]);
};

async function startAdding() {
  adding.value = true;
  error.value = '';
  await nextTick();
  inputEl.value?.focus();
}

function stopAdding() {
  adding.value = false;
  name.value = '';
  error.value = '';
}

async function add() {
  if (!name.value.trim() || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const companion = await store.addCompanion(name.value.trim());
    if (!isSelected(companion.id)) emit('update:modelValue', [...props.modelValue, companion.id]);
    stopAdding();
  } catch (e) {
    error.value = e.message || "Couldn't add them. Try again.";
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.companions { display: grid; gap: 12px; }
.companions__chips { display: flex; flex-wrap: wrap; gap: 8px; }
.companions__add { display: flex; align-items: center; gap: 8px; }
.companions__input {
  flex: 1;
  min-inline-size: 0;
  block-size: 40px;
  padding-inline: 12px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
  font: inherit;
}
.companions__input:focus-visible { outline: 2px solid var(--md-sys-color-primary); outline-offset: 0; }
.companions__note { margin: 0; color: var(--md-sys-color-on-surface-variant); }
.companions__note.is-error { color: var(--md-sys-color-error); }
</style>

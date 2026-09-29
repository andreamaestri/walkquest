<template>
  <main class="adv">
    <header class="adv__bar">
      <M3IconButton icon="material-symbols:arrow-back-rounded" label="Back to walks" @click="router.push({ name: 'home' })" />
      <div class="adv__heading">
        <h1 class="type-headline-small-emphasized">My adventures</h1>
        <p v-if="adventures.count" class="adv__count type-body-medium">
          {{ adventures.count }} {{ adventures.count === 1 ? 'walk' : 'walks' }} logged
        </p>
      </div>
    </header>

    <div v-if="adventures.isLoading && !adventures.loaded" class="adv__state">
      <M3LoadingIndicator :size="40" />
    </div>

    <div v-else-if="adventures.error && !adventures.loaded" class="adv__state" role="alert">
      <p class="type-body-large">{{ adventures.error }}</p>
      <M3Button variant="tonal" @click="load">Try again</M3Button>
    </div>

    <div v-else-if="!adventures.count" class="adv__state adv__empty">
      <span class="adv__badge" aria-hidden="true"><Icon icon="material-symbols:auto-stories-rounded" /></span>
      <h2 class="type-title-large-emphasized">No walks logged yet</h2>
      <p class="type-body-large adv__muted">
        Open a walk on the map and tap <strong>Log adventure</strong> after you've done it. It'll be kept here.
      </p>
      <M3Button variant="filled" size="md" icon="material-symbols:explore-rounded" @click="router.push({ name: 'home' })">
        Find a walk
      </M3Button>
    </div>

    <ul v-else class="adv__list">
      <li v-for="entry in adventures.adventures" :key="entry.id" class="entry">
        <div class="entry__main">
          <component
            :is="entry.walk ? 'RouterLink' : 'span'"
            :to="entry.walk ? { name: 'walk', params: { walk_id: entry.walk.slug } } : undefined"
            class="entry__walk type-title-medium-emphasized"
          >
            {{ entry.walk?.name || entry.title }}
          </component>
          <p class="entry__when type-body-medium">
            {{ [dayRange(entry), timeRange(entry), feelLabel(entry.difficulty_level)].filter(Boolean).join(' · ') }}
          </p>
          <p v-if="entry.companions.length" class="entry__with type-body-medium">
            <Icon icon="material-symbols:group-outline-rounded" aria-hidden="true" />
            With {{ entry.companions.map((c) => c.name).join(', ') }}
          </p>
          <p v-if="entry.description" class="entry__notes type-body-medium">{{ entry.description }}</p>
        </div>
        <div class="entry__actions">
          <M3IconButton icon="material-symbols:edit-outline-rounded" label="Edit" @click="dialog.edit(entry)" />
          <M3IconButton icon="material-symbols:delete-outline-rounded" label="Delete" @click="toDelete = entry" />
        </div>
      </li>
    </ul>

    <ConfirmationModal
      v-if="toDelete"
      title="Delete this log?"
      :message="`Remove your log of ${toDelete.walk?.name || toDelete.title}? The walk itself isn't affected.`"
      confirm-text="Delete"
      danger-action
      :is-submitting="deleting"
      @confirm="remove"
      @cancel="toDelete = null"
    />
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import M3Button from '../m3/M3Button.vue';
import M3IconButton from '../m3/M3IconButton.vue';
import M3LoadingIndicator from '../m3/M3LoadingIndicator.vue';
import ConfirmationModal from '../shared/ConfirmationModal.vue';
import { useAdventureStore } from '../../stores/adventure';
import { useAdventureDialogStore } from '../../stores/adventureDialog';
import { useToastStore } from '../../stores/toast';
import { dayRange, feelLabel, timeRange } from '../../utils/adventureLog';

const router = useRouter();
const adventures = useAdventureStore();
const dialog = useAdventureDialogStore();
const toast = useToastStore();

const toDelete = ref(null);
const deleting = ref(false);

// Always refetch here: another device may have logged something since.
const load = () => adventures.load({ force: true }).catch(() => {});
onMounted(load);

async function remove() {
  deleting.value = true;
  try {
    await adventures.remove(toDelete.value.id);
    toDelete.value = null;
    toast.show('Log deleted', 'success', 3000);
  } catch {
    toast.show("Couldn't delete that log. Try again.", 'error', 4000);
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.adv {
  min-block-size: 100dvh;
  padding: 8px 16px 48px;
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
}
.adv__bar, .adv__state, .adv__list { max-inline-size: 720px; margin-inline: auto; }
.adv__bar { display: flex; align-items: center; gap: 8px; padding-block: 8px 16px; }
.adv__heading h1 { margin: 0; }
.adv__count { margin: 2px 0 0; color: var(--md-sys-color-on-surface-variant); }

.adv__state { display: grid; justify-items: center; gap: 12px; padding: 64px 16px; text-align: center; }
.adv__empty h2 { margin: 4px 0 0; }
.adv__muted { margin: 0 0 12px; max-inline-size: 38ch; color: var(--md-sys-color-on-surface-variant); }
.adv__badge {
  display: grid; place-items: center; inline-size: 72px; block-size: 72px; font-size: 36px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container);
}

.adv__list { display: grid; gap: 12px; margin-block: 0; padding: 0; list-style: none; }
.entry {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 8px 16px 20px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container-low);
}
.entry__main { min-inline-size: 0; display: grid; gap: 4px; }
.entry__main p { margin: 0; }
.entry__walk { color: var(--md-sys-color-on-surface); text-decoration: none; overflow-wrap: anywhere; }
a.entry__walk:hover { color: var(--md-sys-color-primary); text-decoration: underline; }
.entry__when, .entry__with { color: var(--md-sys-color-on-surface-variant); }
.entry__with { display: flex; align-items: center; gap: 6px; }
.entry__with svg { flex: none; inline-size: 18px; block-size: 18px; }
.entry__notes { margin-block-start: 4px; white-space: pre-line; overflow-wrap: anywhere; }
.entry__actions { display: flex; flex: none; }
</style>

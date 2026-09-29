<template>
  <dialog
    ref="dialogEl"
    class="log"
    :class="{ 'is-closing': closing }"
    aria-labelledby="log-title"
    @cancel.prevent="requestClose"
    @click="onBackdropClick"
    @animationend="onAnimationEnd"
  >
    <div class="log__sheet">
      <div class="log__handle" aria-hidden="true" />

      <header class="log__header">
        <div class="log__heading">
          <p class="log__eyebrow type-label-large">{{ eyebrow }}</p>
          <h2 id="log-title" class="type-headline-small-emphasized">{{ walkName }}</h2>
          <p v-if="meta" class="log__meta type-body-medium">{{ meta }}</p>
        </div>
        <M3IconButton icon="material-symbols:close-rounded" label="Close" @click="requestClose" />
      </header>

      <!-- Sign-in step: logging is tied to an account, so ask before any questions. -->
      <div v-if="needsSignIn" class="log__body log__gate">
        <span class="log__gate-badge" aria-hidden="true"><Icon icon="material-symbols:hiking-rounded" /></span>
        <h3 class="type-title-large-emphasized">{{ expired ? 'Your session ended' : 'Sign in to log this walk' }}</h3>
        <p class="type-body-large log__gate-text">
          <template v-if="expired && editing">Sign in again to save your changes.</template>
          <template v-else-if="expired">Sign in again to save it. What you've entered is kept.</template>
          <template v-else>Your walks are saved to your account, so you can look back on where you've been and see which ones you've done.</template>
        </p>
        <div class="log__gate-actions">
          <M3Button variant="filled" size="md" icon="material-symbols:login-rounded" @click="goToAuth('login')">Sign in</M3Button>
          <M3Button variant="tonal" size="md" icon="material-symbols:person-add-rounded" @click="goToAuth('signup')">Create account</M3Button>
        </div>
      </div>

      <!-- The questions: only what the walk can't already tell us. -->
      <form v-else class="log__form" novalidate @submit.prevent="save">
        <div class="log__body">
          <section class="log__section">
            <label class="log__label type-title-medium-emphasized" for="log-date">When did you walk it?</label>
            <div class="log__chips">
              <M3Chip :selected="form.date === today" @click="form.date = today">Today</M3Chip>
              <M3Chip :selected="form.date === yesterday" @click="form.date = yesterday">Yesterday</M3Chip>
            </div>
            <input
              id="log-date"
              v-model="form.date"
              class="log__field"
              type="date"
              :max="today"
              required
              :aria-invalid="errors.date ? 'true' : undefined"
              :aria-describedby="errors.date ? 'log-date-error' : undefined"
            />
            <p v-if="errors.date" id="log-date-error" class="log__error" role="alert">{{ errors.date }}</p>

            <M3Chip
              class="log__times-toggle"
              :selected="form.timesOn"
              icon="material-symbols:schedule-outline-rounded"
              @click="form.timesOn = !form.timesOn"
            >
              Add start &amp; finish times
            </M3Chip>
            <div v-if="form.timesOn" class="log__times">
              <label class="log__time">
                <span class="type-label-large">Started</span>
                <input v-model="form.startTime" class="log__field" type="time" />
              </label>
              <label class="log__time">
                <span class="type-label-large">Finished</span>
                <input
                  v-model="form.endTime"
                  class="log__field"
                  type="time"
                  :aria-invalid="errors.endTime ? 'true' : undefined"
                  :aria-describedby="errors.endTime ? 'log-time-error' : undefined"
                />
              </label>
            </div>
            <p v-if="errors.endTime" id="log-time-error" class="log__error" role="alert">{{ errors.endTime }}</p>
          </section>

          <section class="log__section" aria-labelledby="log-feel">
            <h3 id="log-feel" class="log__label type-title-medium-emphasized">How did it feel?</h3>
            <div class="log__chips" role="group" aria-labelledby="log-feel">
              <M3Chip
                v-for="choice in FEEL_CHOICES"
                :key="choice.key"
                :selected="form.difficulty === choice.key"
                @click="form.difficulty = choice.key"
              >
                {{ choice.label }}
              </M3Chip>
            </div>
            <p v-if="!editing && walk?.difficulty" class="log__hint type-body-small">
              Starts at the walk's own rating ({{ walk.difficulty.short }}). Change it if it felt different.
            </p>
          </section>

          <section class="log__section" aria-labelledby="log-who">
            <h3 id="log-who" class="log__label type-title-medium-emphasized">
              Who joined you? <span class="log__optional type-body-medium">Optional</span>
            </h3>
            <CompanionSelector v-model="form.companions" />
          </section>

          <section class="log__section">
            <label class="log__label type-title-medium-emphasized" for="log-notes">
              Notes <span class="log__optional type-body-medium">Optional</span>
            </label>
            <textarea
              id="log-notes"
              v-model="form.description"
              class="log__field log__notes"
              rows="3"
              :maxlength="NOTES_MAX"
              placeholder="Weather, views, who you met, where you had lunch…"
              :aria-invalid="errors.description ? 'true' : undefined"
            />
            <p class="log__count type-body-small" :class="{ 'is-near': form.description.length > NOTES_MAX - 40 }">
              {{ form.description.length }} / {{ NOTES_MAX }}
            </p>
            <p v-if="errors.description" class="log__error" role="alert">{{ errors.description }}</p>
          </section>

          <p v-if="formError" ref="formErrorEl" class="log__error log__error--form" role="alert">
            <Icon icon="material-symbols:error-outline-rounded" aria-hidden="true" />
            <span>{{ formError }}</span>
          </p>
        </div>

        <footer class="log__actions">
          <M3Button variant="text" @click="requestClose">Cancel</M3Button>
          <M3Button type="submit" variant="filled" size="md" :disabled="saving">
            {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Save to my adventures' }}
          </M3Button>
        </footer>
      </form>
    </div>
  </dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import M3Button from '../m3/M3Button.vue';
import M3Chip from '../m3/M3Chip.vue';
import M3IconButton from '../m3/M3IconButton.vue';
import CompanionSelector from '../shared/CompanionSelector.vue';
import { useAuthStore } from '../../stores/auth';
import { useAdventureStore } from '../../stores/adventure';
import { useAdventureDialogStore } from '../../stores/adventureDialog';
import { useSnackbar } from '../../composables/useSnackbar';
import { formatMiles } from '../../utils/walks';
import {
  FEEL_CHOICES,
  NOTES_MAX,
  buildLogPayload,
  buildUpdatePayload,
  clearDraft,
  emptyForm,
  formFromEntry,
  isPristine,
  loadDraft,
  localDate,
  saveDraft,
  validate,
} from '../../utils/adventureLog';

const router = useRouter();
const auth = useAuthStore();
const adventures = useAdventureStore();
const dialog = useAdventureDialogStore();
const snackbar = useSnackbar();

const dialogEl = ref(null);
const closing = ref(false);
let closeTimer = null;

const editing = computed(() => Boolean(dialog.entry));
const walk = computed(() => dialog.walk);
const walkId = computed(() => (editing.value ? dialog.entry.walk?.id : walk.value?.id));
const walkName = computed(() => (editing.value ? dialog.entry.walk?.name || dialog.entry.title : walk.value?.walk_name));
const eyebrow = computed(() => (editing.value ? 'Edit your log' : 'Log this walk'));
const meta = computed(() => {
  const w = walk.value;
  return w ? [formatMiles(w.distance), w.difficulty?.label].filter(Boolean).join(' · ') : '';
});

const today = ref(localDate());
const yesterday = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDate(d);
});

// ── Sign-in step ────────────────────────────────────────────────────────
const expired = ref(false); // the session ended while the dialog was open
const needsSignIn = computed(() => !auth.isAuthenticated);
// Signed out behind our back (idle timeout, another tab): say so, keep the draft.
watch(() => auth.isAuthenticated, (signedIn, was) => {
  if (was && !signedIn) expired.value = true;
});

function goToAuth(target) {
  // After signing in, come back to this walk with the dialog open again.
  const slug = editing.value ? null : walk.value?.walk_id;
  auth.setRedirectPath(slug ? `/walk/${slug}?log=1` : '/adventures');
  dialog.close();
  router.push({ name: target });
}

// ── The form ────────────────────────────────────────────────────────────
function initialForm() {
  if (editing.value) return formFromEntry(dialog.entry);
  const blank = emptyForm(walk.value, today.value);
  const draft = loadDraft(sessionStorage, walkId.value);
  return draft ? { ...blank, ...draft } : blank;
}

const form = ref(initialForm());
const errors = ref({});
const formError = ref('');
const saving = ref(false);
const formErrorEl = ref(null);

// Keep what's been typed for this walk, so closing by accident loses nothing.
watch(form, (value) => {
  if (editing.value) return;
  if (isPristine(value, walk.value, today.value)) clearDraft(sessionStorage, walkId.value);
  else saveDraft(sessionStorage, walkId.value, value);
}, { deep: true });

async function save() {
  errors.value = validate(form.value, today.value);
  if (Object.keys(errors.value).length) {
    await nextTick();
    dialogEl.value?.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    if (editing.value) await adventures.update(dialog.entry.id, buildUpdatePayload(form.value));
    else await adventures.create(buildLogPayload(walk.value, form.value));
    clearDraft(sessionStorage, walkId.value);
    snackbar.show(
      editing.value ? 'Log updated' : `Logged ${walkName.value}`,
      'success',
      6000,
      editing.value ? null : 'View',
      editing.value ? null : () => router.push({ name: 'adventures' }),
    );
    finish();
  } catch (error) {
    if (error.status === 401) {
      // Our own API says the session is gone: believe it over the store's cache.
      auth.$patch({ isAuthenticated: false, user: null, userDataLoaded: false });
      return;
    }
    if (error.status === 403) {
      // Could be a signed-out session or a stale CSRF token: ask the server.
      await auth.checkAuth();
      if (!auth.isAuthenticated) return;
    }
    formError.value = error.status && error.status < 500 && error.status !== 403
      ? error.message
      : "Couldn't save your walk. Try again, or refresh the page if it keeps happening.";
    // The message sits below the questions: bring it into view.
    await nextTick();
    formErrorEl.value?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  } finally {
    saving.value = false;
  }
}

// ── Open / close ────────────────────────────────────────────────────────
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

onMounted(() => dialogEl.value?.showModal());
onBeforeUnmount(() => {
  clearTimeout(closeTimer);
  if (dialogEl.value?.open) dialogEl.value.close();
});

function requestClose() {
  if (closing.value) return;
  if (reducedMotion()) {
    finish();
    return;
  }
  closing.value = true;
  closeTimer = setTimeout(finish, 400); // in case animationend never fires
}

function onAnimationEnd(event) {
  if (closing.value && event.target === dialogEl.value) finish();
}

function finish() {
  clearTimeout(closeTimer);
  dialog.close();
}

/** A click on the backdrop lands on the <dialog> itself, not on its content. */
function onBackdropClick(event) {
  if (event.target === dialogEl.value) requestClose();
}
</script>

<style scoped>
/* The dialog is a centred card on wide screens and a bottom sheet on phones.
   Tailwind's reset zeroes the UA margins, so position it explicitly. */
.log {
  position: fixed;
  inset: 0;
  margin: auto;
  padding: 0;
  inline-size: min(560px, calc(100vw - 32px));
  block-size: fit-content;
  max-block-size: min(760px, calc(100dvh - 32px));
  max-inline-size: none;
  border: 0;
  border-radius: var(--md-sys-shape-corner-extra-large);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-3);
  overflow: hidden;
  animation: log-in var(--md-sys-motion-spring-default-spatial-duration) var(--md-sys-motion-spring-default-spatial) both;
}
.log::backdrop {
  background: color-mix(in srgb, var(--md-sys-color-scrim, #000) 40%, transparent);
  animation: log-fade-in 200ms ease-out both;
}
.log.is-closing { animation: log-out 200ms cubic-bezier(0.3, 0, 0.8, 0.15) both; }
.log.is-closing::backdrop { animation: log-fade-out 200ms ease-in both; }

.log__sheet { display: flex; flex-direction: column; max-block-size: inherit; min-block-size: 0; }
.log__handle { display: none; inline-size: 32px; block-size: 4px; margin: 12px auto 0; border-radius: 2px; background: var(--md-sys-color-outline-variant); }

.log__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 20px 16px 12px 24px; }
.log__heading { min-inline-size: 0; }
.log__eyebrow { margin: 0 0 4px; color: var(--md-sys-color-primary); letter-spacing: 0.08em; text-transform: uppercase; }
.log__heading h2 { margin: 0; overflow-wrap: anywhere; }
.log__meta { margin: 4px 0 0; color: var(--md-sys-color-on-surface-variant); }

.log__form { display: flex; flex-direction: column; min-block-size: 0; flex: 1; }
.log__body { overflow-y: auto; overscroll-behavior: contain; padding: 4px 24px 24px; display: grid; gap: 28px; align-content: start; }

.log__section { display: grid; gap: 12px; }
.log__label { margin: 0; color: var(--md-sys-color-on-surface); }
.log__optional { margin-inline-start: 6px; color: var(--md-sys-color-on-surface-variant); font-weight: 400; }
.log__chips { display: flex; flex-wrap: wrap; gap: 8px; }
.log__hint, .log__count { margin: 0; color: var(--md-sys-color-on-surface-variant); }
.log__count { text-align: end; }
.log__count.is-near { color: var(--md-sys-color-error); }

.log__field {
  inline-size: 100%;
  min-block-size: 48px;
  padding: 10px 14px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline);
  font: inherit;
  color-scheme: light dark;
}
.log__field:focus-visible { outline: 2px solid var(--md-sys-color-primary); outline-offset: 0; box-shadow: none; }
.log__field[aria-invalid='true'] { box-shadow: inset 0 0 0 2px var(--md-sys-color-error); }
.log__notes { resize: vertical; min-block-size: 96px; line-height: 1.45; }
.log__times-toggle { justify-self: start; }
.log__times { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.log__time { display: grid; gap: 6px; color: var(--md-sys-color-on-surface-variant); }

.log__error { margin: 0; color: var(--md-sys-color-error); font-size: var(--md-sys-typescale-body-medium-size); }
.log__error--form {
  display: flex; align-items: flex-start; gap: 8px; padding: 12px 14px;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container);
}
.log__error--form svg { flex: none; inline-size: 20px; block-size: 20px; margin-block-start: 1px; }

.log__actions {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 24px calc(16px + env(safe-area-inset-bottom, 0px));
  background: var(--md-sys-color-surface-container-high);
  box-shadow: 0 -1px 0 var(--md-sys-color-outline-variant);
}

.log__gate { justify-items: center; text-align: center; padding-block: 16px 32px; gap: 12px; }
.log__gate h3 { margin: 4px 0 0; }
.log__gate-badge {
  display: grid; place-items: center; inline-size: 64px; block-size: 64px; font-size: 32px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container);
}
.log__gate-text { margin: 0 0 12px; max-inline-size: 36ch; color: var(--md-sys-color-on-surface-variant); }
.log__gate-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }

@keyframes log-in { from { opacity: 0; transform: translateY(24px) scale(0.97); } }
@keyframes log-out { to { opacity: 0; transform: translateY(16px) scale(0.98); } }
@keyframes log-fade-in { from { opacity: 0; } }
@keyframes log-fade-out { to { opacity: 0; } }

@media (max-width: 600px) {
  .log {
    inset: auto 0 0 0;
    margin: 0;
    inline-size: 100%;
    max-block-size: 92dvh;
    border-end-start-radius: 0;
    border-end-end-radius: 0;
    animation-name: log-sheet-in;
  }
  .log.is-closing { animation-name: log-sheet-out; }
  .log__handle { display: block; }
  .log__header { padding-block-start: 12px; padding-inline-start: 20px; }
  .log__body { padding-inline: 20px; }
  .log__actions { padding-inline: 20px; }
  .log__actions :deep(.m3-btn.is-filled) { flex: 1; }
}
@keyframes log-sheet-in { from { transform: translateY(100%); } }
@keyframes log-sheet-out { to { transform: translateY(100%); } }

@media (prefers-reduced-motion: reduce) {
  .log, .log::backdrop, .log.is-closing, .log.is-closing::backdrop { animation: none; }
}
</style>

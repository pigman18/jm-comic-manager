<template>
  <article
    :class="['jmz-card', toneClass, fetching ? 'jmz-card--fetching' : '']"
    role="button"
    tabindex="0"
    @click="metaOpen?.(comic.id)"
    @keyup.enter="metaOpen?.(comic.id)"
  >
    <div class="jmz-card-cover-wrap">
      <div v-show="!coverReady && !fetching" class="jmz-cover-spinner" aria-hidden="true">
        <n-spin size="small" />
      </div>
      <div v-if="fetching" class="jmz-card-fetching-mask">
        <n-spin size="small" />
      </div>
      <div v-if="comic.inStore" class="jmz-card-ribbon">已收录</div>
      <div v-else class="jmz-card-ribbon jmz-card-ribbon--new">未收录</div>
      <span v-if="comic.canRead" class="jmz-card-ribbon jmz-card-ribbon--read">可读</span>
      <img
        class="jmz-card-cover xxx-img"
        :class="{ 'jmz-card-cover--show': coverReady }"
        :src="comic.cover || ''"
        :alt="comic.name"
        loading="lazy"
        width="240"
        height="320"
        @load="onCoverLoad?.()"
        @error="onCoverErr?.($event)"
      />
      <CardDownloadBtn :comic="comic" />
      <CardReadBtn :comic="comic" />
    </div>
    <div class="jmz-card-body">
      <div class="jmz-card-num">JM{{ comic.id }}</div>
      <h2 class="jmz-card-title xxx-text" role="link" tabindex="0" @click.stop="metaOpen?.(comic.id)" @keyup.enter.stop="metaOpen?.(comic.id)">{{ comic.name }}</h2>
      <div v-if="comic.author?.length" class="jmz-card-author"><template v-for="(a, ai) in comic.author" :key="a"><span class="jmz-author-link" role="link" tabindex="0" @click.stop="filterByAuthor?.(a, $event)" @keyup.enter.stop="filterByAuthor?.(a, $event)">{{ a }}</span><span v-if="ai < comic.author.length - 1" class="jmz-author-sep"> / </span></template></div>
      <div v-else class="jmz-card-author jmz-card-author--muted">作者未知</div>
      <div class="jmz-card-tags" aria-label="标签">
        <span v-for="t in (comic.tags || []).slice(0, 5)" :key="t" class="jmz-chip xxx-text">{{ t }}</span>
        <span v-if="(comic.tags || []).length > 5" class="jmz-chip jmz-chip--more">+{{ (comic.tags || []).length - 5 }}</span>
        <span v-if="!comic.tags || !comic.tags.length" class="jmz-chip jmz-chip--ghost">无标签</span>
      </div>
      <div class="jmz-card-foot">
        <slot name="footer">
          <span v-if="kindLabel" class="jmz-card-kind">{{ kindLabel }}</span>
          <span v-if="comic.total_views" class="jmz-card-pages">{{ comic.total_views }}次</span>
          <span v-if="comic.likes" class="jmz-card-pages">{{ comic.likes }}❤</span>
          <span v-if="dateLabel" class="jmz-card-date">{{ dateLabel }}</span>
          <span style="margin-left:auto;display:flex"><CardFavBtn :comic="comic" :favorited="!!comic.is_favorite" /></span>
        </slot>
      </div>
      <slot name="actions" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Comic } from '@/types'
import CardDownloadBtn from './CardDownloadBtn.vue'
import CardReadBtn from './CardReadBtn.vue'
import CardFavBtn from './CardFavBtn.vue'

const props = defineProps<{
  comic: Comic
  toneClass?: string
  fetching?: boolean
  coverReady?: boolean
  metaOpen?: (id: number) => void
  filterByAuthor?: (name: string, ev: Event) => void
  onCoverLoad?: () => void
  onCoverErr?: (ev: Event) => void
}>()

function fmtDate(ts: any): string {
  if (ts == null || ts === '') return ''
  const n = Number(ts)
  if (Number.isFinite(n)) {
    const d = new Date(n * 1000)
    const Y = d.getFullYear()
    const M = String(d.getMonth() + 1).padStart(2, '0')
    const D = String(d.getDate()).padStart(2, '0')
    return `${Y}-${M}-${D}`
  }
  return String(ts).slice(0, 10)
}

const kindLabel = computed(() => {
  const c = props.comic
  return c.displayKindLabel || c.category_sub?.title || c.category?.title || c.kind || ''
})

const dateLabel = computed(() => {
  return props.comic.updateDate || fmtDate(props.comic.update_at)
})
</script>

<style scoped>
.jmz-card {
  width: 100%;
  min-width: 0;
  max-width: none;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: linear-gradient(180deg, #22222a 0%, #1a1a20 100%);
  border: 1px solid #2e2e35;
  border-left: 4px solid #3b82f6;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2), 0 12px 28px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  cursor: pointer;
  outline: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.jmz-card.tone-1 { border-left-color: #3b82f6; }
.jmz-card.tone-2 { border-left-color: #8b5cf6; }
.jmz-card.tone-3 { border-left-color: #10b981; }
.jmz-card.tone-4 { border-left-color: #f59e0b; }
.jmz-card:hover,
.jmz-card:focus-visible {
  transform: translateY(-3px);
  border-color: #3d3d4a;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.15), 0 18px 40px rgba(0, 0, 0, 0.4);
}
.jmz-card--fetching {
  opacity: 0.6;
  pointer-events: none;
}

.jmz-card-cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: #2a2a30;
}

.jmz-cover-spinner {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.jmz-card-ribbon {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  padding: 3px 9px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.4;
  background: rgba(37, 99, 235, 0.85);
  color: #fff;
  pointer-events: none;
}
.jmz-card-ribbon--new {
  background: rgba(80, 80, 90, 0.75);
  color: #b0b0c0;
}
.jmz-card-ribbon--read {
  left: auto;
  right: 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.jmz-card-fetching-mask {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 16, 20, 0.7);
}

.jmz-card-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.25s;
}
.jmz-card-cover--show {
  opacity: 1;
}

.jmz-card-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.jmz-card-num {
  font-size: 11px;
  font-weight: 700;
  color: #7a7a8a;
  font-variant-numeric: tabular-nums;
}

.jmz-card-title {
  font-size: 13px;
  font-weight: 700;
  color: #e0e0e6;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.jmz-card-author {
  font-size: 13px;
  color: #9b9bb4;
  font-weight: 600;
  min-height: 1.35em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jmz-card-author--muted {
  color: #6a6a7a;
}
.jmz-author-link { color: inherit; }
.jmz-author-sep { color: inherit; text-decoration: none; white-space: pre; }

.jmz-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.jmz-card-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  color: #7a7a8a;
  align-items: center;
}

.jmz-card-kind {
  color: #8b8be0;
  font-weight: 600;
}

.jmz-card-pages {
  font-variant-numeric: tabular-nums;
}

.jmz-card-date {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
</style>
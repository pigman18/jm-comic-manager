<template>
  <article
    :class="['jmz-card', toneClass]"
    role="button"
    tabindex="0"
    @click="metaOpen?.(comic.id)"
    @keyup.enter="metaOpen?.(comic.id)"
  >
    <div class="jmz-card-cover-wrap">
      <div v-show="!coverReady" class="jmz-cover-spinner" aria-hidden="true">
        <n-spin size="small" />
      </div>
      <img
        :ref="(el: any) => onCoverImg?.(el, comic.id, comic.cover)"
        class="jmz-card-cover xxx-img"
        :class="{ 'jmz-card-cover--show': coverReady }"
        :src="comic.cover || ''"
        :alt="comic.name"
        :loading="imgLoading"
        :fetchpriority="coverPriority"
        decoding="async"
        width="240"
        height="320"
        @load="onCoverLoad?.()"
        @error="onCoverErr?.($event)"
      />
      <span v-if="comic.canRead" class="jmz-card-ribbon">可读</span>
      <CardMetaBtn :comic="comic" />
      <CardBanBtn :comic="comic" :on-toggle="onBanToggle" />
      <CardDownloadBtn :comic="comic" :fetch-remote="fetchRemote" />
      <CardReadBtn :comic="comic" :fetch-remote="fetchRemote" />
    </div>
    <div class="jmz-card-body">
      <div class="jmz-card-num">JM{{ comic.id }}</div>
      <h2 class="jmz-card-title xxx-text" role="link" tabindex="0" @click.stop="metaOpen?.(comic.id)" @keyup.enter.stop="metaOpen?.(comic.id)">{{ comic.name }}</h2>
      <div v-if="comic.author?.length" class="jmz-card-author"><template v-for="(a, ai) in comic.author" :key="a"><span class="jmz-author-link" role="link" tabindex="0" @click.stop="filterByAuthor?.(a, $event)" @keyup.enter.stop="filterByAuthor?.(a, $event)">{{ a }}</span><span v-if="ai < comic.author.length - 1" class="jmz-author-sep"> / </span></template></div>
      <div v-else class="jmz-card-author jmz-card-author--muted">作者未知</div>
      <div class="jmz-card-tags" aria-label="标签">
        <slot name="tags" />
      </div>
      <div class="jmz-card-dates">
        <slot name="dates" />
      </div>
      <div class="jmz-card-foot">
        <slot name="footer">
          <span class="jmz-card-kind">{{ comic.displayKindLabel }}</span>
          <span v-if="comic.total_views" class="jmz-card-pages">
            <n-icon :component="EyeOutline" size="13" style="vertical-align:-2px;margin-right:2px" />{{ comic.total_views }}
          </span>
          <span v-if="comic.likes" class="jmz-card-pages" style="margin-left:6px">
            <n-icon :component="HeartOutline" size="13" style="vertical-align:-2px;margin-right:2px" />{{ comic.likes }}
          </span>
        </slot>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Comic } from '@/types'
import CardMetaBtn from './CardMetaBtn.vue'
import CardBanBtn from './CardBanBtn.vue'
import CardDownloadBtn from './CardDownloadBtn.vue'
import CardReadBtn from './CardReadBtn.vue'
import { EyeOutline, HeartOutline } from '@vicons/ionicons5'

defineProps<{
  comic: Comic
  toneClass?: string
  coverReady: boolean
  imgLoading?: 'lazy' | 'eager'
  coverPriority?: 'high' | 'low'
  metaOpen?: (id: number) => void
  filterByAuthor?: (name: string, ev: Event) => void
  onCoverImg?: (el: HTMLImageElement | null, n: number, coverUrl?: string) => void
  onCoverLoad?: () => void
  onCoverErr?: (ev: Event) => void
  fetchRemote?: boolean
  onBanToggle?: () => void
}>()
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

.jmz-card-cover-wrap {
  position: relative;
  aspect-ratio: 3 / 4;
  background: linear-gradient(160deg, #2a2a30 0%, #1a1a20 55%, #1c1c3a 100%);
  flex-shrink: 0;
  overflow: hidden;
}
.jmz-cover-spinner {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(16, 16, 20, 0.72);
  color: #6b9fff;
}
.jmz-card-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  position: relative;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.28s ease;
}
.jmz-card-cover--show {
  opacity: 1;
}
.jmz-card-ribbon {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 4;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.95);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.jmz-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 12px 12px;
  gap: 6px;
  min-height: 0;
}
.jmz-card-num {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #7a7a8a;
  letter-spacing: 0.02em;
}
.jmz-card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  color: #e0e0e6;
  min-height: 2.35em;
  max-height: 2.35em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
  font-weight: 500;
}
.jmz-author-link { color: inherit; }
.jmz-author-sep { color: inherit; text-decoration: none; white-space: pre; }
.jmz-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
  align-content: flex-start;
}
.jmz-card-dates {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: #7a7a8a;
  min-height: 2.2em;
}
.jmz-date b {
  color: #9b9bb4;
  font-weight: 700;
}
.jmz-date--muted {
  color: #6a6a7a;
}
.jmz-card-foot {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #2e2e35 !important;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #7a7a8a;
}
.jmz-card-kind {
  font-weight: 700;
  color: #9b9bb4;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.jmz-card-pages {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #6a6a7a;
}
</style>

import { createRouter, createWebHashHistory } from 'vue-router'
import CatalogPage from '@/pages/CatalogPage.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'catalog', component: CatalogPage },
    { path: '/search', name: 'search', component: () => import('@/pages/SearchPage.vue') },
    { path: '/week', name: 'week', component: () => import('@/pages/WeekPage.vue') },
    { path: '/category', name: 'category', component: () => import('@/pages/CategoryPage.vue') },
    { path: '/serial', name: 'serial', component: () => import('@/pages/SerialPage.vue') },
    {
      path: '/detail/:num',
      name: 'detail',
      component: () => import('@/pages/DetailPage.vue'),
      props: true,
    },
    {
      path: '/meta/:num',
      name: 'meta',
      component: () => import('@/pages/MetaPage.vue'),
      props: true,
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

router.afterEach((to) => {
  if (to.name === 'catalog') document.title = 'JM 目录'
  else if (to.name === 'search') document.title = 'JM 搜索'
  else if (to.name === 'week') document.title = 'JM 每周必看'
  else if (to.name === 'category') document.title = 'JM 分类排行'
  else if (to.name === 'serial') document.title = 'JM 每日连载'
  else if (to.name === 'detail') document.title = `JM #${to.params.num}`
  else if (to.name === 'meta') document.title = `JM #${to.params.num} 元数据`
  else document.title = 'JM'
})

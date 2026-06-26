import { createRouter, createWebHashHistory } from 'vue-router'
import CatalogPage from '@/pages/CatalogPage.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'catalog', component: CatalogPage },
    { path: '/home', name: 'home', component: () => import('@/pages/HomePage.vue') },
    { path: '/search', name: 'search', component: () => import('@/pages/SearchPage.vue') },
    { path: '/week', name: 'week', component: () => import('@/pages/WeekPage.vue') },
    { path: '/category', name: 'category', component: () => import('@/pages/CategoryPage.vue') },
    { path: '/serial', name: 'serial', component: () => import('@/pages/SerialPage.vue') },
    { path: '/promote-list', name: 'promote-list', component: () => import('@/pages/PromoteListPage.vue') },
    { path: '/latest', name: 'latest', component: () => import('@/pages/LatestPage.vue') },
    { path: '/favorites', name: 'favorites', component: () => import('@/pages/FavoritesPage.vue') },
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
  if (to.name === 'catalog') document.title = '本地管理'
  else if (to.name === 'home') document.title = '主站首页'
  else if (to.name === 'search') document.title = '漫画搜索'
  else if (to.name === 'week') document.title = '每周必看'
  else if (to.name === 'category') document.title = '分类排行'
  else if (to.name === 'serial') document.title = '每日连载'
  else if (to.name === 'promote-list') document.title = '推广列表'
  else if (to.name === 'latest') document.title = '最新发布'
  else if (to.name === 'favorites') document.title = '收藏列表'
  else if (to.name === 'detail') document.title = `JM${to.params.num}`
  else if (to.name === 'meta') document.title = `JM${to.params.num} 元数据`
  else document.title = 'JM'
})

# 🚫 禁止文档：Vue3 + Vue Router 分页 / 清空搜索的"改不动"事故记录

> **状态：永久禁止违反以下规则的设计与重构**

---

## 一、事故现象（为什么"一直改不动"）

### 表现

1. ✅ 第一次输入 / 清空 → 正常
2. ❌ 第二次清空 → **完全没反应**
3. ❌ 分页点击 → 没反应
4. ❌ 输入框被清空，但 URL 仍保留旧字段

---

## 二、根因（唯一真相）

### ❌ 错误设计：用 URL query 当"状态容器"

```ts
filters.title = route.query.title
router.replace({ query: filtersToQuery() })
```

**问题：**

- URL 是"快照"，不是"状态"
- 清空 ≠ 空字符串
- 空字符串 ≠ URL 变化
- Vue Router 会**直接吞掉"看起来一样"的跳转**

👉 **这不是 bug，是 Vue Router 的设计**

---

## 三、踩坑清单（被禁止的反模式）

### ❌ 1. 把"空字符串"当"清空"

```ts
// ❌ 错误
if (filters.title.trim()) q.title = filters.title
```

**后果：**

- 第一次清空：字段消失 → URL 变了 ✅
- 第二次清空：字段本来就不存在 → URL 不变 ❌

---

### ❌ 2. 用 `watch(route.query)` 驱动业务

```ts
// ❌ 禁止
watch(() => route.query, () => { ... })
```

**后果：**

- URL 不变 → watch 不触发
- keep-alive / 缓存 / activated 会掩盖问题
- **调试地狱**

✅ **禁止：`watch(route.query)` 用于"页面级刷新"以外的任何逻辑**

---

### ❌ 3. `onBeforeRouteLeave`（根本不存在）

```ts
// ❌ Vue Router 没有这个 API
import { onBeforeRouteLeave } from 'vue-router'
```

✅ **Vue Router 只提供：**
- `onBeforeRouteEnter`（进入前）
- `onBeforeRouteUpdate`（更新时）
- `onBeforeUnmount`（组件卸载前，来自 Vue 核心）

✅ **正确做法：`onBeforeUnmount` / 组件内守卫**

---

### ❌ 4. 用 `cachedQueryKey` 防重复

```ts
// ❌ 错误
const cachedQueryKey = ''
if (key === cachedQueryKey) return
```

**后果：**

- 第二次清空，key 一样 → 直接 return
- **所有"重复值"场景全部失效**

---

### ❌ 5. `filtersToQuery()` 动态删字段

```ts
// ❌ 错误
function filtersToQuery() {
  const q: Record<string, string> = {}
  if (filters.title.trim()) q.title = filters.title.trim()
  // ...
  return q
}
```

**后果：**

- 清空前：`?title=a`
- 清空后：`?` （字段消失）
- 再清空：`?` ← 一模一样
- **Vue Router 判定"没变化"**

---

### ❌ 6. 分页只改 `filters.page`，不触发加载

```vue
<!-- ❌ 错误 -->
<n-pagination v-model:page="filters.page" />
```

**后果：**

- page 变了
- URL 没变
- `watch` 没写
- **页面不动**

✅ **分页变化 = 显式调用 `loadList()`**

---

### ❌ 7. `watch(list)` 驱动业务流程

```ts
// ❌ 错误
watch(list, (v) => { currentPageComics.value = v }, { immediate: true })
```

**后果：**

- 数据变化 → 隐式触发副作用
- 流程不透明，调试困难
- 违反"显式调用"原则

✅ **禁止：任何 `watch` 驱动业务流程**

---

## 四、唯一允许的正确设计（✅ 记住这一套）

### ✅ 原则 1：URL 是"快照"，不是"状态"

- ✅ 进页面时：从 URL 读一次
- ✅ 用户操作时：改 URL + 手动加载
- ❌ 不允许：用 URL 当 reactive 状态

---

### ✅ 原则 2：清空 = 删除字段，不是空字符串

```ts
// ✅ 正确
function filtersToQuery(): Record<string, string> {
  const q: Record<string, string> = {}
  if (filters.title) q.title = filters.title
  if (filters.author) q.author = filters.author
  // ...
  return q
}
```

✅ 清空 → URL 删除该字段  
✅ 非默认值 → URL 才有该字段  
✅ 第二次清空 → URL 不变 → 不触发（**正确行为**）

---

### ✅ 原则 3：所有出口统一为"显式调用"

```ts
// ✅ 正确
function resetPage(): void {
  filters.page = 1
  router.replace({ name: 'catalog', query: filtersToQuery() })
  loadList()
}
```

✅ 不分页、不搜索、不清空走不同分支  
✅ 所有行为都是"你点 → 我执行"

---

### ✅ 原则 4：分页必须单独监听

```ts
// ✅ 正确
function onPageChange(): void {
  router.replace({ name: 'catalog', query: filtersToQuery() })
  loadList()
}
```

```vue
<!-- ✅ 正确 -->
<n-pagination
  v-model:page="filters.page"
  v-model:page-size="filters.pageSize"
  @update:page="onPageChange"
  @update:page-size="onPageChange"
/>
```

---

### ✅ 原则 5：禁止一切"隐式流程控制"

| 禁止 | 原因 |
|---|---|
| `watch(route.query)` | 吞重复值 |
| `cachedQueryKey` | 吞第二次清空 |
| `onActivated` 恢复数据 | 覆盖新数据 |
| `onBeforeRouteLeave` | 不存在 |
| `watch(list)` 驱动业务 | 隐式、难调试 |
| 空字符串当清空 | URL 不变 |

---

## 五、正确模板（最小可用）

### ✅ filtersToQuery

```ts
function filtersToQuery(): Record<string, string> {
  const q: Record<string, string> = {}

  // 只有非默认值才进 URL
  if (filters.title) q.title = filters.title
  if (filters.author) q.author = filters.author
  if (filters.number) q.number = filters.number
  if (filters.tags.length) q.tags = filters.tags.join(',')
  if (filters.kind) q.kind = filters.kind
  if (filters.available) q.available = 'true'
  if (filters.banned) q.banned = 'true'
  if (filters.sort !== 'update_time') q.sort = filters.sort
  if (filters.order !== 'desc') q.order = filters.order
  if (filters.page > 1) q.page = String(filters.page)
  if (filters.pageSize !== 10) q.pageSize = String(filters.pageSize)

  return q
}
```

---

### ✅ 分页处理

```ts
function onPageChange(): void {
  router.replace({ name: 'catalog', query: filtersToQuery() })
  loadList()
}
```

```vue
<n-pagination
  v-model:page="filters.page"
  v-model:page-size="filters.pageSize"
  :page-count="Math.ceil(total / filters.pageSize)"
  :page-sizes="[10, 20, 30, 40, 50]"
  :show-size-picker="true"
  @update:page="onPageChange"
  @update:page-size="onPageChange"
/>
```

---

### ✅ 清空处理

```ts
function clearTitle(): void {
  filters.title = ''
  resetPage()
}

function clearAuthor(): void {
  filters.author = ''
  resetPage()
}

function clearNumber(): void {
  filters.number = ''
  resetPage()
}

function clearTags(): void {
  filters.tags = []
  resetPage()
}

function clearKind(): void {
  filters.kind = ''
  resetPage()
}
```

```vue
<n-input v-model:value="filters.title" clearable @clear="clearTitle" />
<n-input v-model:value="filters.author" clearable @clear="clearAuthor" />
<n-input v-model:value="filters.number" clearable @clear="clearNumber" />
<n-select v-model:value="filters.tags" clearable @clear="clearTags" />
<n-select v-model:value="filters.kind" clearable @clear="clearKind" />
```

---

### ✅ 生命周期

```ts
onMounted(() => {
  readFiltersFromRoute()
  loadList()
})

onBeforeUnmount(() => {
  scrollTop.value = mainScrollRef.value?.scrollTop || 0
})
```

---

## 六、事故结论

> **这次"改不动"，不是 Vue 的锅，不是 Router 的锅，不是 keep-alive 的锅。**  
> **是"把 URL 当状态"这个设计本身错了。**

✅ **记住这一条就够了**

---

## 七、CSS 踩坑记录

### ❌ 错误写法（多了 `:`）

```css
/* ❌ 最后一项用了冒号 */
transition: transform 0.18s ease, box-shadow 0.18s ease, border-color: 0.18s ease;
```

### ✅ 正确写法

```css
/* ✅ 最后一项用分号 */
transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
```

---

## 八、Vue Router API 速查（防止再犯）

| API | 来源 | 说明 |
|---|---|---|
| `onBeforeRouteEnter` | `vue-router` | 进入路由前（setup 不可用） |
| `onBeforeRouteUpdate` | `vue-router` | 同组件路由更新时 |
| `onBeforeUnmount` | `vue` | 组件卸载前（替代 onBeforeRouteLeave） |
| `onMounted` | `vue` | 组件挂载后 |
| `onActivated` | `vue` | keep-alive 激活时 |
| `onDeactivated` | `vue` | keep-alive 失活时 |

⚠️ **`onBeforeRouteLeave` 不存在，永远不要引用**

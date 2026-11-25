# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scroll.spec.js >> Scroll Mobile (390px) - Rotas Públicas >> FAQ mobile deve permitir scroll
- Location: tests\scroll.spec.js:180:5

# Error details

```
Error: page.goto: Could not connect to server
Call log:
  - navigating to "http://localhost:5173/faq", waiting until "load"

```

# Test source

```ts
  81  |   })
  82  | 
  83  |   await page.waitForTimeout(300)
  84  | 
  85  |   // Verificar se chegou no final
  86  |   const finalPosition = await page.evaluate(() => {
  87  |     const scrollTop = window.scrollY || document.documentElement.scrollTop
  88  |     const clientHeight = window.innerHeight
  89  |     const scrollHeight = Math.max(
  90  |       document.body.scrollHeight,
  91  |       document.documentElement.scrollHeight
  92  |     )
  93  | 
  94  |     // Tolerância de 5px para arredondamento
  95  |     const atBottom = scrollTop + clientHeight >= scrollHeight - 5
  96  | 
  97  |     return {
  98  |       scrollTop,
  99  |       clientHeight,
  100 |       scrollHeight,
  101 |       atBottom,
  102 |     }
  103 |   })
  104 | 
  105 |   return finalPosition.atBottom
  106 | }
  107 | 
  108 | /**
  109 |  * Verifica se existe overflow hidden problemático
  110 |  * @param {import('@playwright/test').Page} page
  111 |  */
  112 | async function checkOverflowIssues(page) {
  113 |   const issues = await page.evaluate(() => {
  114 |     const problems = []
  115 | 
  116 |     // Verificar html e body
  117 |     const html = document.documentElement
  118 |     const body = document.body
  119 |     const root = document.getElementById('root')
  120 | 
  121 |     const htmlStyle = getComputedStyle(html)
  122 |     const bodyStyle = getComputedStyle(body)
  123 |     const rootStyle = root ? getComputedStyle(root) : null
  124 | 
  125 |     // Check for 100vh with overflow hidden
  126 |     if (htmlStyle.height === '100vh' || htmlStyle.height.includes('100vh')) {
  127 |       if (htmlStyle.overflow === 'hidden' || htmlStyle.overflowY === 'hidden') {
  128 |         problems.push('html has 100vh + overflow hidden')
  129 |       }
  130 |     }
  131 | 
  132 |     if (bodyStyle.height === '100vh' || bodyStyle.height.includes('100vh')) {
  133 |       if (bodyStyle.overflow === 'hidden' || bodyStyle.overflowY === 'hidden') {
  134 |         problems.push('body has 100vh + overflow hidden')
  135 |       }
  136 |     }
  137 | 
  138 |     if (rootStyle) {
  139 |       if (rootStyle.height === '100vh' || rootStyle.height.includes('100vh')) {
  140 |         if (rootStyle.overflow === 'hidden' || rootStyle.overflowY === 'hidden') {
  141 |           problems.push('#root has 100vh + overflow hidden')
  142 |         }
  143 |       }
  144 |     }
  145 | 
  146 |     return problems
  147 |   })
  148 | 
  149 |   return issues
  150 | }
  151 | 
  152 | // ============================================
  153 | // TESTES PARA ROTAS PÚBLICAS
  154 | // ============================================
  155 | 
  156 | test.describe('Scroll - Rotas Públicas', () => {
  157 |   for (const route of publicRoutes) {
  158 |     test(`${route.name} (${route.path}) deve permitir scroll`, async ({ page }) => {
  159 |       await page.goto(route.path)
  160 | 
  161 |       // Verificar overflow issues
  162 |       const issues = await checkOverflowIssues(page)
  163 |       expect(issues, `Overflow issues encontradas: ${issues.join(', ')}`).toHaveLength(0)
  164 | 
  165 |       // Verificar scroll
  166 |       const canScroll = await canScrollToBottom(page)
  167 |       expect(canScroll, 'Não foi possível rolar até o final da página').toBeTruthy()
  168 |     })
  169 |   }
  170 | })
  171 | 
  172 | // ============================================
  173 | // TESTES MOBILE (390px)
  174 | // ============================================
  175 | 
  176 | test.describe('Scroll Mobile (390px) - Rotas Públicas', () => {
  177 |   test.use({ viewport: { width: 390, height: 844 } })
  178 | 
  179 |   for (const route of publicRoutes) {
  180 |     test(`${route.name} mobile deve permitir scroll`, async ({ page }) => {
> 181 |       await page.goto(route.path)
      |                  ^ Error: page.goto: Could not connect to server
  182 | 
  183 |       const issues = await checkOverflowIssues(page)
  184 |       expect(issues).toHaveLength(0)
  185 | 
  186 |       const canScroll = await canScrollToBottom(page)
  187 |       expect(canScroll).toBeTruthy()
  188 |     })
  189 |   }
  190 | })
  191 | 
  192 | // ============================================
  193 | // TESTES DE ALTURA FIXA
  194 | // ============================================
  195 | 
  196 | test.describe('Verificar elementos com altura fixa', () => {
  197 |   test('Landing page não deve ter wrappers com h-screen + overflow-hidden', async ({ page }) => {
  198 |     await page.goto('/')
  199 |     await page.waitForLoadState('domcontentloaded')
  200 | 
  201 |     const problematicElements = await page.evaluate(() => {
  202 |       const elements = document.querySelectorAll('*')
  203 |       const problems = []
  204 | 
  205 |       elements.forEach(el => {
  206 |         const style = getComputedStyle(el)
  207 |         // SVG elements have SVGAnimatedString, not string - convert safely
  208 |         const classList = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '')
  209 | 
  210 |         // Verificar h-screen ou 100vh
  211 |         const hasFixedHeight = style.height === '100vh' ||
  212 |           classList.includes('h-screen') ||
  213 |           classList.includes('100vh')
  214 | 
  215 |         // Verificar overflow hidden
  216 |         const hasOverflowHidden = style.overflow === 'hidden' ||
  217 |           style.overflowY === 'hidden' ||
  218 |           classList.includes('overflow-hidden')
  219 | 
  220 |         if (hasFixedHeight && hasOverflowHidden) {
  221 |           // Ignorar elementos intencionais como modais
  222 |           const tag = el.tagName.toLowerCase()
  223 |           if (tag !== 'body' && tag !== 'html' && !classList.includes('modal')) {
  224 |             problems.push({
  225 |               tag,
  226 |               class: classList.slice(0, 100),
  227 |               id: el.id,
  228 |             })
  229 |           }
  230 |         }
  231 |       })
  232 | 
  233 |       return problems
  234 |     })
  235 | 
  236 |     if (problematicElements.length > 0) {
  237 |       console.log('Elementos problemáticos:', problematicElements)
  238 |     }
  239 | 
  240 |     // Ainda permitir o teste passar, mas logar warnings
  241 |     expect(problematicElements.length).toBeLessThanOrEqual(0)
  242 |   })
  243 | })
  244 | 
  245 | // ============================================
  246 | // TESTE DE ESPAÇAMENTO MOBILE NAV
  247 | // ============================================
  248 | 
  249 | test.describe('Espaçamento Mobile Nav', () => {
  250 |   test.use({ viewport: { width: 390, height: 844 } })
  251 | 
  252 |   test('Dashboard deve ter padding-bottom para nav mobile', async ({ page }) => {
  253 |     // Este teste precisa de autenticação - skip se não houver
  254 |     await page.goto('/login')
  255 | 
  256 |     // Verificar se redireciona para login (esperado sem auth)
  257 |     await expect(page).toHaveURL(/login/)
  258 | 
  259 |     // O teste completo de dashboard precisa de mock de auth
  260 |     // Por ora, verificamos a estrutura da landing
  261 |     await page.goto('/')
  262 | 
  263 |     const hasBottomNav = await page.evaluate(() => {
  264 |       // Verificar se existe nav fixa no bottom em mobile
  265 |       const nav = document.querySelector('nav[class*="fixed"][class*="bottom"]')
  266 |       return !!nav
  267 |     })
  268 | 
  269 |     // Landing não tem nav mobile, então deve ser false
  270 |     expect(hasBottomNav).toBeFalsy()
  271 |   })
  272 | })
  273 | 
```
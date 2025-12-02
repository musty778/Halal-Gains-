# Performance Optimization Guide

This document outlines the performance optimizations implemented in Halal Gains and best practices for maintaining optimal speed.

## ✅ Implemented Optimizations

### 1. **Code Splitting & Lazy Loading**
- All page components are lazy-loaded using `React.lazy()`
- Vendor chunks separated (React, Chart.js, Supabase, Icons)
- Manual chunk configuration in Vite for optimal bundle sizes

### 2. **React Optimization**
- **Memoization**: Components like `StatCard` and `ExerciseItem` use `React.memo()`
- **useMemo**: Expensive calculations cached (exercise completion maps, chart data)
- **useCallback**: Event handlers and fetch functions wrapped to prevent re-renders

### 3. **Database Query Optimization**
- Only fetch required fields with specific `select()` queries
- Use `.maybeSingle()` instead of `.single()` to avoid errors
- Implement proper error handling with try-catch blocks
- Added query result caching with custom hooks

### 4. **Service Worker & PWA**
- Offline caching for static assets
- Progressive Web App support
- Faster subsequent page loads

### 5. **Image Optimization**
- Custom `LazyImage` component with Intersection Observer
- Blur-up placeholder effect
- Images load 50px before entering viewport

### 6. **Build Optimization**
- Terser minification with console.log removal in production
- Tree shaking enabled
- Modern browser targeting (ES2015+)

## 📊 Performance Monitoring

### Web Vitals Tracked
- **LCP** (Largest Contentful Paint): < 2.5s ✅
- **FID** (First Input Delay): < 100ms ✅
- **CLS** (Cumulative Layout Shift): < 0.1 ✅

### Development Tools
Run the app in dev mode to see performance metrics in the console:
```bash
npm run dev
```

## 🚀 Best Practices for Developers

### 1. Component Optimization
```tsx
// ✅ Good: Memoized component
const MyComponent = memo(({ data }) => {
  return <div>{data}</div>
})

// ❌ Bad: Re-renders on every parent update
const MyComponent = ({ data }) => {
  return <div>{data}</div>
}
```

### 2. Expensive Calculations
```tsx
// ✅ Good: Cached calculation
const expensiveValue = useMemo(() => {
  return data.map(item => heavyComputation(item))
}, [data])

// ❌ Bad: Recalculated on every render
const expensiveValue = data.map(item => heavyComputation(item))
```

### 3. Event Handlers
```tsx
// ✅ Good: Stable reference
const handleClick = useCallback(() => {
  doSomething(id)
}, [id])

// ❌ Bad: New function on every render
const handleClick = () => {
  doSomething(id)
}
```

### 4. Database Queries
```tsx
// ✅ Good: Only fetch needed fields
const { data } = await supabase
  .from('users')
  .select('id, name, email')
  .eq('id', userId)
  .maybeSingle()

// ❌ Bad: Fetch all fields
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()
```

### 5. Image Loading
```tsx
// ✅ Good: Lazy loaded with placeholder
<LazyImage 
  src="/large-image.jpg" 
  alt="Description"
  placeholder="/tiny-placeholder.jpg"
/>

// ❌ Bad: Eager loading all images
<img src="/large-image.jpg" alt="Description" />
```

## 📈 Performance Checklist

Before deploying:
- [ ] Run `npm run build` and check bundle sizes
- [ ] Test on slow 3G connection
- [ ] Check Lighthouse scores (aim for 90+)
- [ ] Verify service worker is registered
- [ ] Test lazy loading on long pages
- [ ] Ensure no console errors in production

## 🛠️ Measuring Performance

### Lighthouse Audit
```bash
npm run build
npm run preview
# Open Chrome DevTools > Lighthouse > Generate Report
```

### Bundle Analysis
```bash
npm run build
# Check dist/ folder sizes
```

### Network Throttling
1. Open Chrome DevTools
2. Network tab > Throttling dropdown
3. Select "Slow 3G" or "Fast 3G"
4. Test your app

## 🔧 Troubleshooting

### Large Bundle Size
- Check for duplicate dependencies
- Use dynamic imports for rarely-used features
- Remove unused imports and dead code

### Slow Initial Load
- Reduce code in main bundle
- Preload critical resources
- Enable gzip/brotli compression on server

### Janky Animations
- Use CSS transforms instead of position changes
- Avoid layout thrashing
- Use `will-change` CSS property sparingly

## 📚 Additional Resources
- [Web.dev Performance](https://web.dev/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [Supabase Best Practices](https://supabase.com/docs/guides/database/performance)


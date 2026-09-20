import { ref, computed } from 'vue'

const savedTheme = (localStorage.getItem('servicehub_theme') as 'light' | 'dark') || 'light'
const currentTheme = ref<'light' | 'dark'>(savedTheme)

function applyTheme(theme: 'light' | 'dark'): void {
  currentTheme.value = theme
  localStorage.setItem('servicehub_theme', theme)
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// Initial apply
applyTheme(savedTheme)

export function useTheme() {
  const isDark = computed(() => currentTheme.value === 'dark')

  function toggleTheme(): void {
    applyTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: currentTheme,
    isDark,
    toggleTheme,
    setTheme: applyTheme
  }
}

import { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 主题状态：'dark', 'light', 'system'
  const [theme, setTheme] = useState(() => {
    // 尝试从本地存储获取主题设置
    const storedTheme = localStorage.getItem('theme');
    return storedTheme || 'system';
  });

  // 应用主题到 HTML 元素
  useEffect(() => {
    const html = document.documentElement;
    
    // 移除现有的类
    html.classList.remove('dark', 'light');

    if (theme === 'system') {
      // 使用系统偏好
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDarkMode) {
        html.classList.add('dark');
      } else {
        html.classList.add('light');
      }
    } else {
      // 直接应用所选主题
      html.classList.add(theme);
    }

    // 保存到本地存储
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 监听系统主题变化（仅当选择'system'模式时重要）
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const html = document.documentElement;
      html.classList.remove('dark', 'light');
      html.classList.add(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
} 
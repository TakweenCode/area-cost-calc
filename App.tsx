import React, { useState, useEffect } from 'react';
import Calculator from './components/Calculator';
import SettingsModal from './components/SettingsModal';
import { SunIcon, MoonIcon, DesktopIcon, SettingsIcon } from './components/Icons';

type Theme = 'light' | 'dark' | 'system';

const ThemeSwitcher: React.FC<{ theme: Theme; setTheme: (theme: Theme) => void }> = ({
  theme,
  setTheme,
}) => {
  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const themeIcons: Record<Theme, React.ReactNode> = {
    light: <SunIcon className="w-4 h-4" />,
    dark: <MoonIcon className="w-4 h-4" />,
    system: <DesktopIcon className="w-4 h-4" />,
  };

  const themeLabels: Record<Theme, string> = {
    light: 'الوضع الفاتح',
    dark: 'الوضع الداكن',
    system: 'تلقائي حسب النظام',
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] px-2.5 sm:px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      aria-label={`تغيير المظهر: ${themeLabels[theme]}`}
      title={`المظهر الحالي: ${themeLabels[theme]}`}
    >
      {themeIcons[theme]}
      <span className="hidden sm:inline">{themeLabels[theme]}</span>
    </button>
  );
};

const App: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme') as Theme | null;
      if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
        return storedTheme;
      }
    }
    return 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const root = window.document.documentElement;
        root.classList.toggle('dark', mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Clean Top Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm no-print">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-4">
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            حاسبة المساحات والتكاليف
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isSettingsOpen}
              aria-label="الإعدادات والمعلومات"
              title="الإعدادات"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 pt-5 pb-8 sm:py-8 lg:py-10">
        <div className="mb-5 sm:mb-8 max-w-2xl">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
            حاسبة تكلفة تغطية المساحات
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1.5 sm:mt-2 leading-relaxed">
            احسب المساحة الصافية وكمية الهدر المطلوبة، وقدّر تكلفة المواد والتركيب والضريبة بدقة في مكان واحد.
          </p>
        </div>

        <Calculator />
      </main>

      {/* Quiet Domain Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-5 px-4 text-center text-xs text-slate-500 dark:text-slate-400 no-print">
        <p>الأسعار ونسب الهدر الافتراضية استرشادية ويمكنك تعديلها لتطابق عرض المورد.</p>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default App;

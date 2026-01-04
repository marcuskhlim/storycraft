import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme-provider';
import { useTheme } from 'next-themes';
import { describe, it, expect } from 'vitest';

const TestComponent = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  );
};

describe('ThemeProvider', () => {
  it('renders children and provides theme context', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Initial render might be system or undefined during SSR, but client-side should show something.
    // We mainly check that it doesn't crash and provides context.
    const themeValue = screen.getByTestId('theme-value');
    expect(themeValue).toBeInTheDocument();
  });

  it('updates theme when setTheme is called', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TestComponent />
      </ThemeProvider>
    );

    const themeValue = screen.getByTestId('theme-value');
    const darkBtn = screen.getByText('Set Dark');

    // Initially light (forced by defaultTheme)
    // Note: next-themes might need a bit of time or mocking local storage, 
    // but for a basic integration test, we check if the state update function works.
    
    await act(async () => {
      darkBtn.click();
    });

    expect(themeValue).toHaveTextContent('dark');
  });
});

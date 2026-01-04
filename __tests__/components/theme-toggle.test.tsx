import { render, screen, act } from '@testing-library/react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from 'next-themes';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

describe('ThemeToggle', () => {
  const setThemeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useTheme as any).mockReturnValue({
      theme: 'light',
      setTheme: setThemeMock,
    });
  });

  it('renders the toggle button', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('toggles theme when clicked', async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    
    await act(async () => {
      button.click();
    });

    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });

  it('toggles back to light when currently dark', async () => {
    (useTheme as any).mockReturnValue({
      theme: 'dark',
      setTheme: setThemeMock,
    });

    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    
    await act(async () => {
      button.click();
    });

    expect(setThemeMock).toHaveBeenCalledWith('light');
  });
});

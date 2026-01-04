import config from '../../tailwind.config';
import { describe, it, expect } from 'vitest';

describe('Tailwind Configuration', () => {
  it('should have darkMode set to "class"', () => {
    expect(config.darkMode).toContain('class');
  });

  it('should use CSS variables for colors', () => {
    const colors = config.theme?.extend?.colors as any;
    
    // These should utilize CSS variables (e.g. "hsl(var(--background))" or similar)
    // instead of hardcoded hex values to support dark mode switching.
    expect(colors.background.DEFAULT).not.toMatch(/^#[0-9A-F]{6}$/i);
    expect(colors.primary.DEFAULT).not.toMatch(/^#[0-9A-F]{6}$/i);
    expect(colors.secondary.DEFAULT).not.toMatch(/^#[0-9A-F]{6}$/i);
    expect(colors.accent.DEFAULT).not.toMatch(/^#[0-9A-F]{6}$/i);
    expect(colors.muted.DEFAULT).not.toMatch(/^#[0-9A-F]{6}$/i);
  });
});

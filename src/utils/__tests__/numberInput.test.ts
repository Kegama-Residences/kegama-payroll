import { describe, expect, it } from 'vitest';
import { numOrEmpty, parseIntInput, parseNumInput } from '../numberInput';

describe('numOrEmpty', () => {
  it('renders blank for 0/undefined/null', () => {
    expect(numOrEmpty(0)).toBe('');
    expect(numOrEmpty(undefined)).toBe('');
    expect(numOrEmpty(null)).toBe('');
  });
  it('passes through non-zero numbers (no leading zero)', () => {
    expect(numOrEmpty(5)).toBe(5);
    expect(numOrEmpty(1500)).toBe(1500);
    expect(numOrEmpty(0.5)).toBe(0.5);
  });
});

describe('parseNumInput', () => {
  it('treats blank as 0 so the field stays clearable', () => {
    expect(parseNumInput('')).toBe(0);
    expect(parseNumInput('   ')).toBe(0);
  });
  it('parses typed digits without a sticky leading zero', () => {
    expect(parseNumInput('5')).toBe(5);
    expect(parseNumInput('05')).toBe(5);
    expect(parseNumInput('1500')).toBe(1500);
  });
  it('guards invalid input', () => {
    expect(parseNumInput('abc')).toBe(0);
  });
});

describe('parseIntInput', () => {
  it('treats blank as 0', () => {
    expect(parseIntInput('')).toBe(0);
  });
  it('parses minutes naturally', () => {
    expect(parseIntInput('30')).toBe(30);
    expect(parseIntInput('05')).toBe(5);
  });
});

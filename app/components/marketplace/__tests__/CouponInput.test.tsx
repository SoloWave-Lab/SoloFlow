/**
 * Tests for CouponInput component
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, userEvent } from '~/test/test-utils';
import { renderWithRouter } from '~/test/test-utils';
import { CouponInput } from '../CouponInput';

describe('CouponInput', () => {
  const mockOnApply = vi.fn();
  const mockOnRemove = vi.fn();

  const defaultProps = {
    onApply: mockOnApply,
    onRemove: mockOnRemove,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render input field', () => {
    renderWithRouter(<CouponInput {...defaultProps} />);

    expect(screen.getByPlaceholderText(/enter coupon code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
  });

  it('should call onApply when apply button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CouponInput {...defaultProps} />);

    const input = screen.getByPlaceholderText(/enter coupon code/i);
    const applyButton = screen.getByRole('button', { name: /apply/i });

    await user.type(input, 'TEST10');
    await user.click(applyButton);

    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalledWith('TEST10');
    });
  });

  it('should call onApply when Enter key is pressed', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CouponInput {...defaultProps} />);

    const input = screen.getByPlaceholderText(/enter coupon code/i);

    await user.type(input, 'TEST10{Enter}');

    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalledWith('TEST10');
    });
  });

  it('should convert code to uppercase', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CouponInput {...defaultProps} />);

    const input = screen.getByPlaceholderText(/enter coupon code/i) as HTMLInputElement;

    await user.type(input, 'test10');

    expect(input.value).toBe('TEST10');
  });

  it('should show success message when coupon is applied', () => {
    const appliedCoupon = {
      code: 'TEST10',
      discountType: 'percentage' as const,
      discountValue: 10,
      description: '10% off',
    };

    renderWithRouter(
      <CouponInput {...defaultProps} appliedCoupon={appliedCoupon} />
    );

    expect(screen.getByText(/coupon applied/i)).toBeInTheDocument();
    expect(screen.getByText('TEST10')).toBeInTheDocument();
    expect(screen.getByText('10% off')).toBeInTheDocument();
  });

  it('should show remove button when coupon is applied', () => {
    const appliedCoupon = {
      code: 'TEST10',
      discountType: 'percentage' as const,
      discountValue: 10,
      description: '10% off',
    };

    renderWithRouter(
      <CouponInput {...defaultProps} appliedCoupon={appliedCoupon} />
    );

    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('should call onRemove when remove button is clicked', async () => {
    const user = userEvent.setup();
    const appliedCoupon = {
      code: 'TEST10',
      discountType: 'percentage' as const,
      discountValue: 10,
      description: '10% off',
    };

    renderWithRouter(
      <CouponInput {...defaultProps} appliedCoupon={appliedCoupon} />
    );

    const removeButton = screen.getByRole('button', { name: /remove/i });
    await user.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalled();
  });

  it('should show error message', () => {
    renderWithRouter(
      <CouponInput {...defaultProps} error="Invalid coupon code" />
    );

    expect(screen.getByText(/invalid coupon code/i)).toBeInTheDocument();
  });

  it('should disable input when loading', () => {
    renderWithRouter(<CouponInput {...defaultProps} loading />);

    const input = screen.getByPlaceholderText(/enter coupon code/i);
    const applyButton = screen.getByRole('button', { name: /apply/i });

    expect(input).toBeDisabled();
    expect(applyButton).toBeDisabled();
  });

  it('should show loading spinner when loading', () => {
    renderWithRouter(<CouponInput {...defaultProps} loading />);

    // Check for loading spinner (Loader2 icon)
    expect(screen.getByRole('button', { name: /apply/i })).toContainHTML('svg');
  });

  it('should not call onApply with empty code', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CouponInput {...defaultProps} />);

    const applyButton = screen.getByRole('button', { name: /apply/i });
    await user.click(applyButton);

    expect(mockOnApply).not.toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    renderWithRouter(<CouponInput {...defaultProps} disabled />);

    const input = screen.getByPlaceholderText(/enter coupon code/i);
    const applyButton = screen.getByRole('button', { name: /apply/i });

    expect(input).toBeDisabled();
    expect(applyButton).toBeDisabled();
  });
});
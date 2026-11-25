import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PartnerDealDialog from '@/components/partners/PartnerDealDialog';

(globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

describe('Partner deal dialog (approval)', () => {
  it('starts at the partner’s saved deal, or 10 / 10', () => {
    const { unmount } = render(<PartnerDealDialog applicant={{ full_name: 'Code Hostels', commission_pct: 15, guest_discount_pct: 0 }} open onOpenChange={() => {}} onConfirm={() => {}} />);
    expect(screen.getByLabelText('Commission %')).toHaveValue('15');
    expect(screen.getByLabelText('Guest discount %')).toHaveValue('0');
    expect(screen.getByText("Code Hostels's deal")).toBeInTheDocument();
    unmount();
    render(<PartnerDealDialog applicant={{ full_name: 'Sharebus' }} open onOpenChange={() => {}} onConfirm={() => {}} />);
    expect(screen.getByLabelText('Commission %')).toHaveValue('10');
    expect(screen.getByLabelText('Guest discount %')).toHaveValue('10');
  });

  it('blocks impossible numbers and approves with the typed deal', async () => {
    const onConfirm = vi.fn();
    render(<PartnerDealDialog applicant={{ org_name: 'Yellow Hostels', full_name: 'Yellow Hostels' }} open onOpenChange={() => {}} onConfirm={onConfirm} />);
    const approve = screen.getByRole('button', { name: 'Approve partner' });
    fireEvent.change(screen.getByLabelText('Commission %'), { target: { value: '120' } });
    expect(approve).toBeDisabled();
    expect(screen.getByText('Enter numbers from 0 to 100.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Commission %'), { target: { value: '12.5%' } });
    fireEvent.change(screen.getByLabelText('Guest discount %'), { target: { value: '0' } });
    expect(approve).toBeEnabled();
    await act(async () => { fireEvent.click(approve); });
    expect(onConfirm).toHaveBeenCalledWith({ commission_pct: 12.5, guest_discount_pct: 0 });
  });
});

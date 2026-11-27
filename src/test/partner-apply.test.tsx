import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The page only talks to the submit-partner-application function; stub it.
const invoke = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));

import PartnerApplyPage from '@/pages/PartnerApplyPage';

// Radix Select and Checkbox need these in jsdom.
(globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
beforeEach(() => {
  invoke.mockReset();
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: vi.fn(),
    hasPointerCapture: vi.fn(() => false),
    releasePointerCapture: vi.fn(),
  });
});

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><PartnerApplyPage /></MemoryRouter>);

async function choose(triggerLabel: string, option: string) {
  const trigger = screen.getByRole('combobox', { name: triggerLabel });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  const opt = await screen.findByRole('option', { name: option });
  fireEvent.click(opt);
  await waitFor(() => expect(trigger).toHaveTextContent(option));
}

describe('Partner apply page', () => {
  it('is public: the form shows straight away, with no invite and no server check', async () => {
    renderAt('/partners');
    expect(await screen.findByText('Become a Mad Monkey partner')).toBeInTheDocument();
    expect(screen.queryByText(/by invitation/)).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('an old invite link still opens the form', async () => {
    renderAt('/partners?invite=oldlinkoldlinkoldlink');
    expect(await screen.findByText('Become a Mad Monkey partner')).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('checks the form, then submits a partner application', async () => {
    renderAt('/partners');
    expect(await screen.findByText('Become a Mad Monkey partner')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter your organisation name.');

    fireEvent.change(screen.getByLabelText('Organisation name'), { target: { value: 'Yellow Hostels' } });
    await choose('What kind of partner are you?', 'Hostel or hotel');
    fireEvent.change(screen.getByRole('textbox', { name: 'Website' }), { target: { value: 'yellowhostels.com' } });
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Anna Silva' } });
    fireEvent.change(screen.getByLabelText('Your role'), { target: { value: 'Marketing' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'anna@yellow.example' } });
    fireEvent.change(screen.getByLabelText('Country or regions you cover'), { target: { value: 'Portugal' } });

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please tell us how you will share your code.');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Front desk or reception' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Newsletter or email list' }));
    await choose('Rough audience size', '10,000 to 50,000');

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please agree to the Commission Agreement.');

    fireEvent.click(screen.getByRole('checkbox', { name: 'I agree to the Creator and Partner Commission Agreement' }));
    invoke.mockResolvedValueOnce({ data: { ok: true } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Apply' })); });

    expect(await screen.findByText('Thanks, Yellow Hostels!')).toBeInTheDocument();
    expect(invoke).toHaveBeenLastCalledWith('submit-partner-application', {
      body: {
        action: 'submit', agreed: true, company_fax: '',
        orgName: 'Yellow Hostels', category: 'hostel', website: 'yellowhostels.com',
        contactName: 'Anna Silva', contactRole: 'Marketing', email: 'anna@yellow.example', phone: '',
        regions: 'Portugal', channels: ['front_desk', 'newsletter'], audience: '10k_50k',
      },
    });
  });

  it('shows the server message when the email already applied', async () => {
    renderAt('/partners');
    await screen.findByText('Become a Mad Monkey partner');
    fireEvent.change(screen.getByLabelText('Organisation name'), { target: { value: 'Sharebus' } });
    await choose('What kind of partner are you?', 'Travel brand, transport or tours');
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Sam' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sam@sharebus.example' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Social media' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'I agree to the Creator and Partner Commission Agreement' }));
    invoke.mockResolvedValueOnce({ data: { ok: false, error: 'This email has already applied. We will be in touch soon.' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Apply' })); });
    expect(await screen.findByRole('alert')).toHaveTextContent('This email has already applied.');
  });
});

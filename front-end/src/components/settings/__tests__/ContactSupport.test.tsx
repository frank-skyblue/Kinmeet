import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SUPPORT_ISSUE_TYPES } from '../../../constants/supportOptions';
import ContactSupport from '../ContactSupport';

const mockSubmitSupportRequest = vi.fn();

vi.mock('../../../services/api', () => ({
  supportAPI: {
    submitSupportRequest: (...args: unknown[]) => mockSubmitSupportRequest(...args),
  },
}));

const renderComponent = () =>
  render(
    <MemoryRouter>
      <ContactSupport />
    </MemoryRouter>,
  );

const selectIssueType = async (
  user: ReturnType<typeof userEvent.setup>,
  issueType: string,
) => {
  await user.click(screen.getByRole('combobox', { name: /issue type/i }));
  await user.click(screen.getByRole('option', { name: issueType }));
};

describe('ContactSupport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exact copy, fields, and all issue type options', async () => {
    const user = userEvent.setup();
    renderComponent();

    expect(screen.getByRole('heading', { name: 'Contact Support' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Need help with something? Send us a message and we’ll get back to you as soon as possible.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /issue type/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/subject \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^message/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add screenshots or drag and drop/i }),
    ).toBeInTheDocument();
    const followUpCheckbox = screen.getByLabelText(
      /allow kinmeet to contact me about this support request/i,
    );
    expect(followUpCheckbox).toBeInTheDocument();
    expect(followUpCheckbox).not.toBeChecked();
    expect(screen.getByRole('button', { name: /submit support request/i })).toBeEnabled();

    await user.click(screen.getByRole('combobox', { name: /issue type/i }));
    for (const issueType of SUPPORT_ISSUE_TYPES) {
      expect(screen.getByRole('option', { name: issueType })).toBeInTheDocument();
    }
  });

  it('shows required field errors and does not call the API on empty submit', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: /submit support request/i }));

    expect(screen.getByText(/issue type is required/i)).toHaveAttribute('role', 'alert');
    expect(screen.queryByText(/subject is required/i)).not.toBeInTheDocument();
    expect(screen.getByText(/message is required/i)).toHaveAttribute('role', 'alert');
    expect(mockSubmitSupportRequest).not.toHaveBeenCalled();
  });

  it('submits trimmed values with followUp false by default and shows the exact success message', async () => {
    const user = userEvent.setup();
    mockSubmitSupportRequest.mockResolvedValueOnce({ success: true });
    renderComponent();

    await selectIssueType(user, 'Technical problem');
    await user.type(screen.getByLabelText(/subject \(optional\)/i), '  App crash  ');
    await user.type(screen.getByLabelText(/^message/i), '  Something broke.  ');
    await user.click(screen.getByRole('button', { name: /submit support request/i }));

    await waitFor(() => {
      expect(mockSubmitSupportRequest).toHaveBeenCalledTimes(1);
    });
    expect(mockSubmitSupportRequest).toHaveBeenCalledWith({
      issueType: 'Technical problem',
      subject: 'App crash',
      message: 'Something broke.',
      followUp: false,
      screenshots: [],
    });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Request submitted successfully.');
    expect(status).toHaveTextContent(
      'Thanks for reaching out. We’ve received your request and will get back to you soon.',
    );
  });

  it('submits without a subject when the field is left blank', async () => {
    const user = userEvent.setup();
    mockSubmitSupportRequest.mockResolvedValueOnce({ success: true });
    renderComponent();

    await selectIssueType(user, 'Other');
    await user.type(screen.getByLabelText(/^message/i), 'Need help with no subject.');
    await user.click(screen.getByRole('button', { name: /submit support request/i }));

    await waitFor(() => {
      expect(mockSubmitSupportRequest).toHaveBeenCalledWith({
        issueType: 'Other',
        subject: undefined,
        message: 'Need help with no subject.',
        followUp: false,
        screenshots: [],
      });
    });
  });

  it('omits a whitespace-only subject from the payload', async () => {
    const user = userEvent.setup();
    mockSubmitSupportRequest.mockResolvedValueOnce({ success: true });
    renderComponent();

    await selectIssueType(user, 'Other');
    await user.type(screen.getByLabelText(/subject \(optional\)/i), '   ');
    await user.type(screen.getByLabelText(/^message/i), 'Whitespace subject.');
    await user.click(screen.getByRole('button', { name: /submit support request/i }));

    await waitFor(() => {
      expect(mockSubmitSupportRequest).toHaveBeenCalledWith(
        expect.objectContaining({ subject: undefined }),
      );
    });
  });

  it('submits followUp true when the checkbox is checked', async () => {
    const user = userEvent.setup();
    mockSubmitSupportRequest.mockResolvedValueOnce({ success: true });
    renderComponent();

    await selectIssueType(user, 'Other');
    await user.type(screen.getByLabelText(/subject \(optional\)/i), 'Need help');
    await user.type(screen.getByLabelText(/^message/i), 'Please assist.');
    await user.click(
      screen.getByLabelText(/allow kinmeet to contact me about this support request/i),
    );
    await user.click(screen.getByRole('button', { name: /submit support request/i }));

    await waitFor(() => {
      expect(mockSubmitSupportRequest).toHaveBeenCalledWith(
        expect.objectContaining({ followUp: true }),
      );
    });
  });

  it('shows an API error and keeps the form visible', async () => {
    const user = userEvent.setup();
    mockSubmitSupportRequest.mockRejectedValueOnce(
      new Error('Unable to reach support right now'),
    );
    renderComponent();

    await selectIssueType(user, 'Other');
    await user.type(screen.getByLabelText(/subject \(optional\)/i), 'Need help');
    await user.type(screen.getByLabelText(/^message/i), 'Please assist.');
    await user.click(screen.getByRole('button', { name: /submit support request/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to reach support right now',
    );
    expect(screen.getByRole('button', { name: /submit support request/i })).toBeInTheDocument();
  });

  it('only calls the API once when submit is triggered rapidly', async () => {
    const user = userEvent.setup();
    let resolveSubmit: ((value: { success: boolean }) => void) | undefined;
    mockSubmitSupportRequest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    renderComponent();

    await selectIssueType(user, 'Account issue');
    await user.type(screen.getByLabelText(/subject \(optional\)/i), 'Locked out');
    await user.type(screen.getByLabelText(/^message/i), 'I cannot sign in.');

    const submitButton = screen.getByRole('button', { name: /submit support request/i });
    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    expect(mockSubmitSupportRequest).toHaveBeenCalledTimes(1);

    resolveSubmit?.({ success: true });
    expect(
      await screen.findByRole('status'),
    ).toHaveTextContent(
      'Thanks for reaching out. We’ve received your request and will get back to you soon.',
    );
  });
});

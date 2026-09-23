import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportUserModal from '../ReportUserModal';

const reportUser = vi.fn();
const blockUser = vi.fn();

vi.mock('../../../services/api', () => ({
  blockAPI: {
    reportUser: (...args: unknown[]) => reportUser(...args),
    blockUser: (...args: unknown[]) => blockUser(...args),
  },
}));

const defaultProps = {
  isOpen: true,
  userId: '507f1f77bcf86cd799439011',
  displayName: 'Ana',
  onClose: vi.fn(),
};

const chooseReason = async (user: ReturnType<typeof userEvent.setup>, reason: string) => {
  await user.click(screen.getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: reason }));
};

describe('ReportUserModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reportUser.mockResolvedValue({ success: true });
    blockUser.mockResolvedValue({ success: true });
  });

  it('renders nothing when closed', () => {
    const { container } = render(<ReportUserModal {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('requires a reason before submitting', async () => {
    const user = userEvent.setup();
    render(<ReportUserModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /submit report/i }));

    expect(await screen.findByText(/please choose a reason/i)).toBeInTheDocument();
    expect(reportUser).not.toHaveBeenCalled();
  });

  it('sends reason and details as separate fields', async () => {
    const user = userEvent.setup();
    render(<ReportUserModal {...defaultProps} />);

    await chooseReason(user, 'Spam or scam');
    await user.type(screen.getByLabelText(/additional details/i), 'crypto links');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    expect(reportUser).toHaveBeenCalledWith(
      defaultProps.userId,
      'Spam or scam',
      'crypto links',
    );
  });

  it('omits details when the box is left empty', async () => {
    const user = userEvent.setup();
    render(<ReportUserModal {...defaultProps} />);

    await chooseReason(user, 'Safety concern');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    expect(reportUser).toHaveBeenCalledWith(defaultProps.userId, 'Safety concern', undefined);
  });

  it('blocks submission when Other has no details', async () => {
    const user = userEvent.setup();
    render(<ReportUserModal {...defaultProps} />);

    await chooseReason(user, 'Other');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    expect(
      await screen.findByText(/please describe the issue when choosing other/i),
    ).toBeInTheDocument();
    expect(reportUser).not.toHaveBeenCalled();
  });

  it('allows Other once details are given', async () => {
    const user = userEvent.setup();
    render(<ReportUserModal {...defaultProps} />);

    await chooseReason(user, 'Other');
    await user.type(screen.getByLabelText(/additional details/i), 'impersonating staff');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    expect(reportUser).toHaveBeenCalledWith(
      defaultProps.userId,
      'Other',
      'impersonating staff',
    );
  });

  it('confirms receipt and states the person was not notified', async () => {
    const user = userEvent.setup();
    render(<ReportUserModal {...defaultProps} />);

    await chooseReason(user, 'Spam or scam');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/thanks for letting us know/i);
    expect(screen.getByText(/has not been notified/i)).toBeInTheDocument();
  });

  it('does not block unless the user opts in afterwards', async () => {
    const user = userEvent.setup();
    render(<ReportUserModal {...defaultProps} />);

    await chooseReason(user, 'Spam or scam');
    await user.click(screen.getByRole('button', { name: /submit report/i }));
    await screen.findByRole('status');

    expect(blockUser).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /no, thanks/i }));
    expect(blockUser).not.toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('blocks and notifies the caller when the follow-up is accepted', async () => {
    const user = userEvent.setup();
    const onBlocked = vi.fn();
    render(<ReportUserModal {...defaultProps} onBlocked={onBlocked} />);

    await chooseReason(user, 'Harassment or bullying');
    await user.click(screen.getByRole('button', { name: /submit report/i }));
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: /block ana/i }));

    expect(blockUser).toHaveBeenCalledWith(defaultProps.userId);
    expect(onBlocked).toHaveBeenCalled();
  });

  it('surfaces a submission failure and stays on the form', async () => {
    const user = userEvent.setup();
    reportUser.mockRejectedValue(new Error('network down'));
    render(<ReportUserModal {...defaultProps} />);

    await chooseReason(user, 'Spam or scam');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit report/i })).toBeInTheDocument();
  });
});

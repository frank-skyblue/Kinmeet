import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FEEDBACK_MESSAGE_MAX_LENGTH } from '../../../constants/feedbackOptions';
import { MAX_PHOTO_SIZE } from '../../../constants/validation';
import GiveFeedback from '../GiveFeedback';

const mockSubmitFeedback = vi.fn();

vi.mock('../../../services/api', () => ({
  feedbackAPI: {
    submitFeedback: (...args: unknown[]) => mockSubmitFeedback(...args),
  },
}));

const renderComponent = () =>
  render(
    <MemoryRouter>
      <GiveFeedback />
    </MemoryRouter>,
  );

const getScreenshotInput = () => document.getElementById('feedback-screenshot') as HTMLInputElement;

const getDropzone = () =>
  screen.getByRole('button', {
    name: /add screenshots or drag and drop|add more or drag and drop|drop screenshots here|maximum of 3 screenshots/i,
  });

const createDataTransfer = (files: File[] = []) => ({
  types: ['Files'],
  files,
  items: files.map((file) => ({
    kind: 'file' as const,
    type: file.type,
    getAsFile: () => file,
  })),
  dropEffect: 'none',
  effectAllowed: 'all',
});

const selectCategory = async (user: ReturnType<typeof userEvent.setup>, category: string) => {
  await user.click(screen.getByRole('combobox', { name: /feedback category/i }));
  await user.click(screen.getByRole('option', { name: category }));
};

describe('GiveFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the feedback form fields and enabled submit button', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /give feedback/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /feedback category/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeRequired();
    expect(
      screen.getByRole('button', { name: /add screenshots or drag and drop/i }),
    ).toBeInTheDocument();
    expect(document.getElementById('feedback-screenshots-label')).toHaveTextContent('Screenshots');
    expect(screen.getByText('(optional)')).toBeInTheDocument();
    expect(screen.queryByText(/no screenshots selected/i)).not.toBeInTheDocument();
    expect(screen.getByText(/jpg, png, webp or gif · up to 3 files · 5 mb each/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/allow kinmeet to follow up about this feedback/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeEnabled();

    const addButton = screen.getByRole('button', { name: /add screenshots or drag and drop/i });
    expect(addButton.querySelector('svg[aria-hidden]')).toBeTruthy();
    expect(screen.getByText(`0 / ${FEEDBACK_MESSAGE_MAX_LENGTH}`)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toHaveAttribute(
      'maxLength',
      String(FEEDBACK_MESSAGE_MAX_LENGTH),
    );
  });

  it('shows category and message errors under their fields on empty submit', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: /submit feedback/i }));

    const categoryError = screen.getByText(/feedback category is required/i);
    const messageError = screen.getByText(/message is required/i);
    expect(categoryError).toHaveAttribute('role', 'alert');
    expect(messageError).toHaveAttribute('role', 'alert');
    expect(categoryError.compareDocumentPosition(screen.getByRole('combobox', { name: /feedback category/i }))).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
    expect(messageError.compareDocumentPosition(screen.getByLabelText(/message/i))).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
    expect(mockSubmitFeedback).not.toHaveBeenCalled();
  });

  it('clears only the corrected field error when other field errors remain', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(screen.getByText(/feedback category is required/i)).toBeInTheDocument();
    expect(screen.getByText(/message is required/i)).toBeInTheDocument();

    await selectCategory(user, 'Feature Suggestion');

    expect(screen.queryByText(/feedback category is required/i)).not.toBeInTheDocument();
    expect(screen.getByText(/message is required/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/message/i), 'Looks good');

    expect(screen.queryByText(/message is required/i)).not.toBeInTheDocument();
  });

  it('updates the message character count as the user types', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/message/i), 'Hello');

    expect(screen.getByText(`5 / ${FEEDBACK_MESSAGE_MAX_LENGTH}`)).toBeInTheDocument();
  });

  it('does not allow the message to exceed the max length', async () => {
    const user = userEvent.setup();
    renderComponent();
    const messageInput = screen.getByLabelText(/message/i);

    fireEvent.change(messageInput, {
      target: { value: 'a'.repeat(FEEDBACK_MESSAGE_MAX_LENGTH) },
    });

    expect(screen.getByText(`${FEEDBACK_MESSAGE_MAX_LENGTH} / ${FEEDBACK_MESSAGE_MAX_LENGTH}`)).toBeInTheDocument();

    await user.type(messageInput, 'x');

    expect(messageInput).toHaveValue('a'.repeat(FEEDBACK_MESSAGE_MAX_LENGTH));
    expect(screen.getByText(`${FEEDBACK_MESSAGE_MAX_LENGTH} / ${FEEDBACK_MESSAGE_MAX_LENGTH}`)).toBeInTheDocument();
  });

  it('submits the expected payload without a screenshot', async () => {
    mockSubmitFeedback.mockResolvedValueOnce({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: 'feedback-123',
    });
    const user = userEvent.setup();
    renderComponent();

    await selectCategory(user, 'Feature Suggestion');
    await user.type(screen.getByLabelText(/message/i), '  Please add saved filters.  ');
    await user.click(screen.getByLabelText(/allow kinmeet to follow up about this feedback/i));
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith({
        category: 'Feature Suggestion',
        message: 'Please add saved filters.',
        followUp: true,
        screenshots: [],
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/feedback submitted successfully/i);
  });

  it('submits optional screenshots', async () => {
    mockSubmitFeedback.mockResolvedValueOnce({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: 'feedback-456',
    });
    const user = userEvent.setup();
    const screenshotOne = new File(['image-one'], 'bug-one.png', { type: 'image/png' });
    const screenshotTwo = new File(['image-two'], 'bug-two.png', { type: 'image/png' });
    renderComponent();

    await selectCategory(user, 'Bug or Technical Issue');
    await user.type(screen.getByLabelText(/message/i), 'The menu overlaps on mobile.');
    await user.upload(getScreenshotInput(), [screenshotOne, screenshotTwo]);
    expect(screen.getByText('2/3 selected')).toBeInTheDocument();
    expect(screen.getByText('bug-one.png')).toBeInTheDocument();
    expect(screen.getByText('bug-two.png')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add more or drag and drop/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith(expect.objectContaining({
        category: 'Bug or Technical Issue',
        message: 'The menu overlaps on mobile.',
        screenshots: [screenshotOne, screenshotTwo],
      }));
    });
  });

  it('removes a selected screenshot before submit', async () => {
    const user = userEvent.setup();
    const screenshotOne = new File(['image-one'], 'first.png', { type: 'image/png' });
    const screenshotTwo = new File(['image-two'], 'second.png', { type: 'image/png' });
    renderComponent();

    await user.upload(getScreenshotInput(), [screenshotOne, screenshotTwo]);
    await user.click(screen.getByRole('button', { name: /remove first\.png/i }));

    expect(screen.queryByText('first.png')).not.toBeInTheDocument();
    expect(screen.getByText('second.png')).toBeInTheDocument();
    expect(screen.getByText('1/3 selected')).toBeInTheDocument();
  });

  it('shows an error when more than three screenshots are selected', async () => {
    const user = userEvent.setup();
    const files = [
      new File(['1'], 'one.png', { type: 'image/png' }),
      new File(['2'], 'two.png', { type: 'image/png' }),
      new File(['3'], 'three.png', { type: 'image/png' }),
      new File(['4'], 'four.png', { type: 'image/png' }),
    ];
    renderComponent();

    await user.upload(getScreenshotInput(), files);

    const screenshotError = screen.getByRole('alert');
    expect(screenshotError).toHaveTextContent(/up to 3 screenshots are allowed/i);
    expect(
      screenshotError.compareDocumentPosition(
        screen.getByRole('button', { name: /add screenshots or drag and drop/i }),
      ),
    ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    expect(screen.queryByText(/no screenshots selected/i)).not.toBeInTheDocument();
  });

  it('disables the dropzone at the 3-file limit and re-enables after removal', async () => {
    const user = userEvent.setup();
    const files = [
      new File(['1'], 'one.png', { type: 'image/png' }),
      new File(['2'], 'two.png', { type: 'image/png' }),
      new File(['3'], 'three.png', { type: 'image/png' }),
    ];
    renderComponent();

    await user.upload(getScreenshotInput(), files);

    expect(screen.getByText('3/3 selected')).toBeInTheDocument();
    const disabledDropzone = screen.getByRole('button', { name: /maximum of 3 screenshots/i });
    expect(disabledDropzone).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /remove three\.png/i }));

    expect(
      screen.getByRole('button', { name: /add more or drag and drop/i }),
    ).toBeEnabled();
  });

  it('shows drop prompt while dragging files over the dropzone', () => {
    renderComponent();
    const dropzone = getDropzone();
    const dataTransfer = createDataTransfer();

    fireEvent.dragEnter(dropzone, { dataTransfer });
    fireEvent.dragOver(dropzone, { dataTransfer });

    expect(screen.getByRole('button', { name: /drop screenshots here/i })).toBeInTheDocument();
  });

  it('adds a dropped screenshot to the list and clears drag-active state', () => {
    renderComponent();
    const dropzone = getDropzone();
    const screenshot = new File(['image'], 'dropped.png', { type: 'image/png' });
    const dataTransfer = createDataTransfer([screenshot]);

    fireEvent.dragEnter(dropzone, { dataTransfer });
    fireEvent.drop(dropzone, { dataTransfer });

    expect(screen.getByText('dropped.png')).toBeInTheDocument();
    expect(screen.getByText('1/3 selected')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add more or drag and drop/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /drop screenshots here/i })).not.toBeInTheDocument();
  });

  it('adds multiple dropped screenshots', () => {
    renderComponent();
    const dropzone = getDropzone();
    const files = [
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.png', { type: 'image/png' }),
    ];

    fireEvent.drop(dropzone, { dataTransfer: createDataTransfer(files) });

    expect(screen.getByText('one.png')).toBeInTheDocument();
    expect(screen.getByText('two.png')).toBeInTheDocument();
    expect(screen.getByText('2/3 selected')).toBeInTheDocument();
  });

  it('rejects invalid dropped file types with the same validation as click upload', () => {
    renderComponent();
    const dropzone = getDropzone();
    const textFile = new File(['notes'], 'notes.txt', { type: 'text/plain' });

    fireEvent.drop(dropzone, { dataTransfer: createDataTransfer([textFile]) });

    expect(screen.getByRole('alert')).toHaveTextContent(/only jpeg, png, webp, and gif/i);
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
  });

  it('rejects oversized dropped files', () => {
    renderComponent();
    const dropzone = getDropzone();
    const largeFile = new File([new Uint8Array(MAX_PHOTO_SIZE + 1)], 'large.png', {
      type: 'image/png',
    });

    fireEvent.drop(dropzone, { dataTransfer: createDataTransfer([largeFile]) });

    expect(screen.getByRole('alert')).toHaveTextContent(/image must be under 5 mb/i);
    expect(screen.queryByText('large.png')).not.toBeInTheDocument();
  });

  it('rejects drops that would exceed three screenshots', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.upload(getScreenshotInput(), [
      new File(['1'], 'one.png', { type: 'image/png' }),
      new File(['2'], 'two.png', { type: 'image/png' }),
    ]);

    fireEvent.drop(getDropzone(), {
      dataTransfer: createDataTransfer([
        new File(['3'], 'three.png', { type: 'image/png' }),
        new File(['4'], 'four.png', { type: 'image/png' }),
      ]),
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/up to 3 screenshots are allowed/i);
    expect(screen.getByText('2/3 selected')).toBeInTheDocument();
    expect(screen.queryByText('three.png')).not.toBeInTheDocument();
  });

  it('ignores drops when the dropzone is disabled at the limit', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.upload(getScreenshotInput(), [
      new File(['1'], 'one.png', { type: 'image/png' }),
      new File(['2'], 'two.png', { type: 'image/png' }),
      new File(['3'], 'three.png', { type: 'image/png' }),
    ]);

    const dropzone = screen.getByRole('button', { name: /maximum of 3 screenshots/i });
    fireEvent.drop(dropzone, {
      dataTransfer: createDataTransfer([
        new File(['4'], 'four.png', { type: 'image/png' }),
      ]),
    });

    expect(screen.queryByText('four.png')).not.toBeInTheDocument();
    expect(screen.getByText('3/3 selected')).toBeInTheDocument();
  });

  it('shows a validation error for invalid screenshots via file input', () => {
    const textFile = new File(['notes'], 'notes.txt', { type: 'text/plain' });
    renderComponent();

    fireEvent.change(getScreenshotInput(), {
      target: { files: [textFile] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/only jpeg, png, webp, and gif/i);
  });

  it('shows the backend screenshot upload error when submission fails', async () => {
    mockSubmitFeedback.mockRejectedValueOnce(
      new Error('Screenshot upload failed. Please try again later or submit without screenshots.'),
    );
    const user = userEvent.setup();
    renderComponent();

    await selectCategory(user, 'Messaging Feedback');
    await user.type(screen.getByLabelText(/message/i), 'Messages loaded slowly.');
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /screenshot upload failed\. please try again later or submit without screenshots\./i,
      );
    });

    const formError = screen.getByRole('alert');
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    expect(formError.compareDocumentPosition(submitButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('keeps screenshot error when category or message errors are cleared', async () => {
    const user = userEvent.setup();
    renderComponent();

    fireEvent.change(getScreenshotInput(), {
      target: { files: [new File(['notes'], 'notes.txt', { type: 'text/plain' })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/only jpeg, png, webp, and gif/i);

    await user.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(screen.getByText(/feedback category is required/i)).toBeInTheDocument();
    expect(screen.getByText(/message is required/i)).toBeInTheDocument();
    expect(screen.getByText(/only jpeg, png, webp, and gif/i)).toBeInTheDocument();

    await selectCategory(user, 'Bug or Technical Issue');
    expect(screen.queryByText(/feedback category is required/i)).not.toBeInTheDocument();
    expect(screen.getByText(/message is required/i)).toBeInTheDocument();
    expect(screen.getByText(/only jpeg, png, webp, and gif/i)).toBeInTheDocument();
  });
});

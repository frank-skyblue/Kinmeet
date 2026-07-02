import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
        emails: { send: sendMock },
    })),
}));

// env mock is defined before the service import so the module picks it up
const envMock = {
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'KinMeet <noreply@kinmeet.ca>',
    ENABLE_DEVELOPMENT_EMAIL: false,
};

vi.mock('../../config/env', () => envMock);

import { emailService } from '../../services/emailService';

const basePayload = {
    to: 'user@example.com',
    subject: 'Hello',
    html: '<p>Hello</p>',
    text: 'Hello',
};

describe('emailService.send', () => {
    beforeEach(() => {
        sendMock.mockReset();
        sendMock.mockResolvedValue({ data: { id: 'msg_123' }, error: null });
        // reset NODE_ENV to production default for most tests
        vi.stubEnv('NODE_ENV', 'production');
    });

    it('sends email in production', async () => {
        await emailService.send(basePayload);

        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(sendMock).toHaveBeenCalledWith({
            from: envMock.EMAIL_FROM,
            to: basePayload.to,
            subject: basePayload.subject,
            html: basePayload.html,
            text: basePayload.text,
        });
    });

    it('omits text field when not provided', async () => {
        const { text: _text, ...withoutText } = basePayload;
        await emailService.send(withoutText);

        const call = sendMock.mock.calls[0]![0] as Record<string, unknown>;
        expect('text' in call).toBe(false);
    });

    it('skips send in development when ENABLE_DEVELOPMENT_EMAIL is false', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        envMock.ENABLE_DEVELOPMENT_EMAIL = false;

        await emailService.send(basePayload);

        expect(sendMock).not.toHaveBeenCalled();
    });

    it('sends real email in development when ENABLE_DEVELOPMENT_EMAIL is true', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        envMock.ENABLE_DEVELOPMENT_EMAIL = true;

        await emailService.send(basePayload);

        expect(sendMock).toHaveBeenCalledTimes(1);

        envMock.ENABLE_DEVELOPMENT_EMAIL = false;
    });

    it('skips send and warns when RESEND_API_KEY is absent', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const originalKey = envMock.RESEND_API_KEY;
        envMock.RESEND_API_KEY = null as unknown as string;

        await emailService.send(basePayload);

        expect(sendMock).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('RESEND_API_KEY is not set'),
        );

        envMock.RESEND_API_KEY = originalKey;
        warnSpy.mockRestore();
    });

    it('throws when Resend returns an error', async () => {
        sendMock.mockResolvedValue({ data: null, error: { message: 'bad request' } });

        await expect(emailService.send(basePayload)).rejects.toThrow('Failed to send email: bad request');
    });
});

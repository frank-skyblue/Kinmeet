import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());
const batchSendMock = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(function () {
        return { emails: { send: sendMock }, batch: { send: batchSendMock } };
    }),
}));

// vi.hoisted ensures the object is available when the hoisted vi.mock factory runs
const envMock = vi.hoisted(() => ({
    RESEND_API_KEY: 're_test_key' as string | null,
    EMAIL_FROM: 'KinMeet <noreply@kinmeet.ca>',
    ENABLE_DEVELOPMENT_EMAIL: false,
    NODE_ENV: 'production' as 'development' | 'production' | 'test',
}));

vi.mock('../../config/env', () => envMock);

import { EMAIL_BATCH_LIMIT, emailService } from '../../services/emailService';

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
        envMock.NODE_ENV = 'production';
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
        envMock.NODE_ENV = 'development';
        envMock.ENABLE_DEVELOPMENT_EMAIL = false;

        await emailService.send(basePayload);

        expect(sendMock).not.toHaveBeenCalled();
    });

    it('sends real email in development when ENABLE_DEVELOPMENT_EMAIL is true', async () => {
        envMock.NODE_ENV = 'development';
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

describe('emailService.sendBatch', () => {
    beforeEach(() => {
        batchSendMock.mockReset();
        batchSendMock.mockResolvedValue({ data: { data: [] }, error: null });
        envMock.NODE_ENV = 'production';
    });

    it('sends every email in one request', async () => {
        await emailService.sendBatch([basePayload, { ...basePayload, to: 'second@example.com' }]);

        expect(batchSendMock).toHaveBeenCalledTimes(1);
        const [emails] = batchSendMock.mock.calls[0]!;
        expect(emails).toHaveLength(2);
        expect(emails[1]).toMatchObject({ from: 'KinMeet <noreply@kinmeet.ca>', to: 'second@example.com' });
    });

    it('does nothing for an empty list', async () => {
        await emailService.sendBatch([]);
        expect(batchSendMock).not.toHaveBeenCalled();
    });

    it('refuses more than one batch worth of emails', async () => {
        const tooMany = Array.from({ length: EMAIL_BATCH_LIMIT + 1 }, () => basePayload);
        await expect(emailService.sendBatch(tooMany)).rejects.toThrow(/at most/);
        expect(batchSendMock).not.toHaveBeenCalled();
    });

    it('skips in development without ENABLE_DEVELOPMENT_EMAIL', async () => {
        envMock.NODE_ENV = 'development';
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await emailService.sendBatch([basePayload]);

        expect(batchSendMock).not.toHaveBeenCalled();
        logSpy.mockRestore();
    });

    it('throws when Resend returns an error', async () => {
        batchSendMock.mockResolvedValue({ data: null, error: { message: 'rate limited' } });
        vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(emailService.sendBatch([basePayload])).rejects.toThrow('rate limited');
    });
});

describe('emailService.newPeopleNearbyEmail', () => {
    const options = {
        to: 'sub@example.com',
        firstName: 'Ana',
        count: 3,
        homeCountry: 'Ukraine',
        discoverLink: 'https://app.example.com/discover',
    };

    it('says how many people joined and links to Discover', () => {
        const email = emailService.newPeopleNearbyEmail(options);

        expect(email.to).toBe('sub@example.com');
        expect(email.subject).toBe('3 new people from Ukraine joined near you on KinMeet');
        expect(email.html).toContain('https://app.example.com/discover');
        expect(email.text).toContain('3 new people from Ukraine joined near you');
    });

    it('uses the singular for one person', () => {
        expect(emailService.newPeopleNearbyEmail({ ...options, count: 1 }).subject)
            .toBe('1 new person from Ukraine joined near you on KinMeet');
    });

    it('escapes the name in the HTML', () => {
        const email = emailService.newPeopleNearbyEmail({ ...options, firstName: '<img src=x onerror=alert(1)>' });

        expect(email.html).not.toContain('<img src=x');
        expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });
});

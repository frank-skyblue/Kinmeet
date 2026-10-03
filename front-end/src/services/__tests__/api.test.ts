import { describe, expect, it, beforeEach } from 'vitest';
import api, { blockAPI, feedbackAPI, supportAPI } from '../api';

const postWithAdapter = async (data: unknown, headers?: Record<string, string>) => {
  let capturedUrl: string | undefined;
  let capturedData: unknown;
  let capturedAuthorization: string | undefined;
  let capturedContentType: string | undefined;

  api.defaults.adapter = (config) => {
    capturedUrl = config.url;
    capturedData = config.data;
    capturedAuthorization = config.headers.Authorization as string | undefined;
    capturedContentType = config.headers['Content-Type'] as string | undefined;
    return Promise.resolve({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
  };

  await api.post('/test-sanitize', data, headers ? { headers } : undefined);
  api.defaults.adapter = undefined;

  return { capturedUrl, capturedData, capturedAuthorization, capturedContentType };
};

const parsedBody = (data: unknown) => {
  if (data instanceof FormData || data instanceof File || data instanceof Blob) {
    return data;
  }
  if (typeof data === 'string') {
    return JSON.parse(data) as unknown;
  }
  return data;
};

describe('api', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('trims normal strings in request body', async () => {
    const { capturedData } = await postWithAdapter({ firstName: '  Ethan  ' });
    expect((parsedBody(capturedData) as { firstName: string }).firstName).toBe('Ethan');
  });

  it('trims nested object strings in request body', async () => {
    const { capturedData } = await postWithAdapter({
      currentLocation: { city: '  Toronto  ', province: ' Ontario ' },
    });
    expect((parsedBody(capturedData) as { currentLocation: { city: string; province: string } }).currentLocation).toEqual({
      city: 'Toronto',
      province: 'Ontario',
    });
  });

  it('sanitizes arrays recursively in request body', async () => {
    const { capturedData } = await postWithAdapter({
      languages: [' English ', ' French '],
      lookingFor: [' Friendship '],
    });
    const body = parsedBody(capturedData) as { languages: string[]; lookingFor: string[] };
    expect(body.languages).toEqual(['English', 'French']);
    expect(body.lookingFor).toEqual(['Friendship']);
  });

  it('does not modify password or token fields', async () => {
    const { capturedData } = await postWithAdapter({
      password: '  Secret1  ',
      confirmPassword: '  Secret1  ',
      token: ' raw-token ',
      accessToken: ' raw-access ',
      refreshToken: ' raw-refresh ',
    });
    const body = parsedBody(capturedData) as Record<string, string>;
    expect(body.password).toBe('  Secret1  ');
    expect(body.confirmPassword).toBe('  Secret1  ');
    expect(body.token).toBe(' raw-token ');
    expect(body.accessToken).toBe(' raw-access ');
    expect(body.refreshToken).toBe(' raw-refresh ');
  });

  it('leaves FormData unchanged', async () => {
    const formData = new FormData();
    formData.append('photo', new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));
    const { capturedData } = await postWithAdapter(formData, { 'Content-Type': 'multipart/form-data' });
    expect(parsedBody(capturedData)).toBe(formData);
  });

  it('leaves File and Blob unchanged', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const blob = new Blob(['x'], { type: 'text/plain' });

    const fileResult = await postWithAdapter(file);
    expect(fileResult.capturedData).toBe(file);

    const blobResult = await postWithAdapter(blob);
    expect(blobResult.capturedData).toBe(blob);
  });

  it('still sets Authorization header from localStorage', async () => {
    localStorage.setItem('token', 'stored-token');
    const { capturedAuthorization } = await postWithAdapter({ firstName: 'Ethan' });
    expect(capturedAuthorization).toBe('Bearer stored-token');
  });

  it('normalizes email fields in request body', async () => {
    const { capturedData } = await postWithAdapter({
      email: ' New@Example.com\u200B ',
      password: '  Secret1  ',
    });
    const body = parsedBody(capturedData) as { email: string; password: string };
    expect(body.email).toBe('new@example.com');
    expect(body.password).toBe('  Secret1  ');
  });

  it('submits feedback as multipart FormData', async () => {
    const screenshotOne = new File(['x'], 'screenshot-1.png', { type: 'image/png' });
    const screenshotTwo = new File(['y'], 'screenshot-2.png', { type: 'image/png' });
    let capturedUrl: string | undefined;
    let capturedData: unknown;
    let capturedContentType: string | undefined;

    api.defaults.adapter = (config) => {
      capturedUrl = config.url;
      capturedData = config.data;
      capturedContentType = config.headers['Content-Type'] as string | undefined;
      return Promise.resolve({
        data: { success: true, message: 'ok', feedbackId: 'feedback-1' },
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      });
    };

    await feedbackAPI.submitFeedback({
      category: 'Bug or Technical Issue',
      message: 'Something broke.',
      followUp: true,
      screenshots: [screenshotOne, screenshotTwo],
    });
    api.defaults.adapter = undefined;

    expect(capturedUrl).toBe('/feedback');
    expect(capturedContentType).toBe('multipart/form-data');
    expect(capturedData).toBeInstanceOf(FormData);
    const formData = capturedData as FormData;
    expect(formData.get('category')).toBe('Bug or Technical Issue');
    expect(formData.get('message')).toBe('Something broke.');
    expect(formData.get('followUp')).toBe('true');
    expect(formData.getAll('screenshots')).toEqual([screenshotOne, screenshotTwo]);
    expect(formData.get('email')).toBeNull();
    expect([...formData.keys()]).not.toContain('email');
  });

  it('submits support requests as multipart FormData without email', async () => {
    const screenshot = new File(['x'], 'screenshot.png', { type: 'image/png' });
    let capturedUrl: string | undefined;
    let capturedData: unknown;
    let capturedContentType: string | undefined;

    api.defaults.adapter = (config) => {
      capturedUrl = config.url;
      capturedData = config.data;
      capturedContentType = config.headers['Content-Type'] as string | undefined;
      return Promise.resolve({
        data: { success: true, message: 'ok', supportRequestId: 'support-1' },
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      });
    };

    await supportAPI.submitSupportRequest({
      issueType: 'Technical problem',
      subject: 'App crash',
      message: 'Something broke.',
      followUp: true,
      screenshots: [screenshot],
    });
    api.defaults.adapter = undefined;

    expect(capturedUrl).toBe('/support');
    expect(capturedContentType).toBe('multipart/form-data');
    expect(capturedData).toBeInstanceOf(FormData);
    const formData = capturedData as FormData;
    expect(formData.get('issueType')).toBe('Technical problem');
    expect(formData.get('subject')).toBe('App crash');
    expect(formData.get('message')).toBe('Something broke.');
    expect(formData.get('followUp')).toBe('true');
    expect(formData.getAll('screenshots')).toEqual([screenshot]);
    expect(formData.get('email')).toBeNull();
    expect([...formData.keys()]).not.toContain('email');
  });

  it('omits support subject from FormData when it is not provided', async () => {
    let capturedData: unknown;

    api.defaults.adapter = (config) => {
      capturedData = config.data;
      return Promise.resolve({
        data: { success: true, message: 'ok', supportRequestId: 'support-2' },
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      });
    };

    await supportAPI.submitSupportRequest({
      issueType: 'Other',
      message: 'Need help with no subject.',
    });
    api.defaults.adapter = undefined;

    const formData = capturedData as FormData;
    expect(formData.get('issueType')).toBe('Other');
    expect(formData.get('message')).toBe('Need help with no subject.');
    expect(formData.get('subject')).toBeNull();
    expect([...formData.keys()]).not.toContain('subject');
  });
});

describe('blockAPI', () => {
  const userId = '507f1f77bcf86cd799439011';

  const captureRequest = async (call: () => Promise<unknown>) => {
    let url: string | undefined;
    let method: string | undefined;
    let body: unknown;

    api.defaults.adapter = (config) => {
      url = config.url;
      method = config.method;
      body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      return Promise.resolve({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    };

    await call();
    api.defaults.adapter = undefined;

    return { url, method, body };
  };

  it('sends reason and details as separate fields when reporting', async () => {
    const { url, body } = await captureRequest(() =>
      blockAPI.reportUser(userId, 'Spam or scam', 'crypto links'),
    );

    expect(url).toBe('/block/report');
    expect(body).toEqual({ userId, reason: 'Spam or scam', details: 'crypto links' });
  });

  it('omits details when none are given', async () => {
    const { body } = await captureRequest(() => blockAPI.reportUser(userId, 'Safety concern'));

    // details is undefined, so JSON.stringify drops the key entirely
    expect(body).toEqual({ userId, reason: 'Safety concern' });
  });

  it('posts a block with an optional reason', async () => {
    const { url, method, body } = await captureRequest(() => blockAPI.blockUser(userId));

    expect(url).toBe('/block/block');
    expect(method).toBe('post');
    expect(body).toEqual({ userId });
  });

  it('unblocks by id', async () => {
    const { url, method } = await captureRequest(() => blockAPI.unblockUser(userId));

    expect(url).toBe(`/block/unblock/${userId}`);
    expect(method).toBe('delete');
  });
});

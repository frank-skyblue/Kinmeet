import { describe, expect, it, beforeEach } from 'vitest';
import api, { feedbackAPI } from '../api';

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
  });
});

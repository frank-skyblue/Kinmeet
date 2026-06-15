import { describe, expect, it, beforeEach } from 'vitest';
import api from '../api';

const postWithAdapter = async (data: unknown, headers?: Record<string, string>) => {
  let capturedData: unknown;
  let capturedAuthorization: string | undefined;

  api.defaults.adapter = (config) => {
    capturedData = config.data;
    capturedAuthorization = config.headers.Authorization as string | undefined;
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

  return { capturedData, capturedAuthorization };
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
});

import { createMicrosoftSpeechComletion } from '../src/server/createMicrosoftSpeechComletion';
import { MicrosoftSpeechPayload } from '../src/server/types';

export const config = {
  runtime: 'edge',
};

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const payload = (await req.json()) as MicrosoftSpeechPayload;

  return createMicrosoftSpeechComletion({ payload });
};

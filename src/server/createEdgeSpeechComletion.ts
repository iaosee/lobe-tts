import qs from 'query-string';
import { v4 as uuidv4 } from 'uuid';

import { EDGE_API_TOKEN, EDGE_SPEECH_URL } from '@/const/api';
import { EdgeSpeechPayload } from '@/server/types';
import { genSSML } from '@/utils/genSSML';
import { genSendContent } from '@/utils/genSendContent';
import { getHeadersAndData } from '@/utils/getHeadersAndData';

const configConent = JSON.stringify({
  context: {
    synthesis: {
      audio: {
        metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: true },
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      },
    },
  },
});

const genHeader = (connectId: string) => {
  const date = new Date().toString();
  const configHeader = {
    'Content-Type': 'application/json; charset=utf-8',
    'Path': 'speech.config',
    'X-Timestamp': date,
  };
  const contentHeader = {
    'Content-Type': 'application/ssml+xml',
    'Path': 'ssml',
    'X-RequestId': connectId,
    'X-Timestamp': date,
  };
  return {
    configHeader,
    contentHeader,
  };
};

interface CreateEdgeSpeechComletionOptions {
  payload: EdgeSpeechPayload;
}

export const createEdgeSpeechComletion = async ({
  payload,
}: CreateEdgeSpeechComletionOptions): Promise<Response> => {
  const { input, options } = payload;

  const connectId = uuidv4().replaceAll('-', '');
  const url = qs.stringifyUrl({
    query: {
      ConnectionId: connectId,
      TrustedClientToken: EDGE_API_TOKEN,
    },
    url: EDGE_SPEECH_URL,
  });

  const { configHeader, contentHeader } = genHeader(connectId);
  const config = genSendContent(configHeader, configConent);
  const content = genSendContent(contentHeader, genSSML(input, options));

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    const onOpen = () => {
      ws.send(config);
      ws.send(content);
    };
    let audioData = new ArrayBuffer(0);
    const onMessage = async (event: MessageEvent<any>) => {
      if (typeof event.data === 'string') {
        const { headers } = getHeadersAndData(event.data);
        switch (headers['Path']) {
          case 'turn.end': {
            ws.close();
            if (!audioData.byteLength) return;
            const res = new Response(audioData);
            resolve(res);
            break;
          }
        }
      } else if (event.data instanceof ArrayBuffer) {
        const dataview = new DataView(event.data);
        const headerLength = dataview.getInt16(0);
        if (event.data.byteLength > headerLength + 2) {
          const newBody = event.data.slice(2 + headerLength);
          const newAudioData = new ArrayBuffer(audioData.byteLength + newBody.byteLength);
          const mergedUint8Array = new Uint8Array(newAudioData);
          mergedUint8Array.set(new Uint8Array(audioData), 0);
          mergedUint8Array.set(new Uint8Array(newBody), audioData.byteLength);
          audioData = newAudioData;
        }
      }
    };
    const onError = () => {
      reject(new Error('WebSocket error occurred.'));
      ws.close();
    };
    ws.addEventListener('open', onOpen);
    ws.addEventListener('message', onMessage);
    ws.addEventListener('error', onError);
  });
};

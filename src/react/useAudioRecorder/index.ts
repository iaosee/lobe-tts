import { useCallback, useState } from 'react';

import { getRecordMineType } from '@/utils/getRecordMineType';
import { secondsToMinutesAndSeconds } from '@/utils/secondsToMinutesAndSeconds';

export const useAudioRecorder = (onBolbAvailable?: (blob: Blob) => void) => {
  const [isRecording, setIsRecording] = useState(false);

  const [time, setTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>();
  // eslint-disable-next-line no-undef
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timer>();
  const [blob, setBlob] = useState<Blob>();
  const [url, setUrl] = useState<string>();

  const _startTimer = useCallback(() => {
    const interval = setInterval(() => {
      setTime((time) => time + 1);
    }, 1000);
    setTimerInterval(interval);
  }, []);

  const _stopTimer = useCallback(() => {
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    timerInterval !== undefined && clearInterval(timerInterval);
    // @ts-ignore
    setTimerInterval();
  }, [timerInterval]);

  const start = useCallback(() => {
    if (url) URL.revokeObjectURL(url);
    setUrl(undefined);
    setBlob(undefined);
    if (timerInterval !== undefined) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        setIsRecording(true);
        const recorder: MediaRecorder = new MediaRecorder(stream, {
          mimeType: getRecordMineType().mineType,
        });
        setMediaRecorder(recorder);
        recorder.start();
        _startTimer();

        recorder.addEventListener('dataavailable', (event) => {
          const blobData = event.data;
          setBlob(blobData);
          setUrl(URL.createObjectURL(blobData));
          onBolbAvailable?.(event.data);
          recorder.stream.getTracks().forEach((t) => t.stop());
          // @ts-ignore
          setMediaRecorder();
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }, [timerInterval, _startTimer, url]);

  const stop = useCallback(() => {
    mediaRecorder?.stop();
    _stopTimer();
    setTime(0);
    setIsRecording(false);
  }, [mediaRecorder, _stopTimer]);

  return {
    blob,
    formattedTime: secondsToMinutesAndSeconds(time),
    isRecording,
    mediaRecorder,
    start,
    stop,
    time,
    url,
  };
};

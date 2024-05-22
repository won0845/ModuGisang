import React, { useContext, useRef, useEffect, useState } from 'react';
import { OpenViduContext, GameContext } from '../../../contexts';
import styled from 'styled-components';
import { MissionStarting, MissionEnding } from '../components';
import sunImage from '../../../assets/sun.png';
import hillImage from '../../../assets/hill.png';

const Mission4 = () => {
  const {
    isMissionStarting,
    isMissionEnding,
    myMissionStatus,
    setGameScore,
    setIsRoundPassed,
    setMyMissionStatus,
  } = useContext(GameContext);
  const { myStream, setMicOn } = useContext(OpenViduContext);

  const [stream, setStream] = useState(null);
  const [decibels, setDecibels] = useState(0); // 데시벨 상태
  const [shoutingDuration, setShoutingDuration] = useState(0); // 함성이 지속된 시간

  const [sunPositionY, setSunPositionY] = useState(window.innerHeight); // 해의 Y 위치
  const canvasRef = useRef(null); // 캔버스 참조

  const [elapsedTime, setElapsedTime] = useState(0); // 경과 시간 (초 단위)
  const startTimeRef = useRef(null); // 시작 시간 저장
  const [isGameOver, setIsGameOver] = useState(false);
  const TIME_LIMIT = 24; // 통과 제한 시간 (초 단위)
  const [remainingTime, setRemainingTime] = useState(0);
  const audioContextRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);

  useEffect(() => {
    if (!myStream) return;
    initializeStream();
    return stopAudioProcessing;
  }, [myStream]);

  useEffect(() => {
    startTimeRef.current = Date.now(); // 게임 시작 시 시작 시간 기록

    // 매 초마다 경과 시간을 업데이트
    const intervalId = setInterval(() => {
      const elapsedSeconds = Math.floor(
        (Date.now() - startTimeRef.current) / 1000,
      );
      setElapsedTime(elapsedSeconds);

      // 시간이 제한 시간보다 많으면 실패 플래그 설정
      if (elapsedSeconds > TIME_LIMIT) {
        clearInterval(intervalId);
        setIsGameOver(true);
        micSetting(true);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (myMissionStatus && !isGameOver) {
      setRemainingTime(TIME_LIMIT - elapsedTime);
    }
  }, [myMissionStatus]);

  useEffect(() => {
    updateGameScore(remainingTime);
  }, [remainingTime]);

  useEffect(() => {
    if (
      !stream ||
      isMissionStarting ||
      myMissionStatus ||
      (elapsedTime > TIME_LIMIT && isGameOver)
    )
      return;

    try {
      let audioContext = audioContextRef.current;
      if (!audioContext) {
        audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        setWorklet(audioContext, stream);
      }
    } catch (error) {
      console.error('Error initializing audio processing', error);
    }
  }, [stream, isMissionStarting, shoutingDuration, isGameOver]);

  useEffect(() => {
    if (shoutingDuration > 5) {
      setMyMissionStatus(true);
      setIsRoundPassed(true);
      stopAudioProcessing();
      micSetting(true);
    }
  }, [shoutingDuration]);

  const stopAudioProcessing = () => {
    const audioWorkletNode = audioWorkletNodeRef.current;
    const audioContext = audioContextRef.current;

    if (audioWorkletNode) {
      audioWorkletNode.port.postMessage('stop');
      audioWorkletNode.disconnect();
    }

    if (audioContext) {
      audioContext.close();
      audioContextRef.current = null;
    }
  };

  const micSetting = state => {
    myStream.publishAudio(state);
    setMicOn(state);
  };

  const setWorklet = async (audioContext, audioStream) => {
    await audioContext.audioWorklet.addModule('/decibel-processor.js');

    const audioWorkletNode = new AudioWorkletNode(
      audioContext,
      'decibel-processor',
    );
    audioWorkletNodeRef.current = audioWorkletNode;

    audioWorkletNode.port.onmessage = event => {
      let { decibels } = event.data;
      setDecibels(decibels);
      console.log('현재 데시벨입니다.', decibels);

      if (decibels > 70) {
        setShoutingDuration(prevDuration => {
          const newDuration = prevDuration + 0.2;
          setSunPosition(newDuration);
          return newDuration;
        });
      }
    };

    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(audioWorkletNode);
  };

  const updateGameScore = remainingTime => {
    const scoreToAdd =
      remainingTime >= 10
        ? 20
        : remainingTime >= 8
          ? 16
          : remainingTime >= 6
            ? 12
            : remainingTime >= 4
              ? 8
              : remainingTime >= 2
                ? 4
                : 0;
    setGameScore(prevScore => prevScore + scoreToAdd);
    console.log('현재 점수입니다.', scoreToAdd);
  };

  const setSunPosition = shoutingDuration => {
    const screenHeight = window.innerHeight;
    const minPercentage = 10;
    const percentage = Math.max(
      ((shoutingDuration * 120) / screenHeight) * 150,
      minPercentage,
    );
    const newSunPositionY = screenHeight * (1 - percentage / 100);
    setSunPositionY(newSunPositionY);
  };

  const getAudioStream = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      return audioStream;
    } catch (error) {
      console.error('Error accessing audio stream', error);
    }
  };

  const initializeStream = async () => {
    const audioStream = await getAudioStream();
    if (audioStream) {
      setStream(audioStream);
      micSetting(false);
    }
  };
  return (
    <>
      <MissionStarting />
      {isMissionEnding && <MissionEnding canvasRef={canvasRef} />}
      <FullScreenCanvas>
        <SubCanvas ref={canvasRef} />
        <Hill />
        {!myMissionStatus && isGameOver ? null : (
          <Sun id="sun" style={{ top: `${sunPositionY}px` }} />
        )}
      </FullScreenCanvas>
      {isGameOver || isMissionStarting || (
        <CanvasWrapper $myMissionStatus={myMissionStatus}>
          <Canvas />
          <SoundIndicator
            $soundWidth={shoutingDuration.toFixed(3) < 5 ? decibels : 0}
          />
        </CanvasWrapper>
      )}
    </>
  );
};

export default Mission4;

const FullScreenCanvas = styled.div`
  z-index: 200;

  position: absolute;

  width: 100%;
  height: 100%;

  ${({ theme }) => theme.flex.center}

  overflow: hidden;
`;

//전체바
const CanvasWrapper = styled.div`
  z-index: 300;

  position: absolute;
  top: 25px;

  width: 80%;
  height: 30px;

  display: ${({ $myMissionStatus }) => ($myMissionStatus ? 'none' : 'block')};

  border-radius: ${({ theme }) => theme.radius.small};
  border: 2px solid ${({ theme }) => theme.colors.primary.white};
  background-color: ${({ theme }) => theme.colors.translucent.navy};
`;

// 목적바
const Canvas = styled.canvas`
  position: absolute;
  bottom: 0;
  left: 0;

  width: 70%;
  height: 100%;

  border-right: 4px solid ${({ theme }) => theme.colors.system.red};
`;

//진행바
const SoundIndicator = styled.div`
  display: ${({ $soundWidth }) => ($soundWidth > 0 ? 'block' : 'none')};
  position: absolute;
  bottom: 0;
  left: 0;

  width: ${({ $soundWidth }) => $soundWidth}%;
  height: 100%;

  border-radius: ${({ theme }) => theme.radius.small};
  border: 1px solid ${({ theme }) => theme.colors.primary.white};
  background-color: ${({ theme }) => theme.colors.primary.emerald};

  transition: width 0.2s ease; // 너비 변화를 0.5초 동안 부드럽게 애니메이션
`;

const SubCanvas = styled.canvas`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const Sun = styled.div`
  position: absolute;

  padding-top: 300px;
  width: 300px;
  height: 300px;

  background-image: url(${sunImage});
  background-size: cover;
  background-position: center;

  transition: top 0.5s ease;
`;

const Hill = styled.div`
  z-index: 300;
  position: absolute;
  bottom: 0;
  left: 0;

  width: 100%;
  height: 200px;

  border-radius: ${({ theme }) => theme.radius.medium};

  background-image: url(${hillImage});
  background-size: cover;
  background-position: center;
`;

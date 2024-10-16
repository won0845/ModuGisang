import React, {
  createContext,
  useState,
  useRef,
  useEffect,
  useContext,
} from 'react';
import { UserContext, GameContext, AccountContext } from './';
import { challengeServices } from '../apis';
import { OpenVidu } from 'openvidu-browser';

const OpenViduContext = createContext();

const OpenViduContextProvider = ({ children }) => {
  const { accessToken } = useContext(AccountContext);
  const { myData, challengeId } = useContext(UserContext);
  const { inGameMode, myMissionStatus, setMatesMissionStatus } =
    useContext(GameContext);

  const { userId, userName } = myData;

  const [OVInstance, setOVInstance] = useState(null); // OpenVidu 객체 [openvidu-browser
  const [videoSession, setVideoSession] = useState(null);
  const [connectionToken, setConnectionToken] = useState('');
  const myVideoRef = useRef(null);
  const [myStream, setMyStream] = useState(null);
  const mateVideoRefs = useRef({});
  const [mateStreams, setMateStreams] = useState([]);
  const [micOn, setMicOn] = useState(true);

  const getConnectionToken = async () => {
    const userData = {
      challengeId: challengeId,
      userId,
      userName,
    };

    try {
      const response = await challengeServices.getConnectionToken({
        accessToken,
        userData,
      });
      setConnectionToken(response.data.token);
    } catch (error) {
      console.error(error);
    }
  };

  const turnMicOnOff = () => {
    myStream?.publishAudio(!micOn);
    setMicOn(prev => !prev);
  };

  const leaveSession = () => {
    if (videoSession) {
      videoSession.disconnect();
    }

    setOVInstance(null);
    setVideoSession(null);
    setMateStreams([]);
    setMyStream(null);
  };

  const sendMissionStatus = async () => {
    try {
      videoSession
        .signal({
          data: JSON.stringify({ userId, missionCompleted: myMissionStatus }),
          to: [],
          type: 'missionStatus',
        })
        .then(() => {
          console.log('====> My Mission Status successfully Sent to Mates');
        })
        .catch(error => {
          console.error(error);
        });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!challengeId) return;
    getConnectionToken();
  }, [challengeId]);

  useEffect(() => {
    if (!connectionToken) return;

    const OV = new OpenVidu();
    const newSession = OV.initSession();

    setOVInstance(OV);
    setVideoSession(newSession);
  }, [connectionToken]);

  useEffect(() => {
    if (!videoSession) return;

    videoSession.on('streamCreated', event => {
      const mateStream = videoSession.subscribe(event.stream, undefined);
      setMateStreams(prev => [...prev, mateStream]);
    });

    videoSession.on('streamDestroyed', event => {
      const thisStream = event.stream.streamManager;
      setMateStreams(prev =>
        prev.filter(mateStream => mateStream !== thisStream),
      );
    });

    videoSession.on('exception', exception => {
      console.warn(exception);
    });

    videoSession.on('signal:leave', event => {
      console.log('---Signal Leave Test:: ', event);
      if (event.data === userId.userId) {
        leaveSession();
      }
    });

    videoSession.on('signal:missionStatus', event => {
      const data = JSON.parse(event.data);
      setMatesMissionStatus(prev => ({
        ...prev,
        [data.userId]: { missionCompleted: data.missionCompleted },
      }));
    });

    const initPublisher = async () => {
      const publisher = await OVInstance.initPublisherAsync(undefined, {
        audioSource: undefined,
        videoSource: undefined,
        publishAudio: true,
        publishVideo: true,
        resolution: '340x480',
        frameRate: 30,
        mirror: true,
      });
      videoSession.publish(publisher);
      setMyStream(publisher);
    };

    // 세션 연결
    videoSession.connect(connectionToken).then(async () => {
      try {
        await initPublisher();
      } catch (error) {
        console.error('/// Connecting OV error:', error);
      }
    });

    return () => {
      if (videoSession) {
        videoSession.off('streamCreated');
        videoSession.disconnect();
      }
      if (myStream) {
        myStream.dispose();
        mateStreams.forEach(stream => stream.dispose());
      }
    };
  }, [videoSession]);

  useEffect(() => {
    if (videoSession?.connection) {
      sendMissionStatus();
    }
  }, [videoSession, myMissionStatus]);

  return (
    <OpenViduContext.Provider
      value={{
        getConnectionToken,
        videoSession,
        micOn,
        turnMicOnOff,
        myVideoRef,
        myStream,
        setMyStream,
        mateVideoRefs,
        mateStreams,
        sendMissionStatus,
        setMicOn,
      }}
    >
      {children}
    </OpenViduContext.Provider>
  );
};

export { OpenViduContext, OpenViduContextProvider };

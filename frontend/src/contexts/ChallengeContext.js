import React, { createContext, useContext, useEffect, useState } from 'react';
import { challengeServices } from '../apis/challengeServices';
import useFetch from '../hooks/useFetch';

import { AccountContext, UserContext } from './';

const ChallengeContext = createContext();

const ChallengeContextProvider = ({ children }) => {
  const { accessToken } = useContext(AccountContext);
  const { challengeId } = useContext(UserContext);
  const { fetchData } = useFetch();

  const [challengeData, setChallengeData] = useState({
    // challengeId: 6,
    // startDate: '2021-09-01T00:00:00.000Z',
    // wakeTime: '17:30',
    // duration: 7,
    // mates: [
    //   { userId: 1, userName: '천사박경원' },
    //   { userId: 2, userName: '귀요미이시현' },
    //   { userId: 3, userName: '깜찍이이재원' },
    //   { userId: 4, userName: '상큼이금도현' },
    //   { userId: 5, userName: '똑똑이연선애' },
    // ],
  });

  const getChallengeData = async () => {
    const response = await fetchData(() =>
      challengeServices.getChallengeInfo({
        accessToken,
        challengeId: challengeId,
      }),
    );

    const {
      isLoading: isChallengeDataLoading,
      data: userChallengeData,
      error: challengeDataError,
    } = response;

    if (!isChallengeDataLoading && userChallengeData) {
      setChallengeData(userChallengeData);
    } else if (!isChallengeDataLoading && challengeDataError) {
      console.error(challengeDataError);
    }
  };

  const handleCreateChallenge = async ({ newChallengeData }) => {
    const response = await fetchData(() =>
      challengeServices.createChallenge({
        accessToken,
        newChallengeData,
      }),
    );
    const {
      isLoading: isCreateChallengeLoading,
      data: createChallengeData,
      error: createChallengeError,
    } = response;
    if (!isCreateChallengeLoading && createChallengeData) {
      console.log('createChallengeData:', createChallengeData);
    } else if (!isCreateChallengeLoading && createChallengeError) {
      console.error(createChallengeError);
    }
    return response;
  };

  const handleAcceptInvitation = async ({
    accessToken,
    challengeId,
    userId,
    setIsAcceptInviLoading,
  }) => {
    setIsAcceptInviLoading(true);
    const response = await fetchData(() =>
      challengeServices.acceptInvitation({
        accessToken,
        challengeId: challengeId,
        userId,
      }),
    );
    const {
      isLoading: isAcceptInviLoading,
      data: acceptInviData,
      error: acceptInviError,
    } = response;
    if (!isAcceptInviLoading && acceptInviData) {
      console.log('acceptInviData:', acceptInviData);
      setIsAcceptInviLoading(false);
    } else if (!isAcceptInviLoading && acceptInviError) {
      console.error(acceptInviError);
      setIsAcceptInviLoading(false);
    }
  };

  useEffect(() => {
    if (challengeId !== -1) {
      getChallengeData();
    }
  }, [challengeId]);

  return (
    <ChallengeContext.Provider
      value={{
        challengeData,
        setChallengeData,
        getChallengeData,
        handleCreateChallenge,
        handleAcceptInvitation,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
};

export { ChallengeContext, ChallengeContextProvider };

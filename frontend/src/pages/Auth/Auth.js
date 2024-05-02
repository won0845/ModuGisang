import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountContext } from '../../contexts/AccountContexts';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import { SimpleBtn } from '../../components';
import { TEST_CONFIG } from '../../config';
import * as S from '../../styles/common';

const Auth = () => {
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const { setAccessToken } = useContext(AccountContext);
  const { logInUser } = useAuth();
  const { fetchData } = useFetch();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setIsLoginLoading(true);
    const response = await fetchData(() =>
      logInUser(TEST_CONFIG.TEST_EMAIL, TEST_CONFIG.TEST_PASSWORD),
    );
    const {
      isLoading: isLoginLoading,
      data: loginData,
      error: loginError,
    } = response;
    if (!isLoginLoading) {
      setIsLoginLoading(false);
      setAccessToken(loginData.accessToken);
      localStorage.setItem('refreshToken', loginData.refreshToken);
      alert('로그인 되었습니다.');
      navigate('/main');
    } else if (loginError) {
      setIsLoginLoading(false);
      alert(loginError);
      return;
    }
  };

  if (isLoginLoading) return <div>Loading...</div>;

  return (
    <S.PageWrapper>
      Auth Page
      <SimpleBtn btnName="로그인" onClickHandler={handleLogin} />
    </S.PageWrapper>
  );
};

export default Auth;

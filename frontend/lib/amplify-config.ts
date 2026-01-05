import { Amplify } from 'aws-amplify';

let isConfigured = false;

export const configureAmplify = () => {
  if (isConfigured) return;

  const config = {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
        userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
        loginWith: {
          email: true,
        },
      }
    }
  };

  console.log('🔧 Configuring Amplify with:', {
    userPoolId: config.Auth.Cognito.userPoolId,
    userPoolClientId: config.Auth.Cognito.userPoolClientId,
  });

  Amplify.configure(config, { ssr: true });
  isConfigured = true;
};
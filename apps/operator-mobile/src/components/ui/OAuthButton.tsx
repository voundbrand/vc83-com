import { styled, Spinner, XStack, Text } from 'tamagui';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAppPreferences } from '../../contexts/AppPreferencesContext';

const BUTTON_HEIGHT = 50;

const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

const AppleLogo = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      fill={color}
    />
  </Svg>
);

const GitHubLogo = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
      fill={color}
    />
  </Svg>
);

const MicrosoftLogo = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M0 0h11.5v11.5H0z" fill="#F25022" />
    <Path d="M12.5 0H24v11.5H12.5z" fill="#7FBA00" />
    <Path d="M0 12.5h11.5V24H0z" fill="#00A4EF" />
    <Path d="M12.5 12.5H24V24H12.5z" fill="#FFB900" />
  </Svg>
);

const StyledOAuthButtonContainer = styled(XStack, {
  name: 'OAuthButton',
  height: BUTTON_HEIGHT,
  borderRadius: '$3',
  paddingHorizontal: '$5',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$3',
  borderWidth: 1,
  borderColor: '$glassBorder',

  variants: {
    provider: {
      google: {
        backgroundColor: '$glass',
      },
      apple: {
        backgroundColor: 'white',
      },
      github: {
        backgroundColor: '$glass',
      },
      githubDark: {
        backgroundColor: '#24292e',
      },
      microsoft: {
        backgroundColor: '$glass',
      },
    },
  } as const,
});

export type OAuthProvider = 'google' | 'apple' | 'github' | 'microsoft';

type OAuthButtonProps = {
  provider: OAuthProvider;
  loading?: boolean;
  onPress: () => void;
  disabled?: boolean;
};

const providerConfigLight: Record<OAuthProvider, { label: string; textColor: string; logoColor?: string }> = {
  google: { label: 'Google', textColor: '$color' },
  apple: { label: 'Apple', textColor: '#000' },
  github: { label: 'GitHub', textColor: '$color', logoColor: '#24292e' },
  microsoft: { label: 'Microsoft', textColor: '$color' },
};

const providerConfigDark: Record<OAuthProvider, { label: string; textColor: string; logoColor?: string }> = {
  google: { label: 'Google', textColor: '$color' },
  apple: { label: 'Apple', textColor: '#000' },
  github: { label: 'GitHub', textColor: '#fff', logoColor: '#fff' },
  microsoft: { label: 'Microsoft', textColor: '$color' },
};

export function OAuthButton({
  provider,
  loading,
  onPress,
  disabled,
}: OAuthButtonProps) {
  const { resolvedTheme, t } = useAppPreferences();
  const isDark = resolvedTheme === 'dark';
  const config = isDark ? providerConfigDark[provider] : providerConfigLight[provider];
  const providerLabel = t(`oauth.provider.${provider}` as 'oauth.provider.google');

  // For GitHub, use different variant based on color scheme
  const buttonVariant = provider === 'github' && isDark ? 'githubDark' : provider;

  const renderLogo = () => {
    switch (provider) {
      case 'google':
        return <GoogleLogo size={20} />;
      case 'apple':
        return <AppleLogo size={20} color="#000" />;
      case 'github':
        return <GitHubLogo size={20} color={config.logoColor || '#fff'} />;
      case 'microsoft':
        return <MicrosoftLogo size={20} />;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        opacity: disabled || loading ? 0.5 : pressed ? 0.8 : 1,
        transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
      })}
    >
      <StyledOAuthButtonContainer
        provider={buttonVariant as OAuthProvider}
      >
        {loading ? (
          <Spinner size="small" color={config.textColor} />
        ) : (
          <XStack alignItems="center" gap="$3">
            {renderLogo()}
            <Text
              fontSize="$4"
              fontWeight="600"
              color={config.textColor}
            >
              {t('oauth.continueWith', { provider: providerLabel })}
            </Text>
          </XStack>
        )}
      </StyledOAuthButtonContainer>
    </Pressable>
  );
}

export default OAuthButton;

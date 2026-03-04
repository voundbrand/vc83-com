import { Platform, type SwitchProps } from 'react-native';

type NativeSwitchColorProps = Pick<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>;

export const appThemeTokens = {
  switch: {
    onTrack: '#E8520A',
    offTrackDark: 'rgba(255,255,255,0.22)',
    offTrackLight: 'rgba(23,23,24,0.22)',
    offIosBackgroundDark: 'rgba(255,255,255,0.18)',
    offIosBackgroundLight: 'rgba(23,23,24,0.14)',
    thumbOn: '#ffffff',
    thumbOffDark: '#f5efe4',
    thumbOffLight: '#ffffff',
  },
} as const;

type SwitchColorOptions = {
  isDark: boolean;
  isEnabled: boolean;
  platform?: 'ios' | 'android';
};

export function getNativeSwitchColors({
  isDark,
  isEnabled,
  platform = Platform.OS as 'ios' | 'android',
}: SwitchColorOptions): NativeSwitchColorProps {
  const tokens = appThemeTokens.switch;

  return {
    trackColor: {
      false: isDark ? tokens.offTrackDark : tokens.offTrackLight,
      true: tokens.onTrack,
    },
    thumbColor: isEnabled ? tokens.thumbOn : isDark ? tokens.thumbOffDark : tokens.thumbOffLight,
    ios_backgroundColor:
      platform === 'ios' ? (isDark ? tokens.offIosBackgroundDark : tokens.offIosBackgroundLight) : undefined,
  };
}

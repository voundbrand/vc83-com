import React, { useState } from 'react';
import { Input as TamaguiInput, styled, XStack, YStack, Text, GetProps } from 'tamagui';
import { Eye, EyeOff } from '@tamagui/lucide-icons';
import { Pressable } from 'react-native';

const INPUT_HEIGHT = 50;
const ICON_PADDING = 44;

const StyledInput = styled(TamaguiInput, {
  name: 'Input',
  height: INPUT_HEIGHT,
  borderRadius: '$3',
  backgroundColor: '$glass',
  color: '$color',
  paddingHorizontal: '$4',
  fontSize: '$4',
  placeholderTextColor: '$colorMuted',
  borderWidth: 1,
  borderColor: '$glassBorder',

  focusStyle: {
    borderColor: '$primary',
    backgroundColor: '$glass',
  },

  variants: {
    uiSize: {
      sm: {
        height: 40,
        fontSize: '$3',
        borderRadius: '$2',
      },
      md: {
        height: INPUT_HEIGHT,
        fontSize: '$4',
      },
      lg: {
        height: 56,
        fontSize: '$5',
      },
    },
    hasError: {
      true: {
        borderColor: '$error',
        focusStyle: {
          borderColor: '$error',
        },
      },
    },
  } as const,

  defaultVariants: {
    uiSize: 'md',
  },
});

const InputContainer = styled(YStack, {
  gap: '$1',
});

const Label = styled(Text, {
  fontSize: '$3',
  fontWeight: '500',
  color: '$colorSecondary',
  marginBottom: '$1',
});

const ErrorText = styled(Text, {
  fontSize: '$2',
  color: '$error',
  marginTop: '$1',
});

const HelperText = styled(Text, {
  fontSize: '$2',
  color: '$colorTertiary',
  marginTop: '$1',
});

type InputProps = GetProps<typeof StyledInput> & {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const Input = React.forwardRef<any, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    ...props
  },
  ref
) {
  return (
    <InputContainer>
      {label && <Label>{label}</Label>}
      <XStack alignItems="center" position="relative">
        {leftIcon && (
          <XStack position="absolute" left="$4" zIndex={1}>
            {leftIcon}
          </XStack>
        )}
        <StyledInput
          ref={ref}
          hasError={!!error}
          paddingLeft={leftIcon ? ICON_PADDING : '$4'}
          paddingRight={rightIcon ? ICON_PADDING : '$4'}
          flex={1}
          {...props}
        />
        {rightIcon && (
          <XStack position="absolute" right="$4" zIndex={1}>
            {rightIcon}
          </XStack>
        )}
      </XStack>
      {error && <ErrorText>{error}</ErrorText>}
      {helperText && !error && <HelperText>{helperText}</HelperText>}
    </InputContainer>
  );
});

type PasswordInputProps = Omit<InputProps, 'secureTextEntry' | 'rightIcon'> & {
  disableStrongPasswordAssist?: boolean;
};

export const PasswordInput = React.forwardRef<any, PasswordInputProps>(function PasswordInput(
  { disableStrongPasswordAssist, ...props },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const strongPasswordOverride = disableStrongPasswordAssist
    ? {
        textContentType: 'oneTimeCode' as const,
        autoComplete: 'off' as const,
        importantForAutofill: 'no' as const,
      }
    : null;

  return (
    <Input
      ref={ref}
      secureTextEntry={!showPassword}
      {...strongPasswordOverride}
      rightIcon={
        <Pressable onPress={() => setShowPassword(!showPassword)}>
          {showPassword ? (
            <EyeOff size={20} color="$colorTertiary" />
          ) : (
            <Eye size={20} color="$colorTertiary" />
          )}
        </Pressable>
      }
      {...props}
    />
  );
});

export default Input;

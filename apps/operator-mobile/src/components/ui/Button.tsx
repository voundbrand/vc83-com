import { Button as TamaguiButton, styled, Spinner, GetProps, XStack } from 'tamagui';

const BUTTON_HEIGHT = 50;

const StyledButton = styled(TamaguiButton, {
  name: 'Button',
  height: BUTTON_HEIGHT,
  paddingHorizontal: '$5',
  borderRadius: '$3',
  backgroundColor: '$glass',
  borderWidth: 1,
  borderColor: '$glassBorder',

  pressStyle: {
    opacity: 0.8,
    scale: 0.98,
  },

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
        borderWidth: 0,
        pressStyle: {
          backgroundColor: '$primaryPress',
          opacity: 1,
        },
      },
      secondary: {
        backgroundColor: '$glass',
        borderWidth: 1,
        borderColor: '$glassBorder',
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        pressStyle: {
          backgroundColor: '$surface',
        },
      },
      danger: {
        backgroundColor: '$error',
        borderWidth: 0,
        pressStyle: {
          opacity: 0.9,
        },
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$primary',
      },
    },
    uiSize: {
      sm: {
        height: 36,
        paddingHorizontal: '$3',
        fontSize: '$3',
      },
      md: {
        height: BUTTON_HEIGHT,
        paddingHorizontal: '$5',
        fontSize: '$4',
      },
      lg: {
        height: 56,
        paddingHorizontal: '$6',
        fontSize: '$5',
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'secondary',
    uiSize: 'md',
  },
});

type ButtonProps = GetProps<typeof StyledButton> & {
  loading?: boolean;
  loadingText?: string;
};

export function Button({
  children,
  loading,
  loadingText,
  disabled,
  variant = 'secondary',
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary' || variant === 'danger';
  const isOutline = variant === 'outline';
  const textColor = isPrimary ? 'white' : isOutline ? '$primary' : '$color';

  return (
    <StyledButton
      disabled={disabled || loading}
      variant={variant}
      opacity={disabled ? 0.5 : 1}
      {...props}
    >
      <XStack alignItems="center" justifyContent="center" gap="$2">
        {loading && <Spinner size="small" color={textColor} />}
        <TamaguiButton.Text
          color={textColor}
          fontWeight="600"
          fontSize="$4"
        >
          {loading && loadingText ? loadingText : children}
        </TamaguiButton.Text>
      </XStack>
    </StyledButton>
  );
}

export default Button;

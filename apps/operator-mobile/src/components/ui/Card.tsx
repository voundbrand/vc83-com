import { styled, YStack, XStack, Text, GetProps } from 'tamagui';

export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$background',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$borderColor',
  padding: '$4',
  animation: 'fast',

  variants: {
    variant: {
      default: {},
      elevated: {
        borderWidth: 0,
        shadowColor: '$color',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
      outline: {
        backgroundColor: 'transparent',
      },
      filled: {
        backgroundColor: '$backgroundHover',
        borderWidth: 0,
      },
    },
    pressable: {
      true: {
        pressStyle: {
          scale: 0.98,
          opacity: 0.9,
        },
        hoverStyle: {
          borderColor: '$borderColorHover',
          backgroundColor: '$backgroundHover',
        },
      },
    },
    uiSize: {
      sm: {
        padding: '$3',
      },
      md: {
        padding: '$4',
      },
      lg: {
        padding: '$5',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    uiSize: 'md',
  },
});

export const CardHeader = styled(YStack, {
  name: 'CardHeader',
  gap: '$1',
  marginBottom: '$3',
});

export const CardTitle = styled(Text, {
  name: 'CardTitle',
  fontSize: '$6',
  fontWeight: '600',
  color: '$color',
});

export const CardDescription = styled(Text, {
  name: 'CardDescription',
  fontSize: '$3',
  color: '$placeholderColor',
});

export const CardContent = styled(YStack, {
  name: 'CardContent',
  gap: '$3',
});

export const CardFooter = styled(XStack, {
  name: 'CardFooter',
  marginTop: '$3',
  justifyContent: 'flex-end',
  gap: '$2',
});

export type CardProps = GetProps<typeof Card>;

export default Card;

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../utils/colors';

const Button = ({ title, onPress, loading, disabled, variant = 'primary', style }) => {
  const bgColor = variant === 'primary' ? COLORS.primary : variant === 'secondary' ? COLORS.accent : COLORS.light;
  const textColor = variant === 'outline' ? COLORS.dark : COLORS.white;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: variant === 'outline' ? 'transparent' : bgColor },
        variant === 'outline' && styles.outline,
        (disabled || loading) && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  outline: {
    borderWidth: 2,
    borderColor: COLORS.dark,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
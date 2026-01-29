import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ANIMATION_DURATION_MS = 180;

const KeyboardToggleOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const bottomAnim = useRef(new Animated.Value(-100)).current;

  const animateToBottom = (to: number) => {
    Animated.timing(bottomAnim, {
      toValue: to,
      duration: ANIMATION_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    const onShow = (e: any) => {
      setVisible(true);
      animateToBottom((e?.endCoordinates?.height || 0) + 12);
    };

    const onHide = () => {
      setVisible(false);
      animateToBottom(-100);
    };

    const subShow = Keyboard.addListener('keyboardDidShow', onShow);
    const subHide = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [bottomAnim]);

  const handleDismiss = () => {
    Keyboard.dismiss();
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { bottom: bottomAnim }]}>
      <TouchableOpacity style={styles.button} onPress={handleDismiss} activeOpacity={0.8}>
        <Icon name="keyboard-hide" size={22} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    zIndex: 9999,
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default KeyboardToggleOverlay;

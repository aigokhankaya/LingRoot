import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ANIMATION_DURATION_MS = 180;
const OFFSCREEN_Y = 200;
const KEYBOARD_GAP_PX = 5;
const BASE_BOTTOM_PX = 16;

const KeyboardToggleOverlay: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const translateYAnim = useRef(new Animated.Value(OFFSCREEN_Y)).current;

  const animateToY = (toValue: number) => {
    Animated.timing(translateYAnim, {
      toValue,
      duration: ANIMATION_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const onShow = (e: { endCoordinates?: { height?: number } }) => {
      const kbHeight = e?.endCoordinates?.height || 0;
      setVisible(true);
      if (Platform.OS === 'ios') {
        const restingBottom = BASE_BOTTOM_PX + insets.bottom;
        const targetBottom = kbHeight + KEYBOARD_GAP_PX;
        animateToY(-(targetBottom - restingBottom));
      } else {
        animateToY(0);
      }
    };

    const onHide = () => {
      animateToY(OFFSCREEN_Y);
      // Delay hiding to allow animation to complete
      setTimeout(() => setVisible(false), ANIMATION_DURATION_MS);
    };

    const subShow = Keyboard.addListener('keyboardDidShow', onShow);
    const subHide = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [insets.bottom, translateYAnim]);

  const handleDismiss = () => {
    Keyboard.dismiss();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: BASE_BOTTOM_PX + insets.bottom,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
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

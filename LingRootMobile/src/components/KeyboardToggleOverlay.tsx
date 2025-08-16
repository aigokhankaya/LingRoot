import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, StyleSheet, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TouchableOpacity } from 'react-native-gesture-handler';

const ANIMATION_DURATION_MS = 180;

const KeyboardToggleOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [hiddenViaToggle, setHiddenViaToggle] = useState(false);
  const keyboardHeightRef = useRef(0);
  const lastFocusedFieldRef = useRef<any>(null);
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
      setIsKeyboardVisible(true);
      setHiddenViaToggle(false);
      keyboardHeightRef.current = e?.endCoordinates?.height || 0;
      // Remember currently focused input handle
      try {
        const focused = (TextInput as any).State?.currentlyFocusedInput?.() || (TextInput as any).State?.currentlyFocusedField?.();
        lastFocusedFieldRef.current = focused || null;
      } catch {}
      setVisible(true);
      animateToBottom((e?.endCoordinates?.height || 0) + 12);
    };

    const onHide = () => {
      setIsKeyboardVisible(false);
      if (hiddenViaToggle && lastFocusedFieldRef.current) {
        // Keep button visible at bottom for re-open action
        setVisible(true);
        animateToBottom(20);
      } else {
        // User hid keyboard by tapping elsewhere → hide button
        setVisible(false);
        animateToBottom(-100);
        lastFocusedFieldRef.current = null;
      }
    };

    const subShow = Keyboard.addListener('keyboardDidShow', onShow);
    const subHide = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [bottomAnim, hiddenViaToggle]);

  const handleToggle = () => {
    if (isKeyboardVisible) {
      setHiddenViaToggle(true);
      try {
        Keyboard.dismiss();
      } catch {}
    } else {
      // Try to re-focus last focused input to bring keyboard back
      try {
        const focusMethod = (TextInput as any).State?.focusTextInput;
        if (focusMethod && lastFocusedFieldRef.current) {
          focusMethod(lastFocusedFieldRef.current);
          setHiddenViaToggle(false);
        } else if (lastFocusedFieldRef.current?.focus) {
          lastFocusedFieldRef.current.focus();
          setHiddenViaToggle(false);
        }
      } catch {}
    }
  };

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.container,
          { bottom: bottomAnim, right: 12 },
        ]}
      >
        <TouchableOpacity style={styles.button} onPress={handleToggle} activeOpacity={0.8}>
          <Icon name={isKeyboardVisible ? 'keyboard-hide' : 'keyboard'} size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
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



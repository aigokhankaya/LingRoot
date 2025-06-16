declare module 'react-input-mask' {
  import * as React from 'react';
  
  interface InputMaskProps extends React.InputHTMLAttributes<HTMLInputElement> {
    mask?: string | Array<(string | RegExp)>;
    maskChar?: string | null;
    formatChars?: { [key: string]: string };
    alwaysShowMask?: boolean;
    inputRef?: React.Ref<HTMLInputElement>;
    beforeMaskedValueChange?: (
      newState: any,
      oldState: any,
      userInput: any,
      maskOptions: any
    ) => any;
  }
  
  declare const InputMask: React.ComponentType<InputMaskProps>;
  export default InputMask;
} 
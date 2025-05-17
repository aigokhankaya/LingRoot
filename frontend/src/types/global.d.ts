import { User } from './user';

declare global {
  interface Window {
    user?: User;
  }
}

export {}; 
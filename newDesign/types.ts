
export interface Book {
  id: string;
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  progress: string;
  type: 'Text' | 'Audio';
  icon: string;
  color: string;
}

export type AppTab = 'home' | 'library' | 'chat' | 'profile';

# LingRootMobile Test Rehberi

## Kurulum

### 1. Test Bağımlılıklarını Yükleyin
```bash
cd LingRootMobile
npm install
```

### 2. Test Çalıştırma Komutları

```bash
# Tüm testleri çalıştır
npm test

# Testleri watch modunda çalıştır (otomatik yeniden çalıştırma)
npm run test:watch

# Test kapsamı raporunu görüntüle
npm run test:coverage
```

## Test Türleri

### 1. Component (Bileşen) Testleri
- **Konum**: `src/screens/__tests__/`
- **Amaç**: React Native bileşenlerinin doğru render edildiğini test etmek
- **Örnek**: `HomeScreen.test.tsx`, `LoginScreen.test.tsx`

### 2. Service (Servis) Testleri
- **Konum**: `src/services/__tests__/`
- **Amaç**: API çağrıları ve business logic'i test etmek
- **Örnek**: `api.test.ts`

### 3. Context (Bağlam) Testleri
- **Konum**: `src/contexts/__tests__/`
- **Amaç**: React Context'lerin doğru çalıştığını test etmek

## Test Yazma Rehberi

### 1. Component Test Örneği

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import YourComponent from '../YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    const { getByText } = render(<YourComponent />);
    expect(getByText('Expected Text')).toBeTruthy();
  });

  it('handles button press', () => {
    const mockFunction = jest.fn();
    const { getByText } = render(<YourComponent onPress={mockFunction} />);
    
    fireEvent.press(getByText('Button'));
    expect(mockFunction).toHaveBeenCalled();
  });
});
```

### 2. Service Test Örneği

```typescript
import { api } from '../api';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  it('should fetch data successfully', async () => {
    const mockData = { data: { message: 'success' } };
    mockedAxios.get.mockResolvedValueOnce(mockData);

    const result = await api.getData();
    expect(result).toEqual(mockData.data);
  });
});
```

## Test Utilities

### 1. Test Wrapper (AuthProvider ile)

```typescript
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

// Usage
const { getByText } = render(
  <TestWrapper>
    <YourComponent />
  </TestWrapper>
);
```

### 2. Mock Functions

```typescript
// Navigation mock
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
```

## Test Çalıştırma Senaryoları

### 1. Geliştirme Sırasında
```bash
# Watch modunda çalıştır (değişiklikleri otomatik algılar)
npm run test:watch
```

### 2. CI/CD Pipeline'da
```bash
# Tek seferlik test çalıştırma
npm test

# Coverage raporuyla birlikte
npm run test:coverage
```

### 3. Belirli Dosyaları Test Etme
```bash
# Belirli bir test dosyasını çalıştır
npm test -- HomeScreen.test.tsx

# Belirli bir pattern ile eşleşen testleri çalıştır
npm test -- --testNamePattern="login"
```

## Debugging

### 1. Console Logs
```typescript
it('should debug component state', () => {
  const { debug } = render(<YourComponent />);
  debug(); // Tüm component tree'yi yazdırır
});
```

### 2. Test Hatalarını Anlama
```typescript
// Eğer bir element bulunamıyorsa
const { getByText } = render(<YourComponent />);
// Bu hata verebilir: "Unable to find an element with text: Expected Text"

// Çözüm: Alternatif selector kullan
const element = getByText(/Expected/i) || getByTestId('alternative-id');
```

## En İyi Uygulamalar

### 1. Test Dosya Yapısı
```
src/
  screens/
    HomeScreen.tsx
    __tests__/
      HomeScreen.test.tsx
  services/
    api.ts
    __tests__/
      api.test.ts
```

### 2. Test Naming
```typescript
describe('HomeScreen', () => {
  it('renders welcome message', () => {
    // Test implementation
  });
  
  it('navigates to create screen when button is pressed', () => {
    // Test implementation
  });
});
```

### 3. Mock Yönetimi
```typescript
// beforeEach ile mock'ları temizle
beforeEach(() => {
  jest.clearAllMocks();
});
```

## Troubleshooting

### 1. Common Errors

**Metro bundler hatası**: Metro cache'i temizle
```bash
npx expo start --clear
```

**Test bağımlılık hatası**: node_modules'u yeniden yükle
```bash
rm -rf node_modules package-lock.json
npm install
```

### 2. TypeScript Hatları
```typescript
// Test dosyalarında TypeScript hatalarını gidermek için
// tsconfig.json'da test dosyalarını include et
{
  "compilerOptions": {
    "types": ["jest", "@testing-library/jest-native"]
  }
}
```

## Gelişmiş Test Senaryoları

### 1. Async Operations
```typescript
it('handles async operations', async () => {
  const { getByText } = render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(getByText('Loaded Data')).toBeTruthy();
  });
});
```

### 2. User Interactions
```typescript
it('handles user input', () => {
  const { getByPlaceholderText } = render(<InputComponent />);
  
  const input = getByPlaceholderText('Enter text');
  fireEvent.changeText(input, 'New Value');
  
  expect(input.props.value).toBe('New Value');
});
```

Bu rehber ile LingRootMobile projenizde kapsamlı testler yazabilirsiniz! 
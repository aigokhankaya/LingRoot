/**
 * Jest Setup File
 * Global mocks and test utilities
 */

import '@testing-library/jest-dom';

// Extend global types for testing
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toBeInTheDocument(): R;
            toHaveAttribute(attr: string, value?: string): R;
            toHaveClass(...classNames: string[]): R;
            toHaveFocus(): R;
        }
    }
}

// Mock next/router
jest.mock('next/router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        pathname: '/',
        query: {},
        asPath: '/',
        route: '/',
        events: {
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn(),
        },
    }),
}));

// LocalStorage mock with proper typing
interface MockStorage {
    getItem: jest.Mock<string | null, [string]>;
    setItem: jest.Mock<void, [string, string]>;
    removeItem: jest.Mock<void, [string]>;
    clear: jest.Mock<void, []>;
    length: number;
    key: jest.Mock<string | null, [number]>;
}

const createLocalStorageMock = (): MockStorage => {
    let store: Record<string, string> = {};

    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = String(value);
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: jest.fn((i: number) => Object.keys(store)[i] || null),
    };
};

const localStorageMock = createLocalStorageMock();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
    writable: true,
});

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

// Mock console warnings for tests
const originalWarn = console.warn;
beforeAll(() => {
    console.warn = (...args: unknown[]) => {
        // Suppress React act warnings in tests
        const firstArg = args[0];
        if (typeof firstArg === 'string' && firstArg.includes?.('act(...)')) return;
        originalWarn.apply(console, args);
    };
});

afterAll(() => {
    console.warn = originalWarn;
});

// Clear all mocks between tests
beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (global.fetch as jest.Mock).mockClear();
});

export { };

/**
 * Global Error Boundary for React Native
 *
 * Catches unhandled JS exceptions in the component tree,
 * reports them to SigNoz via errorLogger, and shows a fallback UI.
 */

import React, { Component, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { errorLogger } from '../utils/errorLogger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    errorLogger.captureError(
      `Unhandled React error: ${error.message}`,
      error,
      {
        component: 'ErrorBoundary',
        screenName: 'unknown',
        componentStack: info.componentStack || undefined,
      },
    );
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Beklenmeyen Hata</Text>
          <Text style={styles.message}>
            Bir hata oluştu. Lütfen tekrar deneyin.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetail} numberOfLines={6}>
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorDetail: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

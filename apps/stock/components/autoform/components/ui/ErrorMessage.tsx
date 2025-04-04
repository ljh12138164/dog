import * as React from 'react';
import { Text, StyleSheet } from 'react-native';

interface ErrorMessageProps {
  error: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error }) => {
  return <Text style={styles.error}>{error}</Text>;
};

const styles = StyleSheet.create({
  error: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});

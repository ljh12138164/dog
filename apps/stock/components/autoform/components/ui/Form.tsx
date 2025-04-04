import * as React from 'react';
import { View, Text, ViewProps } from 'react-native';
interface FormProps extends ViewProps {
  onSubmit: () => void;
  children: React.ReactNode;
}

export const Form: React.FC<FormProps> = ({ children, onSubmit, style, ...props }) => {
  // 处理可能的文本节点
  const safeChildren = React.Children.map(children, child => {
    if (typeof child === 'string') {
      return <Text>{child}</Text>;
    }
    return child;
  });

  return (
    <View
      style={[
        {
          width: '100%',
          padding: 10,
        },
        style,
      ]}
      {...props}
    >
      {safeChildren}
    </View>
  );
};

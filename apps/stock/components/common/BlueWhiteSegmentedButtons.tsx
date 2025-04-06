import React from 'react';
import { StyleSheet } from 'react-native';
import { SegmentedButtons as PaperSegmentedButtons } from 'react-native-paper';
import type { Props as SegmentedButtonsProps } from 'react-native-paper/lib/typescript/components/SegmentedButtons/SegmentedButtons';
import blueWhiteTheme from '../../theme';

/**
 * 蓝白色主题的分段按钮组件
 */
const BlueWhiteSegmentedButtons = (props: SegmentedButtonsProps) => {
  // 扩展按钮样式，应用蓝白色主题
  const extendedButtons = props.buttons.map(button => ({
    ...button,
    style: [
      styles.button,
      // 选中和未选中时的样式
      button.value === props.value ? styles.selectedButton : styles.unselectedButton,
      button.style,
    ],
    // 标签样式
    labelStyle: [
      styles.buttonLabel,
      // 选中和未选中时的文字颜色
      button.value === props.value ? styles.selectedLabel : styles.unselectedLabel,
      button.labelStyle,
    ],
  }));

  return (
    <PaperSegmentedButtons
      {...props}
      buttons={extendedButtons}
      style={[styles.container, props.style]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f9ff', // 浅蓝色背景
    borderRadius: 25, // 圆角更大
    padding: 2, // 内边距
    borderColor: '#e1e9f5', // 边框颜色
    borderWidth: 1,
    elevation: 0, // 无阴影
  },
  button: {
    borderWidth: 0, // 无边框
    minHeight: 36, // 最小高度
    borderRadius: 24, // 按钮圆角
  },
  selectedButton: {
    backgroundColor: '#0088ff', // 选中时蓝色背景
  },
  unselectedButton: {
    backgroundColor: 'transparent', // 未选中时透明背景
  },
  buttonLabel: {
    fontSize: 13, // 字体大小
    fontWeight: '500', // 字体粗细
  },
  selectedLabel: {
    color: 'white', // 选中时白色文字
  },
  unselectedLabel: {
    color: '#666666', // 未选中时灰色文字
  },
});

export default BlueWhiteSegmentedButtons;

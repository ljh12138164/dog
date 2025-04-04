import { AutoFormProps as BaseAutoFormProps, FieldValues } from "@autoform/react";
import { ViewStyle } from "react-native";

export interface AutoFormProps<T extends FieldValues> extends Omit<
  BaseAutoFormProps<T>,
  "uiComponents" | "formComponents"
> {
  uiComponents?: Partial<BaseAutoFormProps<T>["uiComponents"]>;
  formComponents?: Partial<BaseAutoFormProps<T>["formComponents"]>;
  containerStyle?: ViewStyle;
} 
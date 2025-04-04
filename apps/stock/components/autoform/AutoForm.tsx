import { AutoFormUIComponents, AutoForm as BaseAutoForm } from '@autoform/react';
import { useEffect, useState } from 'react';
import { BooleanField } from './components/fields/BooleanField';
import { DateField } from './components/fields/DateField';
import { NumberField } from './components/fields/NumberField';
import { SelectField } from './components/fields/SelectField';
import { StringField } from './components/fields/StringField';
import { ArrayElementWrapper } from './components/ui/ArrayElementWrapper';
import { ArrayWrapper } from './components/ui/ArrayWrapper';
import { ErrorMessage } from './components/ui/ErrorMessage';
import { FieldWrapper } from './components/ui/FieldWrapper';
import { Form } from './components/ui/Form';
import { ObjectWrapper } from './components/ui/ObjectWrapper';
import { SubmitButton } from './components/ui/SubmitButton';
import { AutoFormProps } from './types';
import { useAutoFormStore } from '@/store/autoform';

const ExpoUIComponents: AutoFormUIComponents = {
  Form: Form as any,
  FieldWrapper,
  ErrorMessage,
  SubmitButton,
  ObjectWrapper,
  ArrayWrapper,
  ArrayElementWrapper,
};

const ExpoAutoFormFieldComponents = {
  string: StringField,
  number: NumberField,
  boolean: BooleanField,
  date: DateField,
  select: SelectField,
} as const;

export type FieldTypes = keyof typeof ExpoAutoFormFieldComponents;

export function AutoForm<T extends Record<string, any>>({
  containerStyle,
  uiComponents,
  formComponents,
  onFormInit,
  onSubmit,
  ...props
}: AutoFormProps<T>) {
  const [isMounted, setIsMounted] = useState(false);
  const { setOnSubmit } = useAutoFormStore();
  useEffect(() => {
    setIsMounted(true);
    if (onSubmit && typeof onSubmit === 'function') {
      setOnSubmit(onSubmit);
    }
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <BaseAutoForm
      {...props}
      onSubmit={onSubmit}
      formProps={{ ...props.formProps }}
      uiComponents={{ ...ExpoUIComponents, ...uiComponents }}
      formComponents={{ ...ExpoAutoFormFieldComponents, ...formComponents }}
      onFormInit={form => {
        if (onFormInit) {
          onFormInit(form);
        }
      }}
    />
  );
}

import AutoFormBuilder from './builder';
import { FormFieldConfig, DraggableComponent, SortableField } from './builder/components';
import { generateZodCode, generateZodSchema, createZodProvider } from './builder/utils';
import { formComponents } from './builder/types';
import type { ComponentType, FieldType } from './builder/types';

export {
  AutoFormBuilder,
  FormFieldConfig,
  DraggableComponent,
  SortableField,
  generateZodCode,
  generateZodSchema,
  createZodProvider,
  formComponents,
};

export type { ComponentType, FieldType };

export default AutoFormBuilder;

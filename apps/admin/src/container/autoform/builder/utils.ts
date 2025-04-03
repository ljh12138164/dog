import { z } from 'zod';
import { ZodProvider, fieldConfig } from '@autoform/zod';
import { FieldType } from './types';

// 生成ZOD模式
export function generateZodSchema(fields: FieldType[]) {
  const schemaObj: Record<string, z.ZodTypeAny> = {};

  fields.forEach(field => {
    const { id, type, required, defaultValue, label } = field;

    let fieldSchema: z.ZodTypeAny = z.string();

    if (type === 'number') {
      fieldSchema = z.coerce.number();
    } else if (type === 'checkbox') {
      fieldSchema = z.boolean();
    }

    if (required) {
      if (type === 'number') {
        fieldSchema = z.coerce.number().min(1, { message: `${label} 是必填项` });
      } else if (type === 'checkbox') {
        fieldSchema = z.boolean();
      } else {
        fieldSchema = z.string().min(1, { message: `${label} 是必填项` });
      }
    } else {
      fieldSchema = fieldSchema.optional();
    }

    if (defaultValue) {
      fieldSchema = fieldSchema.default(defaultValue);
    }

    // 添加fieldConfig
    fieldSchema = fieldSchema.superRefine(
      fieldConfig({
        description: field.description || '',
        label: field.label,
        inputProps: {
          placeholder: field.placeholder || '请输入',
          type: field.type || 'text',
        },
      }),
    );

    schemaObj[id] = fieldSchema;
  });

  return z.object(schemaObj);
}

// 创建ZodProvider
export function createZodProvider(fields: FieldType[]) {
  const schema = generateZodSchema(fields);
  return new ZodProvider(schema);
}

// 生成Zod代码
export function generateZodCode(fields: FieldType[]): string {
  if (fields.length === 0) return '';

  let code = `import { z } from 'zod';\nimport { fieldConfig } from '@autoform/zod';\n\n`;
  code += 'const formSchema = z.object({\n';

  fields.forEach((field, index) => {
    const { id, type, required, defaultValue, placeholder, description, label } = field;

    code += `  ${id}: z`;

    // 基础类型
    if (type === 'number') {
      code += '.coerce.number()';
    } else if (type === 'checkbox') {
      code += '.boolean()';
    } else {
      code += '.string()';
    }

    // 验证规则
    if (required) {
      code += `.min(1, { message: '${label} 是必填项' })`;
    } else {
      code += '.optional()';
    }

    // 默认值
    if (defaultValue) {
      code += `.default('${defaultValue}')`;
    }

    // 字段配置
    code += `.superRefine(\n    fieldConfig({\n`;
    if (description) {
      code += `      description: '${description}',\n`;
    }
    code += `      label: '${label}',\n`;
    code += `      inputProps: {\n        placeholder: '${placeholder || '请输入'}',\n`;
    if (type === 'password') {
      code += `        type: 'password',\n`;
    }
    code += `      },\n    })\n  )`;

    // 如果不是最后一个字段，添加逗号
    if (index < fields.length - 1) {
      code += ',\n';
    } else {
      code += '\n';
    }
  });

  code += '});\n\n';
  code += 'export const zodSchemaProvider = new ZodProvider(formSchema);\n';

  return code;
} 
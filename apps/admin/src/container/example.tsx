import { AutoForm } from '@autoform/ant';
import { ZodProvider, fieldConfig } from '@autoform/zod';
import { Button } from 'antd';
import { useState } from 'react';
import { z } from 'zod';

enum Sports {
  Football = 'Football/Soccer',
  Basketball = 'Basketball',
  Baseball = 'Baseball',
  Hockey = 'Hockey (Ice)',
  None = "I don't like sports",
}
const zodFormSchema = z.object({
  username: z
    .string({
      required_error: 'Username is required.',
    })
    .min(2, {
      message: 'Username must be at least 2 characters.',
    })
    .superRefine(
      fieldConfig({
        description: 'You cannot change this later.',
      }),
    ),
  password: z
    .string({
      required_error: 'Password is required.',
    })
    .describe('Your secure password')
    .min(8, {
      message: 'Password must be at least 8 characters.',
    })
    .superRefine(
      fieldConfig({
        description: (
          <>
            Always use a <b>secure password</b>!
          </>
        ),
        inputProps: {
          type: 'password',
        },
      }),
    ),
  favouriteNumber: z.coerce
    .number({
      invalid_type_error: 'Favourite number must be a number.',
    })
    .min(1, {
      message: 'Favourite number must be at least 1.',
    })
    .max(10, {
      message: 'Favourite number must be at most 10.',
    })
    .default(1)
    .optional(),
  acceptTerms: z
    .boolean()
    .describe('Accept terms and conditions.')
    .refine(value => value, {
      message: 'You must accept the terms and conditions.',
      path: ['acceptTerms'],
    }),
  sendMeMails: z
    .boolean()
    .optional()
    .superRefine(
      fieldConfig({
        fieldWrapper: (props: any) => {
          return (
            <>
              {props.children}
              <p className="text-muted-foreground text-sm">
                Don't worry, we only send important emails!
              </p>
            </>
          );
        },
      }),
    ),
  birthday: z.coerce.date({ message: 'aaa' }).optional(),
  color: z.enum(['red', 'green', 'blue']).optional(),
  // Another enum example
  marshmallows: z
    .enum(['not many', 'a few', 'a lot', 'too many'])
    .describe('How many marshmallows fit in your mouth?'),
  // Native enum example
  sports: z.nativeEnum(Sports).describe('What is your favourite sport?'),
  guests: z.array(
    z.object({
      name: z.string(),
      age: z.coerce.number().optional(),
      location: z.object({
        city: z.string(),
        country: z.string().optional(),
        test: z.object({
          name: z.string(),
          age: z.coerce.number(),
          test: z.object({
            name: z.string(),
            age: z.coerce.number(),
            test: z.object({
              name: z.string(),
              age: z.coerce.number(),
              test: z.object({
                name: z.string(),
                age: z.coerce.number(),
              }),
            }),
          }),
        }),
      }),
    }),
  ),
  // location: z.object({
  //   city: z.string(),
  //   country: z.string().optional(),
  //   test: z.object({
  //     name: z.string(),
  //     age: z.coerce.number(),
  //     test: z.object({
  //       name: z.string(),
  //       age: z.coerce.number(),
  //       test: z.object({
  //         name: z.string(),
  //         age: z.coerce.number(),
  //         test: z.object({
  //           name: z.string(),
  //           age: z.coerce.number(),
  //         }),
  //       }),
  //     }),
  //   }),
  // }),
  // obj
});
export const zodSchemaProvider = new ZodProvider(zodFormSchema);
function Index() {
  const [value, setValue] = useState({});
  return (
    <>
      <section className="flex items-center justify-center ">
        <AutoForm
          schema={zodSchemaProvider}
          // onSubmit={(data) => {
          //   setValue(data);
          // }}
          // Ant Design Form Props
          antFormProps={{
            layout: 'horizontal',
            className: 'no-margin-form',
            onFinish: e => {
              setValue(e);
            },
          }}
        >
          <Button>123</Button>
        </AutoForm>
      </section>
      <section>{JSON.stringify(value)}</section>
    </>
  );
}

export default Index;

import { defineArrayMember, defineField, defineType } from 'sanity'

export const codeBlock = defineType({
  name: 'codeBlock',
  title: 'Code block',
  type: 'object',
  fields: [
    defineField({ name: 'filename', title: 'Filename / caption', type: 'string' }),
    defineField({ name: 'language', title: 'Language', type: 'string' }),
    defineField({
      name: 'code',
      title: 'Code',
      type: 'text',
      rows: 10,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'filename', subtitle: 'language' },
  },
})

export const question = defineType({
  name: 'question',
  title: 'FAQ question',
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'question' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Position on the FAQ page (ascending)',
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'array',
      of: [defineArrayMember({ type: 'block' }), defineArrayMember({ type: 'codeBlock' })],
    }),
  ],
  orderings: [
    {
      title: 'Page order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'question', subtitle: 'order' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle != null ? `#${subtitle}` : undefined }
    },
  },
})

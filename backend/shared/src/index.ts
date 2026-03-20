import { z } from 'zod';

export const ProjectSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, 'project must be slug-like (letters, numbers, dash)');

export const CustomAliasSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, 'alias must be slug-like (letters, numbers, dash)');

export const CreateLinkBodySchema = z.object({
  longUrl: z.string().trim().url(),
  project: ProjectSchema.optional(),
  customAlias: CustomAliasSchema.optional(),
});

export type CreateLinkBody = z.infer<typeof CreateLinkBodySchema>;

export const CreateLinkResponseSchema = z.object({
  id: z.string(),
  project: z.string().nullable(),
  code: z.string(),
  longUrl: z.string().url(),
  shortUrl: z.string().url(),
  /** UUID user hoặc -1 khi ẩn danh */
  ownerUserId: z.union([z.string().uuid(), z.literal(-1)]),
  /** -1 = ẩn danh, 0 = đã đăng nhập */
  anonymousMarker: z.number().int(),
  createdAt: z.string(),
});

export type CreateLinkResponse = z.infer<typeof CreateLinkResponseSchema>;

export const LoginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

export const RegisterBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z
      .string()
      .trim()
      .min(8)
      .max(20)
      .regex(/^[0-9+()\-\s]+$/, 'phone invalid'),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const MeResponseSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;

export const LinkListItemSchema = z.object({
  id: z.string(),
  project: z.string().nullable(),
  code: z.string(),
  longUrl: z.string().url(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type LinkListItem = z.infer<typeof LinkListItemSchema>;

export const ListLinksResponseSchema = z.object({
  items: z.array(LinkListItemSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
});

export type ListLinksResponse = z.infer<typeof ListLinksResponseSchema>;


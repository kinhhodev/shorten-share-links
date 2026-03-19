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
  createdAt: z.string(),
});

export type CreateLinkResponse = z.infer<typeof CreateLinkResponseSchema>;

export const LoginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

export const RegisterBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const MeResponseSchema = z.object({
  id: z.string(),
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


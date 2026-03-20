import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { verifyPassword } from './password';

export type PassportUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
};

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: false,
    },
    async (email, password, done) => {
      try {
        const normalized = email.trim().toLowerCase();
        const rows = await db
          .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            phone: users.phone,
            passwordHash: users.passwordHash,
          })
          .from(users)
          .where(eq(users.email, normalized))
          .limit(1);

        const row = rows[0];
        if (!row) return done(null, false);
        const ok = await verifyPassword(password, row.passwordHash);
        if (!ok) return done(null, false);

        const user: PassportUser = {
          id: row.id,
          email: row.email,
          fullName: row.fullName,
          phone: row.phone,
        };
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    },
  ),
);

export { passport };

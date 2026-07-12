import { Injectable, Inject } from '@nestjs/common';
import { SignUpDto } from '../auth/auth.dto';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../db/drizzle.module';
import { users as userTable } from '../../db/schema';

export type User = {
  id: string;
  name: string;
  password: string;
  email: string;
  company: string;
};

@Injectable()
export class UserService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  private toUser(row: typeof userTable.$inferSelect): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name ?? '',
      company: row.company ?? '',
      password: row.password,
    };
  }

  async createUser(dto: SignUpDto): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...dto,
      id,
    };
    await this.db.insert(userTable).values({
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      password: user.password,
    });
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const rows = await this.db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);
    return rows[0] ? this.toUser(rows[0]) : undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const rows = await this.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);
    return rows[0] ? this.toUser(rows[0]) : undefined;
  }

  async authenticatePassword(payload: {
    email: string;
    password: string;
  }): Promise<User | null> {
    const { email, password } = payload;
    const user = await this.getUserByEmail(email);
    if (!user || user.password !== password) {
      return null;
    }

    return user;
  }
}

import { Injectable } from '@nestjs/common';
import { SignUpDto } from '../auth/auth.dto';
import { randomUUID } from 'node:crypto';

export type User = {
  id: string;
  name: string;
  password: string;
  email: string;
  company: string;
};

@Injectable()
export class UserService {
  private userAuthMap: Map<string, User> = new Map<string, User>();
  private userIdMap: Map<string, User> = new Map<string, User>();

  createUser(dto: SignUpDto) {
    const id = randomUUID();
    const user: User = {
      ...dto,
      id,
    };
    this.userAuthMap.set(user.email, user);
    this.userIdMap.set(user.id, user);
    return user;
  }

  getUserByEmail(email: string) {
    return this.userAuthMap.get(email);
  }

  getUserById(id: string) {
    return this.userIdMap.get(id);
  }

  authenticatePassword(payload: { email: string; password: string }) {
    const { email, password } = payload;
    const user = this.getUserByEmail(email);
    if (!user || user.password !== password) {
      return null;
    }

    return user;
  }
}

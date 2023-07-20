// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { User } from './user.entity';

@Injectable()
export class UserService {
  private readonly redisClient: Redis;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    this.redisClient = new Redis({
      host: 'redis',
      port: 6379,
    });
  }

  async registerUser(userData: Partial<User>): Promise<User> {
    // Create the user
    const user = this.usersRepository.create(userData);

    // Save the user in the PostgreSQL database
    await this.usersRepository.save(user);

    return user;
  }

  async getUser(id: number): Promise<User> {
    // Try to get the user from Redis
    const user = await this.redisClient.get(`user:${id}`);

    if (user) {
      // If the user was in Redis, return it
      return JSON.parse(user);
    } else {
      // If the user was not in Redis, get it from PostgreSQL
      const user = await this.usersRepository.findOne({ where: { id } });

      if (!user) {
        // If the user was not found in PostgreSQL, throw an error
        throw new Error('User not found');
      }

      // Then, store the user in Redis with an expiry time of 1 hour
      await this.redisClient.set(`user:${id}`, JSON.stringify(user), 'EX', 60 * 60);

      return user;
    }
  }
}

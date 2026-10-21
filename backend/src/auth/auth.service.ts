import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

const SALT_ROUNDS = 10;

interface UserRow {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDto {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  token: string;
  user: UserDto;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = normaliseEmail(dto.email);

    if (await this.emailTaken(email)) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: await hash(dto.password, SALT_ROUNDS),
      },
    });

    return this.issue(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: normaliseEmail(dto.email) },
    });

    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    return this.issue(user);
  }

  async findById(id: number): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} was not found`);
    }

    return toUserDto(user);
  }

  async updateProfile(id: number, dto: UpdateProfileDto): Promise<UserDto> {
    const current = await this.findById(id);
    const email = dto.email ? normaliseEmail(dto.email) : undefined;

    if (email && email !== current.email && (await this.emailTaken(email))) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        email,
        // `undefined` leaves the picture alone; `null` (or an empty string) clears it.
        avatar: dto.avatar === undefined ? undefined : dto.avatar || null,
      },
    });

    return toUserDto(user);
  }

  async changePassword(id: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user || !(await compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('The current password is incorrect');
    }

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await hash(dto.newPassword, SALT_ROUNDS) },
    });
  }

  private async emailTaken(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }

  private async issue(user: UserRow): Promise<AuthResult> {
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token, user: toUserDto(user) };
  }
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUserDto(user: UserRow): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

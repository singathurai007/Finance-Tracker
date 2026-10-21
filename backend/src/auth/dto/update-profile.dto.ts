import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  /**
   * Base64 image data URL, or `null` to remove the current picture.
   * The front end resizes to 256x256 before sending, so the cap is generous.
   */
  @IsOptional()
  @IsString()
  @MaxLength(400_000)
  @Matches(/^data:image\/(png|jpe?g|webp|gif);base64,/, {
    message: 'avatar must be a base64 image data URL',
  })
  avatar?: string | null;
}

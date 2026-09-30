CREATE TABLE `user_profiles` (
  `ownerId` VARCHAR(160) NOT NULL,
  `displayName` VARCHAR(60) NULL,
  `signature` VARCHAR(150) NULL,
  `avatarExt` VARCHAR(10) NULL,
  `avatarVersion` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`ownerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

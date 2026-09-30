CREATE TABLE `echo_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `ownerId` VARCHAR(160) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `inscriptionId` VARCHAR(36) NULL,
  `model` VARCHAR(160) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `echo_sessions_ownerId_updatedAt_idx`(`ownerId`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `echo_messages` (
  `id` VARCHAR(36) NOT NULL,
  `sessionId` VARCHAR(36) NOT NULL,
  `role` VARCHAR(20) NOT NULL,
  `content` TEXT NOT NULL,
  `model` VARCHAR(160) NULL,
  `inscriptionId` VARCHAR(36) NULL,
  `inscriptionVersion` INTEGER NULL,
  `contextJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `echo_messages_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `echo_messages` ADD CONSTRAINT `echo_messages_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `echo_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

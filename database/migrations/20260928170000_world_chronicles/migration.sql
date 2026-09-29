CREATE TABLE `chronicle_entries` (
  `id` VARCHAR(64) NOT NULL,
  `seasonId` VARCHAR(40) NOT NULL,
  `seasonTitle` VARCHAR(160) NOT NULL,
  `chapterId` VARCHAR(40) NOT NULL,
  `chapterTitle` VARCHAR(160) NOT NULL,
  `recordNumber` INTEGER NOT NULL,
  `type` VARCHAR(40) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) NULL,
  `content` TEXT NOT NULL,
  `excerpt` TEXT NOT NULL,
  `author` VARCHAR(160) NULL,
  `recordDate` VARCHAR(80) NULL,
  `discoverLocation` VARCHAR(255) NULL,
  `triggerType` VARCHAR(40) NOT NULL,
  `triggerConfig` JSON NOT NULL,
  `coordinates` JSON NULL,
  `regionId` VARCHAR(100) NULL,
  `soundId` VARCHAR(40) NULL,
  `isHidden` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `chronicle_entries_seasonId_recordNumber_key`(`seasonId`, `recordNumber`),
  INDEX `chronicle_entries_seasonId_chapterId_recordNumber_idx`(`seasonId`, `chapterId`, `recordNumber`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `chronicle_discoveries` (
  `id` VARCHAR(36) NOT NULL,
  `ownerId` VARCHAR(160) NOT NULL,
  `chronicleId` VARCHAR(64) NOT NULL,
  `discoveredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `discoveryContext` JSON NULL,
  `readAt` DATETIME(3) NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  UNIQUE INDEX `chronicle_discoveries_ownerId_chronicleId_key`(`ownerId`, `chronicleId`),
  INDEX `chronicle_discoveries_ownerId_discoveredAt_idx`(`ownerId`, `discoveredAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `chronicle_discoveries`
  ADD CONSTRAINT `chronicle_discoveries_chronicleId_fkey`
  FOREIGN KEY (`chronicleId`) REFERENCES `chronicle_entries`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

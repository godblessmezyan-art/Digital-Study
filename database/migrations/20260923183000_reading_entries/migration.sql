CREATE TABLE `reading_entries` (
  `id` VARCHAR(36) NOT NULL,
  `ownerId` VARCHAR(160) NOT NULL,
  `type` ENUM('NOTE', 'QUOTE') NOT NULL,
  `title` VARCHAR(255) NULL,
  `content` TEXT NOT NULL,
  `source` VARCHAR(255) NULL,
  `pageLabel` VARCHAR(80) NULL,
  `bookId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `reading_entries_ownerId_type_updatedAt_idx`(`ownerId`, `type`, `updatedAt`),
  INDEX `reading_entries_bookId_idx`(`bookId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reading_entries`
  ADD CONSTRAINT `reading_entries_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

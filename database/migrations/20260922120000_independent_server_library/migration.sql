ALTER TABLE `books`
  ADD COLUMN `contentHash` VARCHAR(64) NULL,
  ADD COLUMN `deletedAt` DATETIME(3) NULL;

CREATE INDEX `books_deletedAt_idx` ON `books`(`deletedAt`);

CREATE TABLE `book_git_syncs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `bookId` INTEGER NOT NULL,
  `status` ENUM('NEVER_SYNCED', 'PENDING', 'SYNCING', 'SYNCED', 'OUTDATED', 'CONFLICT', 'ERROR') NOT NULL DEFAULT 'NEVER_SYNCED',
  `syncedContentHash` VARCHAR(64) NULL,
  `gitBranch` VARCHAR(160) NULL,
  `gitPath` VARCHAR(500) NULL,
  `gitCommitSha` VARCHAR(64) NULL,
  `lastSyncedAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `book_git_syncs_bookId_key`(`bookId`),
  INDEX `book_git_syncs_status_updatedAt_idx`(`status`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `git_sync_jobs` (
  `id` VARCHAR(36) NOT NULL,
  `bookId` INTEGER NOT NULL,
  `operation` ENUM('UPSERT', 'DELETE') NOT NULL DEFAULT 'UPSERT',
  `status` ENUM('NEVER_SYNCED', 'PENDING', 'SYNCING', 'SYNCED', 'OUTDATED', 'CONFLICT', 'ERROR') NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `error` TEXT NULL,
  `commitSha` VARCHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `git_sync_jobs_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `git_sync_jobs_bookId_createdAt_idx`(`bookId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `book_git_syncs`
  ADD CONSTRAINT `book_git_syncs_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `git_sync_jobs`
  ADD CONSTRAINT `git_sync_jobs_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

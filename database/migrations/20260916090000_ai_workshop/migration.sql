CREATE TABLE `generation_tasks` (
  `id` VARCHAR(36) NOT NULL,
  `templateId` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(160) NULL,
  `slug` VARCHAR(160) NOT NULL,
  `provider` VARCHAR(60) NOT NULL,
  `model` VARCHAR(120) NOT NULL,
  `status` ENUM('QUEUED', 'GENERATING', 'REVIEWING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
  `progress` INTEGER NOT NULL DEFAULT 0,
  `currentStep` VARCHAR(160) NULL,
  `inputJson` JSON NOT NULL,
  `resultJson` JSON NULL,
  `error` TEXT NULL,
  `bookSlug` VARCHAR(160) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `generation_tasks_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `generation_tasks_bookSlug_idx`(`bookSlug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `generation_revisions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `taskId` VARCHAR(36) NOT NULL,
  `sectionKey` VARCHAR(100) NOT NULL,
  `version` INTEGER NOT NULL,
  `instruction` TEXT NULL,
  `resultJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `generation_revisions_taskId_sectionKey_version_key`(`taskId`, `sectionKey`, `version`),
  INDEX `generation_revisions_taskId_createdAt_idx`(`taskId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `generation_revisions`
  ADD CONSTRAINT `generation_revisions_taskId_fkey`
  FOREIGN KEY (`taskId`) REFERENCES `generation_tasks`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

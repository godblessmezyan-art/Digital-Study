-- CreateEnum
CREATE TABLE `journal_templates` (
  `id` VARCHAR(36) NOT NULL,
  `ownerId` VARCHAR(160) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(500) NULL,
  `content` TEXT NOT NULL,
  `tags` JSON NOT NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `isBuiltin` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `journal_templates_ownerId_isActive_updatedAt_idx`(`ownerId`, `isActive`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `plans` (
  `id` VARCHAR(36) NOT NULL,
  `ownerId` VARCHAR(160) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `startDate` DATE NULL,
  `dueDate` DATE NULL,
  `progress` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `plans_ownerId_status_idx`(`ownerId`, `status`),
  INDEX `plans_ownerId_updatedAt_idx`(`ownerId`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `plan_tasks` (
  `id` VARCHAR(36) NOT NULL,
  `planId` VARCHAR(36) NOT NULL,
  `parentId` VARCHAR(36) NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  `estimatedMinutes` INTEGER NULL,
  `dueDate` DATE NULL,
  `order` INTEGER NOT NULL DEFAULT 0,
  `acceptanceCriteria` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `plan_tasks_planId_order_idx`(`planId`, `order`),
  INDEX `plan_tasks_parentId_idx`(`parentId`),
  INDEX `plan_tasks_status_dueDate_idx`(`status`, `dueDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `plan_tasks` ADD CONSTRAINT `plan_tasks_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `plan_tasks` ADD CONSTRAINT `plan_tasks_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `plan_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

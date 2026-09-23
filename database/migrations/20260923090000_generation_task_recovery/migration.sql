ALTER TABLE `generation_tasks`
  ADD COLUMN `ownerId` VARCHAR(160) NULL,
  ADD COLUMN `clientRequestId` VARCHAR(64) NULL,
  ADD COLUMN `parentTaskId` VARCHAR(36) NULL,
  ADD COLUMN `attempt` INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX `generation_tasks_clientRequestId_key`
  ON `generation_tasks`(`clientRequestId`);

CREATE INDEX `generation_tasks_ownerId_status_updatedAt_idx`
  ON `generation_tasks`(`ownerId`, `status`, `updatedAt`);

CREATE INDEX `generation_tasks_ownerId_slug_status_idx`
  ON `generation_tasks`(`ownerId`, `slug`, `status`);

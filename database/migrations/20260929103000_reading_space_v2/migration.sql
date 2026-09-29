ALTER TABLE `reading_entries`
  ADD COLUMN `chapterId` VARCHAR(191) NULL,
  ADD COLUMN `chapterTitle` VARCHAR(255) NULL,
  ADD COLUMN `quote` TEXT NULL,
  ADD COLUMN `anchor` JSON NULL,
  ADD COLUMN `tags` JSON NULL,
  ADD COLUMN `readingProgress` INTEGER NULL;

CREATE INDEX `reading_entries_ownerId_bookId_chapterId_idx`
  ON `reading_entries`(`ownerId`, `bookId`, `chapterId`);
